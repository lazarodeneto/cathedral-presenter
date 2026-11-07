import { verifyFileTicket } from './tickets.ts'
import type { CloudStorage } from './storage.ts'
const CHUNK_BYTES = 2 * 1024 * 1024
const incomingPartKey = (id: string, part: number, sha: string) => `incoming/${id}/${part}/${sha}`
export interface FileManifest { id: string; uploadId: string; size: number; mime: string; parts: number; partHashes: string[]; sha256: string }
const allowed = /^(?:image\/(?:jpeg|png|gif|webp)|video\/(?:mp4|webm|quicktime|x-m4v)|audio\/(?:mpeg|wav|ogg|flac|mp4))$/
/** Shared with the Edge Function: each range is bounded, with no whole-video buffering. */
export async function protectedContent(req: Request, secret: string, storage: CloudStorage) {
  if (!/^[a-f0-9]{64}$/i.test(secret)) return new Response(null, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  const url = new URL(req.url), id = url.pathname.split('/').pop() ?? ''
  if (!['GET', 'HEAD'].includes(req.method)) return new Response(null, { status: 405 })
  const ticket = await verifyFileTicket(secret, url.searchParams.get('ticket') ?? '', id)
  if (!ticket) return new Response(null, { status: 403, headers: { 'Cache-Control': 'no-store' } })
  const bytes = await storage.get(ticket.key)
  if (!bytes) return new Response(null, { status: 404 })
  const file = JSON.parse(new TextDecoder().decode(bytes)) as FileManifest
  if (file.id !== id || !/^[0-9a-f-]{36}$/.test(file.uploadId) || !Number.isSafeInteger(file.size) || file.size < 1 || file.size > 300 * 1024 * 1024 || file.parts !== Math.ceil(file.size / CHUNK_BYTES) || !Array.isArray(file.partHashes) || file.partHashes.length !== file.parts || !file.partHashes.every((hash) => /^[a-f0-9]{64}$/.test(hash)) || !allowed.test(file.mime)) return new Response(null, { status: 404 })
  let start = 0, end = file.size - 1, status = 200
  const range = req.headers.get('range')
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range)
    if (!match || (!match[1] && !match[2])) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${file.size}` } })
    if (!match[1]) start = Math.max(0, file.size - Number(match[2]))
    else { start = Number(match[1]); if (match[2]) end = Math.min(end, Number(match[2])) }
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= file.size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${file.size}` } })
    end = Math.min(end, start + 8 * 1024 * 1024 - 1); status = 206
  }
  const headers: Record<string, string> = { 'Content-Type': file.mime, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Cross-Origin-Resource-Policy': 'same-origin', 'Content-Security-Policy': "sandbox; default-src 'none'" }
  if (status === 206) headers['Content-Range'] = `bytes ${start}-${end}/${file.size}`
  if (req.method === 'HEAD') return new Response(null, { status, headers })
  let position = start, canceled = false
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (canceled) return
      if (position > end) { controller.close(); return }
      try {
        const index = Math.floor(position / CHUNK_BYTES), part = await storage.get(incomingPartKey(file.uploadId, index, file.partHashes[index]))
        if (!part || part.byteLength !== Math.min(CHUNK_BYTES, file.size - index * CHUNK_BYTES)) throw new Error('missing-content')
        if (canceled) return
        const offset = position % CHUNK_BYTES, length = Math.min(part.length - offset, end - position + 1)
        controller.enqueue(part.subarray(offset, offset + length)); position += length
      } catch (error) { controller.error(error) }
    }, cancel() { canceled = true },
  })
  return new Response(body, { status, headers })
}
