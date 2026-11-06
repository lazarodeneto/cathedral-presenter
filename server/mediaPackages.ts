import { Zip, ZipPassThrough, Unzip, UnzipInflate, strToU8 } from 'fflate'
import { createHash, randomUUID } from 'node:crypto'
import { createReadStream, createWriteStream, mkdirSync, openSync, closeSync, writeSync, readSync, readFileSync } from 'node:fs'
import { stat, rm, rename, mkdtemp, statfs } from 'node:fs/promises'
import { join } from 'node:path'
import { once } from 'node:events'
import { pipeline } from 'node:stream/promises'
import { Transform } from 'node:stream'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { MediaAsset } from '../src/types'
import { parseBackup, type BackupData } from '../src/security/backup'
import { sniffImageMime, sniffVideoMime, sniffAudioMime, MAX_VIDEO_BYTES } from '../src/security/media'
import { safeDisplayFileName } from '../src/security/path'

export type PackageAsset = MediaAsset & { sha256?: string; scan: 'clean' }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const LIMIT = 2 * 1024 * 1024 * 1024
interface Manifest { app: 'cathedral-package'; version: 1; backup: BackupData; assets: (PackageAsset & { sha256: string })[] }
export function createMediaPackages(directory: string, options: {
  find(id: string): PackageAsset | null
  cache(asset: PackageAsset): Promise<unknown>
  requireClean(path: string): Promise<unknown>
  commit(assets: PackageAsset[]): void
}) {
  const packages = join(directory, 'packages'), files = join(directory, 'files')
  mkdirSync(packages, { recursive: true, mode: 0o700 })
  async function hashFile(path: string) {
    const hash = createHash('sha256')
    for await (const chunk of createReadStream(path)) hash.update(chunk)
    return hash.digest('hex')
  }
  async function readJson(req: IncomingMessage) {
    const chunks: Buffer[] = []; let bytes = 0
    for await (const chunk of req) { bytes += chunk.length; if (bytes > 12 * 1024 * 1024) throw new Error('backup-too-large'); chunks.push(chunk) }
    return JSON.parse(Buffer.concat(chunks).toString()) as BackupData
  }
  async function exportPackage(req: IncomingMessage, res: ServerResponse) {
    const backup = await readJson(req)
    parseBackup(JSON.stringify(backup))
    const ids = new Set<string>(backup.media.filter((asset) => asset.provider === 'upload').map((asset) => asset.id).filter((id) => UUID.test(id)))
    for (const match of JSON.stringify(backup.services).matchAll(/\/api\/media\/files\/([0-9a-f-]{36})/gi)) ids.add(match[1])
    const assets: Manifest['assets'] = []; let bytes = 0
    for (const id of ids) {
      const asset = options.find(id)
      if (!asset) throw new Error('media-missing')
      await options.cache(asset)
      const info = await stat(join(files, id)); bytes += info.size
      if (bytes > LIMIT) throw new Error('backup-too-large')
      assets.push({ ...asset, size: info.size, sha256: await hashFile(join(files, id)) })
    }
    const disk = await statfs(packages)
    if (disk.bavail * disk.bsize < bytes + 50 * 1024 * 1024) throw new Error('backup-disk-space')
    const id = randomUUID(), path = join(packages, `${id}.zip`)
    const output = createWriteStream(path, { flags: 'wx', mode: 0o600 })
    const completed = new Promise<void>((resolve, reject) => { output.on('finish', resolve); output.on('error', reject) })
    const zip = new Zip((error, chunk, final) => { if (error) output.destroy(error); else { output.write(chunk); if (final) output.end() } })
    try {
      const manifest = new ZipPassThrough('manifest.json'); zip.add(manifest)
      manifest.push(strToU8(JSON.stringify({ app: 'cathedral-package', version: 1, backup, assets } satisfies Manifest)), true)
      for (const asset of assets) {
        const file = new ZipPassThrough(`media/${asset.id}`); zip.add(file)
        for await (const chunk of createReadStream(join(files, asset.id), { highWaterMark: 64 * 1024 })) {
          file.push(chunk, false)
          if (output.writableNeedDrain) await once(output, 'drain')
        }
        file.push(new Uint8Array(), true)
      }
      zip.end(); await completed
      res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ download: `/api/media/packages/${id}`, files: assets.length, bytes }))
    } catch (error) { zip.terminate(); output.destroy(); await rm(path, { force: true }); throw error }
  }
  async function importPackage(req: IncomingMessage, res: ServerResponse) {
    const disk = await statfs(packages), declared = Number(req.headers['content-length']) || 0
    if (declared > LIMIT || disk.bavail * disk.bsize < declared * 2 + 50 * 1024 * 1024) throw new Error('backup-disk-space')
    const stage = await mkdtemp(join(packages, '.restore-'))
    const archive = join(stage, 'input.zip'), moved: string[] = [], handles = new Set<number>()
    try {
      let received = 0
      await pipeline(req, new Transform({ transform(chunk, _encoding, done) { received += chunk.length; done(received > LIMIT ? new Error('backup-too-large') : null, chunk) } }), createWriteStream(archive, { mode: 0o600, flags: 'wx' }))
      const entries = new Map<string, { bytes: number; hash: string }>(); let expanded = 0, count = 0
      const unzip = new Unzip((file) => {
        if (++count > 2001 || (file.name !== 'manifest.json' && !/^media\/[0-9a-f-]{36}$/i.test(file.name)) || entries.has(file.name)) throw new Error('invalid-backup')
        const name = file.name === 'manifest.json' ? 'manifest.json' : file.name.slice(6)
        if (name !== 'manifest.json' && !UUID.test(name)) throw new Error('invalid-backup')
        const entry = { bytes: 0, hash: '' }; entries.set(file.name, entry)
        const hash = createHash('sha256'), fd = openSync(join(stage, name), 'wx', 0o600); handles.add(fd)
        file.ondata = (error, data, final) => {
          if (error) throw error
          entry.bytes += data.length; expanded += data.length
          if (expanded > LIMIT || entry.bytes > (name === 'manifest.json' ? 12 * 1024 * 1024 : MAX_VIDEO_BYTES)) throw new Error('backup-too-large')
          hash.update(data); let offset = 0; while (offset < data.length) { const written = writeSync(fd, data, offset, data.length - offset); if (!written) throw new Error('backup-write-failed'); offset += written }
          if (final) { entry.hash = hash.digest('hex'); closeSync(fd); handles.delete(fd) }
        }
        file.start()
      })
      unzip.register(UnzipInflate)
      for await (const chunk of createReadStream(archive, { highWaterMark: 64 * 1024 })) unzip.push(chunk)
      unzip.push(new Uint8Array(), true)
      const manifest = JSON.parse(readFileSync(join(stage, 'manifest.json'), 'utf8')) as Manifest
      if (manifest.app !== 'cathedral-package' || manifest.version !== 1 || !Array.isArray(manifest.assets) || manifest.assets.length > 2000 || entries.size !== manifest.assets.length + 1 || handles.size) throw new Error('invalid-backup')
      parseBackup(JSON.stringify(manifest.backup))
      const remap = new Map<string, string>(), restored: PackageAsset[] = [], seen = new Set<string>()
      for (const asset of manifest.assets) {
        if (!UUID.test(asset.id) || seen.has(asset.id)) throw new Error('invalid-backup')
        seen.add(asset.id)
        const entry = entries.get(`media/${asset.id}`), path = join(stage, asset.id)
        if (!entry || entry.bytes !== asset.size || entry.hash !== asset.sha256) throw new Error('backup-checksum-failed')
        const head = Buffer.alloc(32), fd = openSync(path, 'r')
        try { readSync(fd, head, 0, 32, 0) } finally { closeSync(fd) }
        const mime = sniffImageMime(head) ?? sniffAudioMime(head) ?? sniffVideoMime(head)
        if (!mime || mime !== asset.mime) throw new Error('invalid-file-signature')
        await options.requireClean(path)
        // New identifiers ensure restoring a package never overwrites existing files.
        const id = randomUUID(); remap.set(asset.id, id)
        restored.push({ id, source: `/api/media/files/${id}`, name: safeDisplayFileName(asset.name), kind: mime.startsWith('image/') ? 'image' : mime.startsWith('audio/') ? 'audio' : 'video', mime, size: entry.bytes, status: 'ready', provider: 'upload', addedAt: new Date().toISOString(), storage: 'local', scan: 'clean', sha256: entry.hash, tags: Array.isArray(asset.tags) ? asset.tags.filter((v) => typeof v === 'string').slice(0, 30) : [] })
      }
      const backup = JSON.parse(JSON.stringify(manifest.backup).replace(/\/api\/media\/files\/([0-9a-f-]{36})/gi, (_match, id: string) => remap.has(id) ? `/api/media/files/${remap.get(id)}` : '')) as BackupData
      const parsed = parseBackup(JSON.stringify(backup))
      for (const [old, id] of remap) { const path = join(files, id); await rename(join(stage, old), path); moved.push(path) }
      options.commit(restored)
      res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ parsed: { ...parsed, media: [...restored, ...(parsed.media ?? []).filter((asset) => !remap.has(asset.id))] } }))
    } catch (error) { for (const path of moved) await rm(path, { force: true }); throw error }
    finally { for (const fd of handles) closeSync(fd); await rm(stage, { force: true, recursive: true }) }
  }
  return async (req: IncomingMessage, res: ServerResponse, pathname: string): Promise<boolean> => {
    if (pathname === '/api/media/packages/export' && req.method === 'POST') { await exportPackage(req, res); return true }
    if (pathname === '/api/media/packages/import' && req.method === 'POST') { await importPackage(req, res); return true }
    const download = /^\/api\/media\/packages\/([0-9a-f-]{36})$/.exec(pathname)
    if (download && UUID.test(download[1]) && req.method === 'GET') {
      const path = join(packages, `${download[1]}.zip`), info = await stat(path)
      res.writeHead(200, { 'Content-Type': 'application/zip', 'Content-Length': info.size, 'Content-Disposition': 'attachment; filename="Cathedral-Presenter-backup.zip"', 'X-Content-Type-Options': 'nosniff' })
      await pipeline(createReadStream(path), res); return true
    }
    return false
  }
}
