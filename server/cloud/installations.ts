import { randomBytes, randomUUID } from 'node:crypto'
import type { Pool } from 'pg'
import { CloudError, digest, json, readJson } from './http'
import { transaction } from './database'
import { sanitizeSingleLine } from '../../src/security/text'
import type { CloudIdentity } from './media'

export interface InstallationIdentity extends CloudIdentity { installationId: string; canScan: boolean }
export function createCloudInstallations(pool: Pool) {
  return {
    async authenticate(req: Request): Promise<InstallationIdentity | null> {
      const token = req.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1]
      if (!token) return null
      const row = (await pool.query("SELECT id,created_by,can_scan FROM cp_installations WHERE token_hash=$1 AND revoked=false AND expires_at>now() AND EXISTS(SELECT 1 FROM \"user\" WHERE \"user\".id=created_by AND role IN ('admin','operator'))", [digest(token)])).rows[0]
      return row ? { id: row.created_by, role: 'operator', installationId: row.id, canScan: row.can_scan } : null
    },
    async complete(req: Request) {
      const body = await readJson(req, 2048), code = String(body.code ?? '').replaceAll('-', '').replaceAll(' ', '').toUpperCase(), platform = String(body.platform)
      if (!/^[A-F0-9]{12}$/.test(code) || !['darwin', 'win32', 'linux'].includes(platform)) throw new CloudError('invalid-pairing-code', 403)
      const token = randomBytes(32).toString('base64url'), id = randomUUID()
      const result = await transaction(pool, async (client) => {
        const row = (await client.query('UPDATE cp_pairing_codes SET consumed=true WHERE code_hash=$1 AND consumed=false AND expires_at>now() RETURNING *', [digest(code)])).rows[0]
        if (!row) throw new CloudError('invalid-pairing-code', 403)
        const user = (await client.query('SELECT role FROM "user" WHERE id=$1', [row.created_by])).rows[0]
        if (user?.role !== 'admin') throw new CloudError('invalid-pairing-code', 403)
        const expires = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        await client.query('INSERT INTO cp_installations(id,name,token_hash,platform,can_scan,expires_at,created_by) VALUES($1,$2,$3,$4,$5,$6,$7)', [id, row.name, digest(token), platform, row.can_scan, expires, row.created_by])
        await client.query('INSERT INTO cp_output_channels(installation_id) VALUES($1)', [id])
        return { name: row.name, canScan: row.can_scan, expiresAt: expires.toISOString() }
      })
      return json({ id, token, ...result }, 201)
    },
    async handle(req: Request, user: CloudIdentity) {
      const path = new URL(req.url).pathname
      if (path === '/api/installations' && req.method === 'GET') return json({ installations: (await pool.query('SELECT id,name,platform,can_scan AS "canScan",last_seen AS "lastSeen",expires_at AS "expiresAt",revoked FROM cp_installations ORDER BY created_at DESC')).rows.map((r) => ({ ...r, connected: !r.revoked && Date.parse(r.expiresAt) > Date.now() && Date.now() - Date.parse(r.lastSeen ?? '') < 45000 })) })
      if (user.role !== 'admin' || user.installationId) throw new CloudError('administrator-required', 403)
      if (path === '/api/installations/pair' && req.method === 'POST') {
        const body = await readJson(req, 2048), name = sanitizeSingleLine(body.name, 100).trim()
        if (!name) throw new CloudError('invalid-computer-name')
        const raw = randomBytes(6).toString('hex').toUpperCase(), expiresAt = new Date(Date.now() + 10 * 60 * 1000)
        await pool.query('DELETE FROM cp_pairing_codes WHERE expires_at<now()')
        await pool.query('INSERT INTO cp_pairing_codes(code_hash,name,created_by,expires_at,can_scan) VALUES($1,$2,$3,$4,$5)', [digest(raw), name, user.id, expiresAt, body.canScan === true])
        return json({ code: raw.match(/.{4}/g)!.join('-'), expiresAt: expiresAt.toISOString() }, 201)
      }
      const target = /^\/api\/installations\/([0-9a-f-]{36})$/.exec(path)
      if (target && req.method === 'DELETE') { await pool.query('UPDATE cp_installations SET revoked=true WHERE id=$1', [target[1]]); return json({ revoked: true }) }
      throw new CloudError('not-found', 404)
    },
  }
}
