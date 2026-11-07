import { createHash } from 'node:crypto'
import { createReadStream, existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { open, stat } from 'node:fs/promises'
import type { MediaAsset } from '../src/types'
import type { createWorkspace } from './workspace'

const CHUNK = 2 * 1024 * 1024
const LIMIT = 32 * 1024 * 1024
function assetIds(document: unknown) {
  const ids = new Set([...JSON.stringify(document).matchAll(/\/api\/media\/files\/([0-9a-f-]{36})/gi)].map((m) => m[1]))
  const library = (document as { mediaLibrary?: unknown } | null)?.mediaLibrary
  if (Array.isArray(library)) for (const asset of library) {
    if (!asset || typeof asset !== 'object' || asset.provider !== 'upload') continue
    if (typeof asset.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(asset.id)) throw new Error('media-missing')
    ids.add(asset.id)
  }
  return [...ids]
}
interface SyncBase { installationId: string; localRevision: number; cloudRevision: number }
interface Options {
  file: string
  workspace: ReturnType<typeof createWorkspace>
  installation: () => string | undefined
  request: (path: string, init?: RequestInit) => Promise<Response>
  download: () => Promise<{ revision: number; document: unknown }>
  cache: (id: string) => Promise<void>
  source: (id: string) => Promise<{ asset: MediaAsset; path: string }>
  isLive: () => boolean
}

/** A shared baseline ensures automatic sync never overwrites edits made on both sides. */
export function createNativeWorkspaceSync(options: Options) {
  let base: SyncBase | undefined, busy = false, conflict = false, error = ''
  try {
    const value = JSON.parse(readFileSync(options.file, 'utf8')) as SyncBase
    if (value.installationId === options.installation() && Number.isSafeInteger(value.localRevision) && Number.isSafeInteger(value.cloudRevision)) base = value
  } catch { /* First synchronization requires an explicit choice. */ }
  const json = async (path: string, init?: RequestInit) => (await options.request(path, init)).json()
  const post = (path: string, body: unknown) => json(path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Cathedral-Media': '1' }, body: JSON.stringify(body) })
  function save(localRevision: number, cloudRevision: number) {
    const installationId = options.installation()
    if (!installationId) throw new Error('cloud-not-connected')
    const next = { installationId, localRevision, cloudRevision }
    const tmp = `${options.file}.tmp`
    writeFileSync(tmp, JSON.stringify(next), { mode: 0o600 }); renameSync(tmp, options.file); base = next; conflict = false; error = ''
  }
  async function uploadMedia(id: string) {
    const { asset, path } = await options.source(id), info = await stat(path)
    if (!asset.mime || !asset.name || !info.isFile() || info.size < 1 || info.size > 300 * 1024 * 1024) throw new Error('media-missing')
    const hash = createHash('sha256'); for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer)
    const sha256 = hash.digest('hex')
    try {
      const existing = await json(`/api/media/files/${id}?metadata=1`)
      if (existing.asset?.sha256 !== sha256) throw new Error('media-id-conflict')
      return
    } catch (e) { if (!(e instanceof Error) || e.message !== 'media-missing') throw e }
    const upload = await post('/api/media/uploads', { name: asset.name, mime: asset.mime, size: info.size, sha256, mediaId: id })
    if (upload.asset) return
    if (!/^[0-9a-f-]{36}$/i.test(upload.id) || upload.chunkBytes !== CHUNK || upload.parts !== Math.ceil(info.size / CHUNK)) throw new Error('invalid-upload')
    const handle = await open(path, 'r')
    try {
      for (let i = 0; i < upload.parts; i++) {
        const buffer = Buffer.alloc(Math.min(CHUNK, info.size - i * CHUNK)); let offset = 0
        while (offset < buffer.length) { const result = await handle.read(buffer, offset, buffer.length - offset, i * CHUNK + offset); if (!result.bytesRead) throw new Error('file-changed'); offset += result.bytesRead }
        await options.request(`/api/media/uploads/${upload.id}/${i}`, { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream', 'X-Cathedral-Media': '1' }, body: buffer })
      }
    } finally { await handle.close() }
    await post(`/api/media/uploads/${upload.id}/complete`, {})
    const deadline = Date.now() + 15 * 60 * 1000
    while (Date.now() < deadline) {
      const status = await json(`/api/media/uploads/${upload.id}`)
      if (status.status === 'done') return
      if (status.status === 'failed') throw new Error(status.reason || 'scanner-unavailable')
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }
    throw new Error('scan-pending')
  }
  async function saveCloud(document: unknown, expectedRevision: number) {
    const bytes = Buffer.from(JSON.stringify(document))
    if (!bytes.length || bytes.length > LIMIT) throw new Error('workspace-too-large')
    const headers = { 'Content-Type': 'application/json', 'X-Cathedral-Workspace': '1' }
    if (bytes.length < CHUNK) return json('/api/workspace', { method: 'PUT', headers, body: JSON.stringify({ document, expectedRevision }) })
    const upload = await json('/api/workspace/uploads', { method: 'POST', headers, body: JSON.stringify({ size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }) })
    if (!/^[0-9a-f-]{36}$/i.test(upload.id) || upload.parts !== Math.ceil(bytes.length / CHUNK)) throw new Error('invalid-workspace')
    for (let i = 0; i < upload.parts; i++) await options.request(`/api/workspace/uploads/${upload.id}/${i}`, { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/octet-stream' }, body: bytes.subarray(i * CHUNK, (i + 1) * CHUNK) })
    return json(`/api/workspace/uploads/${upload.id}`, { method: 'POST', headers, body: JSON.stringify({ expectedRevision }) })
  }
  async function transfer(direction: 'upload' | 'download', expectedCloud?: number) {
    if (busy) throw new Error('sync-busy')
    if (!options.installation()) throw new Error('cloud-not-connected')
    if (options.isLive()) throw new Error('stop-live-before-sync')
    busy = true
    try {
      const local = options.workspace.readCurrent(), cloud = await options.download()
      if (expectedCloud !== undefined && cloud.revision !== expectedCloud) throw new Error('workspace-conflict')
      if (direction === 'download') {
        if (!cloud.document) throw new Error('workspace-missing')
        for (const id of assetIds(cloud.document)) await options.cache(id)
        if (options.isLive()) throw new Error('stop-live-before-sync')
        const revision = options.workspace.replace(cloud.document, local.revision)
        save(revision, cloud.revision)
        return { revision, cloudRevision: cloud.revision }
      }
      if (!local.document) throw new Error('workspace-missing')
      for (const id of assetIds(local.document)) await uploadMedia(id)
      if (options.isLive()) throw new Error('stop-live-before-sync')
      // A revision check in the cloud commit detects changes while files were scanned.
      const result = await saveCloud(local.document, cloud.revision)
      save(local.revision, Number(result.revision))
      return { revision: local.revision, cloudRevision: Number(result.revision) }
    } catch (e) { error = e instanceof Error ? e.message : 'cloud-unavailable'; if (error === 'workspace-conflict') conflict = true; throw e }
    finally { busy = false }
  }
  async function tick() {
    if (!base || base.installationId !== options.installation() || busy || conflict || options.isLive()) return
    try {
      const local = options.workspace.readCurrent(), cloud = await json(`/api/workspace?revision=${base.cloudRevision}`)
      const changedLocal = local.revision !== base.localRevision, changedCloud = Number(cloud.revision) !== base.cloudRevision
      if (changedLocal && changedCloud) { conflict = true; error = 'workspace-conflict'; return }
      if (changedLocal) await transfer('upload', base.cloudRevision)
      else if (changedCloud) await transfer('download', Number(cloud.revision))
      else error = ''
    } catch (e) { error = e instanceof Error ? e.message : 'cloud-unavailable' }
  }
  function reset() { base = undefined; busy = false; conflict = false; error = ''; if (existsSync(options.file)) unlinkSync(options.file) }
  return { transfer, tick, reset, status: () => ({ syncEnabled: Boolean(base), syncBusy: busy, syncConflict: conflict, syncError: error }) }
}
