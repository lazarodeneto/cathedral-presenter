import { createControllerApi } from './controllerApi'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Connect, Plugin } from 'vite'

const PATH = '/api/output-relay'
const MAX_BYTES = 16 * 1024 * 1024
const TYPES = new Set(['hello', 'snapshot', 'rendered', 'command', 'claim', 'native-request', 'native-response'])

/** Installation-local transport between the browser operator and native display windows. */
export function outputRelay(): Plugin {
  return { name: 'cathedral-local-output-relay', configureServer: install, configurePreviewServer: install }
}

export function createOutputRelay() {
  const clients = new Set<ServerResponse>()
  let controller: string | null = null
  let snapshot: unknown = null
  const publishers = new Set<(message: Record<string, unknown>) => void>()
  const send = (message: unknown) => {
    const event = `data: ${JSON.stringify(message)}\n\n`
    for (const client of clients) {
      if (client.writableLength > MAX_BYTES) { client.destroy(); clients.delete(client) }
      else client.write(event)
    }
  }
  const handler: Connect.NextHandleFunction = (req: IncomingMessage, res, next) => {
    if (req.url?.split('?')[0] !== PATH) return next()
    const address = req.socket.remoteAddress
    const host = req.headers.host ?? ''
    const origin = req.headers.origin
    const localHost = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host)
    // Reject LAN requests, DNS rebinding and cross-site commands. No CORS is granted.
    if (!localHost || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address ?? '') ||
      (origin && origin !== `http://${host}` && origin !== `https://${host}`) ||
      req.headers['sec-fetch-site'] === 'cross-site') {
      res.writeHead(403).end(); return
    }
    res.setHeader('Cache-Control', 'no-store')
    if (req.method === 'GET') {
      if (clients.size >= 32) { res.writeHead(429).end(); return }
      res.writeHead(200, { 'Content-Type': 'text/event-stream', Connection: 'keep-alive', 'X-Content-Type-Options': 'nosniff' })
      clients.add(res)
      res.write(`data: ${JSON.stringify({ type: 'controller', sender: controller })}\n\n`)
      if (snapshot) res.write(`data: ${JSON.stringify(snapshot)}\n\n`)
      const heartbeat = setInterval(() => res.write(': keepalive\n\n'), 15000)
      req.on('close', () => { clearInterval(heartbeat); clients.delete(res) })
      return
    }
    if (req.method !== 'POST' || req.headers['x-cathedral-relay'] !== '1' ||
      !req.headers['content-type']?.startsWith('application/json')) { res.writeHead(405).end(); return }
    const chunks: Buffer[] = []
    let bytes = 0
    req.on('data', (chunk: Buffer) => {
      bytes += chunk.length
      if (bytes > MAX_BYTES) { res.writeHead(413).end(); req.destroy(); return }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (bytes > MAX_BYTES) return
      try {
        const message = JSON.parse(Buffer.concat(chunks).toString())
        if (!message || !TYPES.has(message.type) || typeof message.sender !== 'string' || message.sender.length > 100)
          throw new Error('Invalid relay message')
        if (message.type === 'claim' || (message.type === 'snapshot' && controller === null)) {
          controller = message.sender
          send({ type: 'controller', sender: controller })
        }
        if (message.type === 'snapshot') {
          if (!message.snapshot?.audience || !message.snapshot?.confidence) throw new Error('Invalid snapshot')
          if (controller === message.sender) { snapshot = message; send(message) }
        } else if (message.type !== 'claim') send(message)
        for (const listener of publishers) listener(message)
        res.writeHead(204).end()
      } catch { res.writeHead(400).end() }
    })
  }
  const dispatch = (message: unknown) => {
    const item = message as { type?: string; sender?: string | null; snapshot?: unknown }
    if (item.type === 'controller') controller = item.sender ?? null
    if (item.type === 'snapshot' && item.snapshot) snapshot = message
    send(message)
  }
  return { handler, dispatch, readSnapshot: () => snapshot, onPublish: (listener: (message: Record<string, unknown>) => void) => { publishers.add(listener); return () => { publishers.delete(listener) } }, close: () => { for (const client of clients) client.end(); clients.clear(); publishers.clear() } }
}

function install(server: { middlewares: { use: (handler: Connect.NextHandleFunction) => unknown }; httpServer?: { once(event: string, listener: () => void): unknown } | null }) {
  const relay = createOutputRelay()
  server.middlewares.use(createControllerApi(relay.dispatch))
  server.middlewares.use(relay.handler)
  server.httpServer?.once('close', relay.close)
}
