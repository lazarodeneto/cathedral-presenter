import { randomBytes, createHash, timingSafeEqual, randomUUID } from 'node:crypto'
import type { Connect } from 'vite'
import { accountSession } from './auth'

/** Paired local production devices only. Never opens a LAN listener. */
export function createControllerApi(dispatch: (command: { type: 'command'; actionId: string; sender: string; eventId: string }) => void, authenticate: (req: import('node:http').IncomingMessage) => Promise<{ user: { id: string; role?: string } } | null> = accountSession): Connect.NextHandleFunction {
  let key: Buffer | null = null, expiresAt = 0, lastCommand = 0
  const digest = (value: string) => createHash('sha256').update(value).digest()
  const json = (res: import('node:http').ServerResponse, status: number, body: unknown) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)) }
  return (req, res, next) => {
    if (!req.url?.startsWith('/api/control')) return next()
    const host = req.headers.host ?? '', origin = req.headers.origin
    if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host) || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '') || req.headers['sec-fetch-site'] === 'cross-site' || (origin && origin !== `http://${host}` && origin !== `https://${host}`)) return json(res, 403, { reason: 'forbidden' })
    void (async () => {
      if (req.url === '/api/control/pair') {
        if (req.headers['x-cathedral-admin'] !== '1') return json(res, 403, { reason: 'forbidden' })
        const session = await authenticate(req)
        if (!session || (session.user as { role?: string }).role !== 'admin') return json(res, 403, { reason: 'administrator-required' })
        if (req.method === 'DELETE') { key = null; expiresAt = 0; return json(res, 200, { revoked: true }) }
        if (req.method !== 'POST') return json(res, 405, { reason: 'method' })
        const token = randomBytes(32).toString('base64url'); key = digest(token); expiresAt = Date.now() + 2 * 60 * 60 * 1000
        return json(res, 200, { token, expiresAt, endpoint: `http://${host}/api/control`, commands: ['next', 'previous', 'black', 'freeze', 'cue'] })
      }
      if (req.url !== '/api/control' || req.method !== 'POST') return json(res, 405, { reason: 'method' })
      const token = req.headers.authorization?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1]
      if (!key || Date.now() > expiresAt || !token || !timingSafeEqual(key, digest(token))) return json(res, 403, { reason: 'invalid-controller-key' })
      if (Date.now() - lastCommand < 100) return json(res, 429, { reason: 'rate-limit' })
      let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 1024) return json(res, 413, { reason: 'too-large' }) }
      const body = JSON.parse(raw)
      const actions: Record<string, string> = { next: 'live.next', previous: 'live.prev', black: 'live.blank', freeze: 'live.freeze' }
      const action = actions[body.command] ?? (body.command === 'cue' && typeof body.id === 'string' && /^[A-Za-z0-9_-]{1,140}$/.test(body.id) ? `cue:${body.id}` : null)
      if (!action) return json(res, 400, { reason: 'invalid-command' })
      lastCommand = Date.now(); dispatch({ type: 'command', actionId: action, sender: 'paired-controller', eventId: randomUUID() })
      json(res, 200, { accepted: true })
    })().catch(() => { if (!res.headersSent) json(res, 400, { reason: 'invalid-request' }) })
  }
}
