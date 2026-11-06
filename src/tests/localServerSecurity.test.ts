// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createServer, type Server } from 'node:http'
import { letrasGospelMiddleware } from '../../server/letrasgospelProxy'
import { securityHeaders } from '../../server/securityHeaders'

let server: Server | undefined
afterEach(async () => {
  vi.unstubAllGlobals()
  if (server) { server.closeAllConnections(); await new Promise<void>((resolve) => server!.close(() => resolve())); server = undefined }
})
async function start() {
  server = createServer((req, res) => { securityHeaders(res, true); letrasGospelMiddleware(req, res, () => { res.writeHead(404).end() }) })
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve))
  return `http://127.0.0.1:${(server.address() as { port: number }).port}`
}
describe('local server trust boundaries', () => {
  it('serves third-party markup as non-executable text and rejects cross-site access', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<script>stealSession()</script><h1>Lyrics</h1>', { headers: { 'Content-Type': 'text/html' } })))
    const mockedFetch = globalThis.fetch
    // Keep a real local HTTP client while only replacing upstream fetch.
    const { request } = await import('node:http')
    const url = await start()
    const get = (headers = {}) => new Promise<{ status: number; headers: import('node:http').IncomingHttpHeaders; body: string }>((resolve) => {
      request(`${url}/api/letrasgospel/test-security/song`, { headers }, (res) => { let body = ''; res.on('data', (chunk) => { body += chunk }); res.on('end', () => resolve({ status: res.statusCode!, headers: res.headers, body })) }).end()
    })
    const response = await get()
    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toBe('text/plain; charset=utf-8')
    expect(response.headers['x-content-type-options']).toBe('nosniff')
    expect(response.headers['content-security-policy']).toContain('sandbox')
    expect(response.body).toContain('<script>')
    expect((await get({ Origin: 'https://attacker.example', 'Sec-Fetch-Site': 'cross-site' })).status).toBe(403)
    expect(mockedFetch).toHaveBeenCalledTimes(1)
  })
  it('cancels an oversized upstream stream rather than buffering it completely', async () => {
    const cancel = vi.fn()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(5_000_001)) }, cancel }), { headers: { 'Content-Type': 'text/html' } })))
    const { request } = await import('node:http')
    const url = await start()
    const status = await new Promise<number>((resolve) => { request(`${url}/api/letrasgospel/test-security/large`, (res) => { res.resume(); res.on('end', () => resolve(res.statusCode!)) }).end() })
    expect(status).toBe(502)
    expect(cancel).toHaveBeenCalledOnce()
  })
  it('enforces clickjacking protection and script restrictions on production responses', () => {
    const headers = new Map<string, string>()
    securityHeaders({ setHeader: (key: string, value: string) => headers.set(key, value) } as unknown as import('node:http').ServerResponse, true)
    expect(headers.get('Content-Security-Policy')).toContain("frame-ancestors 'none'")
    expect(headers.get('Content-Security-Policy')).toContain("script-src 'self'")
    expect(headers.get('X-Frame-Options')).toBe('DENY')
  })
})
