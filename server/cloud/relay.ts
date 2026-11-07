import { randomUUID } from 'node:crypto'
import type { Pool } from 'pg'
import type { CloudIdentity } from './media'
import { CloudError, json, readJson } from './http'
import { transaction } from './database'
const MAX = 2 * 1024 * 1024
const senderPattern = /^[A-Za-z0-9_-]{1,100}$/
const nativeActions = new Set(['prepare','list','assign','open','close','open-role','close-role','cache'])
export function createCloudRelay(pool: Pool) {
  return async (req: Request, user: CloudIdentity) => {
    const url = new URL(req.url), id = user.installationId ?? url.searchParams.get('installation')
    if (!id || !/^[0-9a-f-]{36}$/.test(id)) throw new CloudError('installation-required', 409)
    const installation = (await pool.query('SELECT id FROM cp_installations WHERE id=$1 AND revoked=false AND expires_at>now()', [id])).rows[0]
    if (!installation) throw new CloudError('installation-unavailable', 409)
    if (user.installationId) await pool.query('UPDATE cp_installations SET last_seen=now() WHERE id=$1', [id])
    if (req.method === 'GET') {
      const cursor = Number(url.searchParams.get('cursor') || 0)
      if (!Number.isSafeInteger(cursor) || cursor < 0) throw new CloudError('invalid-cursor')
      if (!cursor) {
        const state = (await pool.query('SELECT controller,snapshot FROM cp_output_channels WHERE installation_id=$1', [id])).rows[0]
        const head = Number((await pool.query('SELECT max(sequence) AS head FROM cp_output_events WHERE installation_id=$1', [id])).rows[0].head || 0)
        const pending = user.installationId ? (await pool.query("SELECT message FROM cp_output_events WHERE installation_id=$1 AND created_at>now()-interval '5 seconds' AND message->>'type'='native-request' ORDER BY sequence LIMIT 10", [id])).rows.map((r) => r.message) : []
        return json({ cursor: head, messages: [{ type: 'controller', sender: state?.controller ?? null }, ...(state?.snapshot ? [state.snapshot] : []), ...pending] })
      }
      const rows = (await pool.query('SELECT sequence,message FROM cp_output_events WHERE installation_id=$1 AND sequence>$2 ORDER BY sequence LIMIT 50', [id, Math.max(0,cursor)])).rows
      const messages: unknown[] = []; let bytes = 0, next = cursor
      for (const row of rows) { const size = Buffer.byteLength(JSON.stringify(row.message)); if (bytes + size > MAX + 65536) break; bytes += size; messages.push(row.message); next = Number(row.sequence) }
      return json({ cursor: next, messages })
    }
    if (req.method !== 'POST') throw new CloudError('method-not-allowed', 405)
    const body = await readJson(req, MAX)
    if (typeof body.sender !== 'string' || !senderPattern.test(body.sender)) throw new CloudError('invalid-relay-message')
    const actor = user.installationId ? `installation:${user.installationId}` : `user:${user.id}`
    const eventId = typeof body.eventId === 'string' && senderPattern.test(body.eventId) ? body.eventId : randomUUID()
    const message = { ...body, eventId }
    const sequence = await transaction(pool, async (client) => {
      const channel = (await client.query('SELECT * FROM cp_output_channels WHERE installation_id=$1 FOR UPDATE', [id])).rows[0]
      let outgoing: unknown = message
      const owns = channel.controller === body.sender && channel.controller_actor === actor
      if (body.type === 'claim') {
        await client.query('UPDATE cp_output_channels SET controller=$2,controller_actor=$3,updated_at=now() WHERE installation_id=$1', [id, body.sender, actor])
        outgoing = { type: 'controller', sender: body.sender, eventId }
      } else if (body.type === 'snapshot') {
        const snapshot = body.snapshot as { audience?: unknown; confidence?: unknown } | undefined
        if (!owns) throw new CloudError('controller-required', 409)
        if (!snapshot?.audience || !snapshot.confidence) throw new CloudError('invalid-relay-message')
        await client.query('UPDATE cp_output_channels SET snapshot=$2::jsonb,updated_at=now() WHERE installation_id=$1', [id, JSON.stringify(message)])
      } else if (body.type === 'native-request') {
        if (typeof body.id !== 'string' || !senderPattern.test(body.id) || !nativeActions.has(String(body.action)) || (body.args !== undefined && (!Array.isArray(body.args) || body.args.length > 3 || body.args.some((a) => typeof a !== 'string' || a.length > 140)))) throw new CloudError('invalid-native-request')
      } else if (body.type === 'native-response' || body.type === 'rendered') {
        if (!user.installationId) throw new CloudError('native-installation-required', 403)
      } else if (body.type === 'command') {
        if (typeof body.actionId !== 'string' || !/^(?:live\.(?:next|prev|blank|freeze)|cue:[A-Za-z0-9_-]{1,140})$/.test(body.actionId)) throw new CloudError('invalid-command')
      } else if (body.type === 'hello') {
        if (!channel.snapshot) return 0
        outgoing = { ...channel.snapshot, eventId }
      } else throw new CloudError('invalid-relay-message')
      return Number((await client.query('INSERT INTO cp_output_events(installation_id,event_id,message) VALUES($1,$2,$3::jsonb) ON CONFLICT(installation_id,event_id) DO UPDATE SET event_id=excluded.event_id RETURNING sequence', [id, eventId, JSON.stringify(outgoing)])).rows[0].sequence)
    })
    await pool.query("DELETE FROM cp_output_events WHERE installation_id=$1 AND created_at<now()-interval '3 minutes'", [id])
    return json({ accepted: true, sequence })
  }
}
