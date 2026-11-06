import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Connect, Plugin } from 'vite'
import {
  LETRAS_GOSPEL_ORIGIN,
  LETRAS_GOSPEL_PROXY,
  isAllowedLetrasGospelPath,
} from '../src/providers/songs/letrasGospelPaths'

/**
 * Same-origin proxy for letrasgospel.net, which sends no CORS headers.
 * Restricted to the sitemaps and artist/song pages (see letrasGospelPaths),
 * GET only, no cookies, 5 MB cap, 20 s timeout, at most 2 requests to the
 * site at a time, and a 10-minute memory cache so the site is not hammered.
 * A published build needs the same path served by its host (PHP, function).
 */
const MAX_BYTES = 5_000_000
const TIMEOUT_MS = 20_000
const CACHE_MS = 10 * 60_000
const MAX_PARALLEL = 2
const MAX_WAITING = 24
const MAX_CACHE_BYTES = 30 * 1024 * 1024

const cache = new Map<string, { at: number; type: string; body: Buffer }>()
let active = 0
const waiting: (() => void)[] = []

async function slot<T>(work: () => Promise<T>): Promise<T> {
  if (active >= MAX_PARALLEL && waiting.length >= MAX_WAITING) throw Object.assign(new Error('busy'), { status: 429 })
  if (active >= MAX_PARALLEL) await new Promise<void>((resolve) => waiting.push(resolve))
  active += 1
  try {
    return await work()
  } finally {
    active -= 1
    waiting.shift()?.()
  }
}

async function fetchUpstream(path: string) {
  const hit = cache.get(path)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit
  return slot(async () => {
    const response = await fetch(`${LETRAS_GOSPEL_ORIGIN}/${path}`, {
      redirect: 'error',
      credentials: 'omit',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'user-agent': 'ChurchPresenter/0.1 (song directory)', accept: 'text/html,application/xml,application/json', 'x-requested-with': 'XMLHttpRequest' },
    })
    if (!response.ok) throw Object.assign(new Error('upstream'), { status: response.status === 404 ? 404 : 502 })
    const chunks: Uint8Array[] = []; let bytes = 0
    const reader = response.body?.getReader()
    if (!reader) throw Object.assign(new Error('empty body'), { status: 502 })
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        bytes += value.byteLength
        if (bytes > MAX_BYTES) { await reader.cancel(); throw Object.assign(new Error('too large'), { status: 502 }) }
        chunks.push(value)
      }
    } finally { reader.releaseLock() }
    const body = Buffer.concat(chunks)
    const entry = { at: Date.now(), type: response.headers.get('content-type') ?? 'text/plain', body }
    for (const [key, value] of cache) if (Date.now() - value.at >= CACHE_MS) cache.delete(key)
    while (cache.size && [...cache.values()].reduce((total, value) => total + value.body.length, body.length) > MAX_CACHE_BYTES) cache.delete(cache.keys().next().value!)
    cache.set(path, entry)
    return entry
  })
}

function send(res: ServerResponse, status: number, body: string | Buffer) {
  res.statusCode = status
  // Upstream HTML is data for the parser; never execute it on our trusted origin.
  res.setHeader('content-type', 'text/plain; charset=utf-8')
  res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'; frame-ancestors 'none'")
  res.setHeader('cache-control', 'no-store')
  res.setHeader('x-content-type-options', 'nosniff')
  res.end(body)
}

export const letrasGospelMiddleware: Connect.NextHandleFunction = (req: IncomingMessage, res: ServerResponse, next) => {
  const url = req.url ?? ''
  if (!url.startsWith(LETRAS_GOSPEL_PROXY)) return next()
  const host = req.headers.host ?? '', origin = req.headers.origin
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host) || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '') || req.headers['sec-fetch-site'] === 'cross-site' || (origin && origin !== `http://${host}` && origin !== `https://${host}`)) return send(res, 403, 'Forbidden')
  if (req.method !== 'GET') return send(res, 405, 'GET only')
  const path = url.slice(LETRAS_GOSPEL_PROXY.length)
  let upstreamPath = path
  if (path.startsWith('search?')) {
    const params = new URLSearchParams(path.slice('search?'.length))
    const query = params.get('q')?.trim() ?? ''
    if ([...params.keys()].some((key) => key !== 'q') || params.getAll('q').length !== 1 || query.length < 2 || query.length > 120) return send(res, 400, 'Invalid search')
    upstreamPath = `musica/musica/ajax_search?q=${encodeURIComponent(query)}`
  } else if (!isAllowedLetrasGospelPath(path)) return send(res, 400, 'Path not allowed')
  fetchUpstream(upstreamPath)
    .then((entry) => send(res, 200, entry.body))
    .catch((error: { status?: number }) => send(res, error.status ?? 502, 'Upstream unavailable'))
}

export function letrasGospelProxy(): Plugin {
  return {
    name: 'church-presenter-letrasgospel-proxy',
    configureServer(server) {
      server.middlewares.use(letrasGospelMiddleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(letrasGospelMiddleware)
    },
  }
}
