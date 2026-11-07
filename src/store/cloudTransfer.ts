import { isCloud } from '../runtime'
const CHUNK_BYTES = 2 * 1024 * 1024
const headers = { 'Content-Type': 'application/json', 'X-Cathedral-Workspace': '1' }
async function responseJson(response: Response) {
  if ([401,403].includes(response.status)) window.dispatchEvent(new Event('cathedral:session-expired'))
  const data = await response.json()
  if (!response.ok) throw Object.assign(new Error(data.reason ?? 'workspace-unavailable'), { status: response.status })
  return data
}
async function sha(bytes: Uint8Array) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>))].map((n) => n.toString(16).padStart(2, '0')).join('') }
export async function loadWorkspaceDocument(path: string) {
  const response = await fetch(path, { headers, signal: AbortSignal.timeout(15000) })
  const data = await responseJson(response)
  const parts = data.documentParts
  if (parts) {
    if (!/^[0-9a-f-]{36}$/.test(parts.id) || !Number.isSafeInteger(parts.count) || parts.count < 1 || parts.count > 16 || !Number.isSafeInteger(parts.size) || parts.size > 32 * 1024 * 1024) throw new Error('invalid-workspace')
    const bytes = new Uint8Array(parts.size)
    for (let i = 0, offset = 0; i < parts.count; i++) {
      const part = await fetch(`/api/workspace/content/${parts.id}/${i}`, { headers, signal: AbortSignal.timeout(15000) })
      if (!part.ok) throw new Error('workspace-unavailable')
      const value = new Uint8Array(await part.arrayBuffer())
      if (value.length !== Math.min(CHUNK_BYTES, parts.size - offset)) throw new Error('invalid-workspace')
      bytes.set(value, offset); offset += value.length
    }
    if (await sha(bytes) !== parts.sha256) throw new Error('file-changed')
    data.document = JSON.parse(new TextDecoder().decode(bytes))
  }
  return data as { revision: number; document: unknown; unchanged?: boolean }
}
export async function saveWorkspaceDocument(document: string, expectedRevision: number) {
  const bytes = new TextEncoder().encode(document)
  if (!isCloud || bytes.length < CHUNK_BYTES) return fetch('/api/workspace', { method: 'PUT', headers, body: JSON.stringify({ expectedRevision, document: JSON.parse(document) }), signal: AbortSignal.timeout(15000) })
  const upload = await responseJson(await fetch('/api/workspace/uploads', { method: 'POST', headers, body: JSON.stringify({ size: bytes.length, sha256: await sha(bytes) }) }))
  if (!/^[0-9a-f-]{36}$/.test(upload.id)) throw new Error('invalid-workspace')
  for (let i = 0; i < upload.parts; i++) await responseJson(await fetch(`/api/workspace/uploads/${upload.id}/${i}`, { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/octet-stream' }, body: bytes.slice(i * CHUNK_BYTES, (i + 1) * CHUNK_BYTES), signal: AbortSignal.timeout(20000) }))
  return fetch(`/api/workspace/uploads/${upload.id}`, { method: 'POST', headers, body: JSON.stringify({ expectedRevision }), signal: AbortSignal.timeout(30000) })
}
