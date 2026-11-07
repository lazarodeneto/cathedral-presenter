import { createLocalServices } from './localServices'
import { securityHeaders } from './securityHeaders'
import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import type { Connect } from 'vite'
import { installAccounts } from './auth'
import { letrasGospelMiddleware } from './letrasgospelProxy'

/** Production local server: bundled with the desktop app, with no Vite dependency. */
export async function startServer(dataRoot: string, staticRoot: string, port = 4173) {
  const handlers: Connect.NextHandleFunction[] = []
  const server = createServer((req, res) => {
    securityHeaders(res, true)
    if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(req.headers.host ?? '')) { res.writeHead(403).end(); return }
    let index = 0
    const next = (error?: unknown) => {
      if (error) { if (!res.headersSent) res.writeHead(500).end(); return }
      const handler = handlers[index++]
      if (handler) { try { handler(req, res, next) } catch { next(new Error('request-failed')) } }
      else { res.writeHead(404).end() }
    }
    next()
  })
  await new Promise<void>((yes, no) => { server.once('error', no); server.listen(port, 'localhost', () => { server.removeListener('error', no); yes() }) })
  const actualPort = (server.address() as { port: number }).port
  const environment = { ...process.env, BETTER_AUTH_URL: `http://localhost:${actualPort}` }
  installAccounts({ config: { root: dataRoot, env: environment as Record<string, string> }, middlewares: { use: (handler) => { handlers.push(handler) } }, httpServer: server })
  const services = createLocalServices(dataRoot, environment)
  handlers.push((req, res, next) => {
    if (req.url?.split('?')[0] !== '/api/app-health') return next()
    res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ app: 'church-presenter', production: true }))
  }, ...services.handlers, letrasGospelMiddleware)
  const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.ico': 'image/x-icon' }
  handlers.push((req, res) => {
    void (async () => {
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return }
      const host = req.headers.host ?? ''
      if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host)) { res.writeHead(403).end(); return }
      const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname)
      const file = resolve(staticRoot, `.${pathname === '/' ? '/index.html' : pathname}`)
      if (!file.startsWith(resolve(staticRoot) + sep) || pathname.split('/').some((part) => part.startsWith('.'))) { res.writeHead(404).end(); return }
      const info = await stat(file)
      if (!info.isFile()) { res.writeHead(404).end(); return }
      const contentType = mime[extname(file)] ?? 'application/octet-stream'
      let start = 0, end = info.size - 1, status = 200
      if (req.headers.range) {
        const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range)
        if (!range || Number(range[1]) >= info.size || (range[2] && Number(range[2]) < Number(range[1]))) { res.writeHead(416, { 'Content-Range': `bytes */${info.size}` }).end(); return }
        start = Number(range[1]); end = range[2] ? Math.min(Number(range[2]), end) : end; status = 206
        res.setHeader('Content-Range', `bytes ${start}-${end}/${info.size}`)
      }
      res.writeHead(status, { 'Content-Type': contentType, 'Content-Length': Math.max(0, end - start + 1), 'X-Content-Type-Options': 'nosniff', 'Accept-Ranges': 'bytes', 'Referrer-Policy': 'no-referrer', 'Cache-Control': pathname === '/' ? 'no-store' : 'public, max-age=3600' })
      if (req.method === 'HEAD') res.end()
      else createReadStream(file, { start, end }).on('error', () => res.destroy()).pipe(res)
    })().catch(() => { if (!res.headersSent) res.writeHead(404).end() })
  })
  server.on('close', services.close)
  return server
}
