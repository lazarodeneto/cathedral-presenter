import { sha256 } from '@noble/hashes/sha2.js'
import type { MediaAsset } from '../../types'
const CHUNK_BYTES = 2 * 1024 * 1024
const headers = { 'Content-Type': 'application/json', 'X-Cathedral-Media': '1' }
async function read(response: Response) {
  const data = await response.json()
  if (!response.ok) throw new Error(data.reason ?? 'media-service-unavailable')
  return data
}
export async function uploadCloudFile(file: File, mime: string, scanOnly = false, convertPdf = false): Promise<{ asset?: MediaAsset; clean?: boolean; conversion?: { id: string; size: number; parts: number; sha256: string; uploadId: string } }> {
  const hash = sha256.create()
  for (let offset = 0; offset < file.size; offset += CHUNK_BYTES) hash.update(new Uint8Array(await file.slice(offset, offset + CHUNK_BYTES).arrayBuffer()))
  const checksum = [...hash.digest()].map((n) => n.toString(16).padStart(2, '0')).join('')
  const upload = await read(await fetch('/api/media/uploads', { method: 'POST', headers, body: JSON.stringify({ name: file.name, mime, size: file.size, sha256: checksum, scanOnly, convertPdf }) }))
  if (upload.asset) return { asset: upload.asset }
  if (!/^[0-9a-f-]{36}$/.test(upload.id) || upload.chunkBytes !== CHUNK_BYTES || upload.parts !== Math.ceil(file.size / CHUNK_BYTES)) throw new Error('invalid-upload')
  const progress = (phase: string, percent: number) => window.dispatchEvent(new CustomEvent('cathedral:upload-progress', { detail: { id: upload.id, name: file.name, phase, percent } }))
  for (let i = 0; i < upload.parts; i++) {
    await read(await fetch(`/api/media/uploads/${upload.id}/${i}`, { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/octet-stream' }, body: file.slice(i * CHUNK_BYTES, (i + 1) * CHUNK_BYTES), signal: AbortSignal.timeout(45000) }))
    progress('uploading', Math.round((i + 1) / upload.parts * 100))
  }
  await read(await fetch(`/api/media/uploads/${upload.id}/complete`, { method: 'POST', headers, body: '{}' }))
  const deadline = Date.now() + 15 * 60 * 1000
  while (Date.now() < deadline) {
    const status = await read(await fetch(`/api/media/uploads/${upload.id}`, { signal: AbortSignal.timeout(15000) }))
    if (status.status === 'done') { progress('done', 100); return { asset: status.asset, clean: status.clean, conversion: status.conversion ? { ...status.conversion, uploadId: upload.id } : undefined } }
    if (status.status === 'failed') throw new Error(status.reason ?? 'scanner-unavailable')
    progress(status.status === 'publishing' ? 'publishing' : 'scanning', status.status === 'publishing' ? Number(status.progress || 0) : 100)
    await new Promise((resolve) => setTimeout(resolve, 1500))
  }
  throw new Error('scan-pending')
}
