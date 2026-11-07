import { createHash, timingSafeEqual } from 'node:crypto'
export class CloudError extends Error {
  constructor(message: string, readonly status = 400) { super(message) }
}
export type CloudEnvironment = Record<string, string | undefined>
export function cloudOrigin(env: CloudEnvironment) {
  const raw = env.CATHEDRAL_ORIGIN || (env.CONTEXT && env.CONTEXT !== 'production' ? env.DEPLOY_PRIME_URL : env.URL)
  if (!raw) throw new CloudError('cloud-not-configured', 503)
  const url = new URL(raw)
  if (url.username || url.password || url.pathname !== '/' || (url.protocol !== 'https:' && !(env.CATHEDRAL_ALLOW_LOCAL_TESTS === '1' && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) throw new CloudError('cloud-not-configured', 503)
  return url.origin
}
export function checkOrigin(req: Request, origin: string, callback = false) {
  const url = new URL(req.url)
  if (url.origin !== origin) throw new CloudError('forbidden', 403)
  if (!callback && (req.headers.get('sec-fetch-site') === 'cross-site' || (req.headers.has('origin') && req.headers.get('origin') !== origin))) throw new CloudError('forbidden', 403)
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !req.headers.get('content-type')?.startsWith('application/json') && req.headers.get('x-cathedral-media') !== '1' && req.headers.get('x-cathedral-workspace') !== '1') throw new CloudError('forbidden', 403)
}
export function json(body: unknown, status = 200, extra: HeadersInit = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', ...extra } })
}
export async function readBytes(req: Request, limit = 3 * 1024 * 1024) {
  const declared = Number(req.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > limit) throw new CloudError('request-too-large', 413)
  const reader = req.body?.getReader()
  if (!reader) return Buffer.alloc(0)
  const chunks: Uint8Array[] = []; let bytes = 0
  try {
    for (;;) {
      const { value, done } = await reader.read(); if (done) break
      bytes += value.byteLength
      if (bytes > limit) { await reader.cancel(); throw new CloudError('request-too-large', 413) }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  return Buffer.concat(chunks)
}
export async function readJson(req: Request, limit = 3 * 1024 * 1024): Promise<Record<string, unknown>> {
  if (!req.headers.get('content-type')?.startsWith('application/json')) throw new CloudError('invalid-request')
  try {
    const value = JSON.parse((await readBytes(req, limit)).toString())
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new CloudError('invalid-request')
    return value
  } catch (error) { if (error instanceof CloudError) throw error; throw new CloudError('invalid-request') }
}
export const digest = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex')
export function secretMatches(supplied: string | null, expected: string | undefined) {
  return Boolean(supplied && expected && timingSafeEqual(Buffer.from(digest(supplied)), Buffer.from(digest(expected))))
}
export function errorResponse(error: unknown) {
  return json({ reason: error instanceof CloudError ? error.message : 'cloud-service-unavailable' }, error instanceof CloudError ? error.status : 503)
}
