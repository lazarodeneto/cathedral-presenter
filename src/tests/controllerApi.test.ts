// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createServer, type Server } from 'node:http'
import { createControllerApi } from '../../server/controllerApi'
let server: Server, url: string
const dispatch = vi.fn()
beforeEach(async () => {
  dispatch.mockReset()
  const api = createControllerApi(dispatch, async (req) => req.headers.cookie === 'admin-test' ? { user: { id: 'admin', role: 'admin' } } : null)
  server = createServer((req, res) => api(req, res, () => res.writeHead(404).end()))
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve)); url = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/control`
})
afterEach(async () => { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())) })
describe('paired production controller', () => {
  it('requires an administrator to pair and a valid revocable key to issue allowed commands', async () => {
    expect((await fetch(`${url}/pair`, { method: 'POST', headers: { 'X-Cathedral-Admin': '1' } })).status).toBe(403)
    const paired = await fetch(`${url}/pair`, { method: 'POST', headers: { 'X-Cathedral-Admin': '1', Cookie: 'admin-test' } }).then((r) => r.json())
    const headers = { Authorization: `Bearer ${paired.token}`, 'Content-Type': 'application/json' }
    expect((await fetch(url, { method: 'POST', headers, body: JSON.stringify({ command: 'next' }) })).status).toBe(200)
    expect(dispatch.mock.calls[0][0].actionId).toBe('live.next')
    await fetch(`${url}/pair`, { method: 'DELETE', headers: { 'X-Cathedral-Admin': '1', Cookie: 'admin-test' } })
    expect((await fetch(url, { method: 'POST', headers, body: JSON.stringify({ command: 'next' }) })).status).toBe(403)
    expect(dispatch).toHaveBeenCalledOnce()
  })
  it('rejects cross-origin pairing and unknown commands', async () => {
    const auth = { 'X-Cathedral-Admin': '1', Cookie: 'admin-test' }
    expect((await fetch(`${url}/pair`, { method: 'POST', headers: { ...auth, Origin: 'https://attacker.example' } })).status).toBe(403)
    const paired = await fetch(`${url}/pair`, { method: 'POST', headers: auth }).then((r) => r.json())
    expect((await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${paired.token}` }, body: '{"command":"delete-workspace"}' })).status).toBe(400)
    expect(dispatch).not.toHaveBeenCalled()
  })
})
