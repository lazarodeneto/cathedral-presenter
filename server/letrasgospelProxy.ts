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

const cache = new Map<string, { at: number; type: string; body: Buffer }>()
let active = 0
const waiting: (() => void)[] = []

async function slot<T>(work: () => Promise<T>): Promise<T> {
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
      headers: { 'user-agent': 'ChurchPresenter/0.1 (song directory)', accept: 'text/html,application/xml' },
    })
    if (!response.ok) throw Object.assign(new Error('upstream'), { status: response.status === 404 ? 404 : 502 })
    const body = Buffer.from(await response.arrayBuffer())
    if (body.length > MAX_BYTES) throw Object.assign(new Error('too large'), { status: 502 })
    const entry = { at: Date.now(), type: response.headers.get('content-type') ?? 'text/plain', body }
    cache.set(path, entry)
    return entry
  })
}

function send(res: ServerResponse, status: number, body: string | Buffer, type = 'text/plain; charset=utf-8') {
  res.statusCode = status
  res.setHeader('content-type', type)
  res.setHeader('cache-control', 'no-store')
  res.setHeader('x-content-type-options', 'nosniff')
  res.end(body)
}

export const letrasGospelMiddleware: Connect.NextHandleFunction = (req: IncomingMessage, res: ServerResponse, next) => {
  const url = req.url ?? ''
  if (!url.startsWith(LETRAS_GOSPEL_PROXY)) return next()
  if (req.method !== 'GET') return send(res, 405, 'GET only')
  const path = url.slice(LETRAS_GOSPEL_PROXY.length)
  if (!isAllowedLetrasGospelPath(path)) return send(res, 400, 'Path not allowed')
  fetchUpstream(path)
    .then((entry) => send(res, 200, entry.body, entry.type))
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
