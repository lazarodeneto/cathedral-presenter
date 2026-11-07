import { createMediaPackages } from './mediaPackages'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { createReadStream, createWriteStream, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { open, rename, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { Transform, Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import Database from 'better-sqlite3'
import type { Plugin, Connect } from 'vite'
import { accountSession } from './auth'
import { antivirus, type ScanResult } from './antivirus'
import { GoogleDrive } from './googleDrive'
import { sniffImageMime, sniffVideoMime, sniffAudioMime, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from '../src/security/media'
import { safeDisplayFileName } from '../src/security/path'
import { sanitizeSingleLine } from '../src/security/text'
import { normalizeMediaTags } from '../src/utils/mediaTags'
import type { MediaAsset } from '../src/types'
import type { RemoteMedia } from './nativeCloud'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
type StoredAsset = MediaAsset & { storage: 'local' | 'drive'; sha256?: string; driveId?: string; scan: 'clean' }
type Session = { user: { id: string; email: string; role?: string } } | null
const extensions: Record<string, string[]> = { 'audio/mpeg': ['mp3'], 'audio/wav': ['wav'], 'audio/ogg': ['ogg'], 'audio/flac': ['flac'], 'audio/mp4': ['m4a'], 'image/png': ['png'], 'image/jpeg': ['jpg', 'jpeg'], 'image/webp': ['webp'], 'image/gif': ['gif'], 'image/avif': ['avif'], 'video/mp4': ['mp4', 'm4v'], 'video/webm': ['webm'], 'video/quicktime': ['mov'] }
class MediaError extends Error { constructor(message: string, readonly status = 400) { super(message) } }
function json(res: ServerResponse, status: number, value: unknown) { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)) }

export function createMediaLibrary(root: string, env: Record<string, string | undefined>, authenticate: (req: IncomingMessage) => Promise<Session> = accountSession, scanOverride?: (path: string) => Promise<ScanResult>, remote?: RemoteMedia) {
  const directory = join(root, '.data', 'media'), files = join(directory, 'files'), quarantine = join(directory, 'quarantine')
  for (const path of [directory, files, quarantine]) mkdirSync(path, { recursive: true, mode: 0o700 })
  const database = new Database(join(directory, 'library.sqlite'))
  database.pragma('journal_mode = WAL')
  database.exec('CREATE TABLE IF NOT EXISTS assets (id TEXT PRIMARY KEY, record TEXT NOT NULL, deleted INTEGER NOT NULL DEFAULT 0)')
  const find = (id: string) => { const row = database.prepare('SELECT record FROM assets WHERE id=? AND deleted=0').get(id) as { record: string } | undefined; return row ? JSON.parse(row.record) as StoredAsset : null }
  const save = (asset: StoredAsset) => database.prepare('INSERT INTO assets(id,record) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET record=excluded.record').run(asset.id, JSON.stringify(asset))
  const engine = antivirus(root, env), scan = scanOverride ?? engine.scan
  const drive = new GoogleDrive(directory, env)
  const healthFile = join(directory, 'scanner-health.txt')
  writeFileSync(healthFile, 'Cathedral Presenter antivirus health check', { mode: 0o600 })
  let health: { at: number; ready: boolean } | undefined
  let activeUploads = 0
  const states = new Map<string, { userId: string; verifier: string; expires: number }>()
  const downloads = new Map<string, Promise<void>>()
  const requireClean = async (path: string) => {
    const result = await scan(path)
    if (result !== 'clean') throw new MediaError(result === 'infected' ? 'virus-detected' : 'scanner-unavailable', result === 'infected' ? 422 : 503)
  }
  const canManageDrive = (session: NonNullable<Session>) => env.MEDIA_ADMIN_EMAIL
    ? session.user.email.toLowerCase() === env.MEDIA_ADMIN_EMAIL.toLowerCase()
    : session.user.role === 'admin' || drive.ownerId === session.user.id

  const packages = createMediaPackages(directory, { find, cache: (asset) => cacheDrive(find(asset.id)!), requireClean, commit: (assets) => database.transaction(() => { for (const asset of assets) save({ ...asset, storage: 'local' }) })() })

  async function receive(req: IncomingMessage, path: string, max: number) {
    let bytes = 0
    const hash = createHash('sha256')
    const limit = new Transform({ transform(chunk: Buffer, _encoding, done) {
      bytes += chunk.length
      if (bytes > max) return done(new MediaError('file-too-large', 413))
      hash.update(chunk); done(null, chunk)
    } })
    await pipeline(req, limit, createWriteStream(path, { flags: 'wx', mode: 0o600 }))
    if (!bytes) throw new MediaError('empty-file')
    return { bytes, sha256: hash.digest('hex') }
  }
  async function upload(req: IncomingMessage, res: ServerResponse, scanOnly = false) {
    if (activeUploads >= 2) throw new MediaError('upload-busy', 429)
    const target = req.headers['x-storage-target'] ?? 'local'
    if (target !== 'local' && target !== 'drive') throw new MediaError('invalid-storage')
    if (target === 'drive' && !drive.connected) throw new MediaError('drive-not-connected', 409)
    const rawName = req.headers['x-file-name']
    if (typeof rawName !== 'string' || rawName.length > 1000) throw new MediaError('invalid-filename')
    let name: string
    try { name = safeDisplayFileName(decodeURIComponent(rawName)) } catch { throw new MediaError('invalid-filename') }
    const declared = req.headers['content-type']?.split(';')[0]
    const documents: Record<string, string[]> = { 'application/pdf': ['pdf'], 'application/json': ['json'], 'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pptx'], 'application/xml': ['xml'], 'text/plain': ['txt', 'md'] }
    const document = Boolean(scanOnly && declared && documents[declared])
    if (!declared || !(extensions[declared] ?? (scanOnly ? documents[declared] : undefined))?.includes(name.split('.').pop()?.toLowerCase() ?? '')) throw new MediaError('unsupported-type')
    const max = document ? 50 * 1024 * 1024 : declared.startsWith('image/') ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES
    if (Number(req.headers['content-length']) > max) throw new MediaError('file-too-large', 413)
    const id = randomUUID(), pending = join(quarantine, id)
    activeUploads++
    try {
      const content = await receive(req, pending, max)
      const handle = await open(pending, 'r'), head = Buffer.alloc(32)
      try { await handle.read(head, 0, 32, 0) } finally { await handle.close() }
      const documentSignature = declared === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ? head[0] === 80 && head[1] === 75 && head[2] === 3 && head[3] === 4 : !head.subarray(0, Math.min(32, content.bytes)).includes(0)
      const mime = document ? (documentSignature ? declared : null) : declared.startsWith('image/') ? sniffImageMime(head) : declared.startsWith('audio/') ? sniffAudioMime(head) : sniffVideoMime(head)
      if (mime !== declared) throw new MediaError('invalid-file-signature')
      await requireClean(pending)
      if (scanOnly) { json(res, 200, { clean: true }); return }
      let driveId: string | undefined
      if (target === 'drive') driveId = (await drive.upload(pending, { id, name, mime, sha256: content.sha256 })).id
      const asset: StoredAsset = { id, name, kind: mime.startsWith('image/') ? 'image' : mime.startsWith('audio/') ? 'audio' : 'video', mime, size: content.bytes, source: `/api/media/files/${id}`, status: 'ready', provider: 'upload', addedAt: new Date().toISOString(), storage: target, sha256: content.sha256, scan: 'clean', ...(driveId ? { driveId } : {}) }
      await rename(pending, join(files, id))
      save(asset)
      json(res, 201, { asset })
    } finally { activeUploads--; await rm(pending, { force: true }) }
  }
  async function cacheDrive(asset: StoredAsset) {
    if (existsSync(join(files, asset.id))) return
    if (!asset.driveId || !/^[a-zA-Z0-9_-]+$/.test(asset.driveId)) throw new MediaError('media-missing', 404)
    if (downloads.has(asset.id)) return downloads.get(asset.id)
    const download = (async () => {
      const pending = join(quarantine, randomUUID())
      try {
        const response = await drive.request(`files/${asset.driveId}?alt=media`)
        if (!response.body) throw new MediaError('media-missing', 404)
        let bytes = 0
        const hash = createHash('sha256')
        await pipeline(Readable.fromWeb(response.body as never), new Transform({ transform(chunk: Buffer, _encoding, done) {
          bytes += chunk.length; if (bytes > MAX_VIDEO_BYTES) return done(new MediaError('file-too-large', 413))
          hash.update(chunk); done(null, chunk)
        } }), createWriteStream(pending, { flags: 'wx', mode: 0o600 }))
        if (asset.sha256 && hash.digest('hex') !== asset.sha256) throw new MediaError('file-changed', 422)
        await requireClean(pending)
        await rename(pending, join(files, asset.id))
      } finally { await rm(pending, { force: true }) }
    })().finally(() => downloads.delete(asset.id))
    downloads.set(asset.id, download)
    return download
  }
  async function ensureCached(id: string) {
    if (!UUID.test(id)) throw new MediaError('media-missing', 404)
    const existing = find(id)
    if (existing && existsSync(join(files, id))) return
    if (existing?.driveId) return cacheDrive(existing)
    if (!remote) throw new MediaError('media-missing', 404)
    if (downloads.has(id)) return downloads.get(id)
    const operation = (async () => {
      const asset = await remote.lookup(id), pending = join(quarantine, randomUUID()), hash = createHash('sha256'); let bytes = 0
      try {
        await pipeline(Readable.from(remote.download(asset)), new Transform({ transform(chunk: Buffer, _encoding, done) {
          bytes += chunk.length
          if (bytes > asset.size! || bytes > MAX_VIDEO_BYTES) return done(new MediaError('file-too-large', 413))
          hash.update(chunk); done(null, chunk)
        } }), createWriteStream(pending, { flags: 'wx', mode: 0o600 }))
        if (bytes !== asset.size || hash.digest('hex') !== asset.sha256) throw new MediaError('file-changed', 422)
        await requireClean(pending)
        await rename(pending, join(files, id)); save(asset)
      } finally { await rm(pending, { force: true }) }
    })().finally(() => downloads.delete(id))
    downloads.set(id, operation); return operation
  }
  async function serve(req: IncomingMessage, res: ServerResponse, id: string) {
    if (!UUID.test(id)) throw new MediaError('media-missing', 404)
    if (!find(id) && remote) await ensureCached(id)
    const asset = find(id)
    if (!asset) throw new MediaError('media-missing', 404)
    await ensureCached(id)
    const file = join(files, id), size = (await stat(file)).size
    let start = 0, end = size - 1
    if (req.headers.range) {
      const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range)
      if (!range) throw new MediaError('invalid-range', 416)
      if (!range[1]) start = Math.max(0, size - Number(range[2]))
      else { start = Number(range[1]); if (range[2]) end = Math.min(end, Number(range[2])) }
      if (!Number.isSafeInteger(start) || start > end || start >= size) throw new MediaError('invalid-range', 416)
    }
    res.writeHead(req.headers.range ? 206 : 200, { 'Content-Type': asset.mime, 'Content-Length': end - start + 1, 'Accept-Ranges': 'bytes', 'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'same-origin', 'Cache-Control': 'private, max-age=86400', ...(req.headers.range ? { 'Content-Range': `bytes ${start}-${end}/${size}` } : {}) })
    if (req.method === 'HEAD') { res.end(); return }
    await pipeline(createReadStream(file, { start, end }), res)
  }
  const handle: Connect.NextHandleFunction = (req, res, next) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    if (!url.pathname.startsWith('/api/media/')) return next()
    void (async () => {
      const host = req.headers.host ?? '', address = req.socket.remoteAddress
      const callback = url.pathname === '/api/media/drive/callback' && req.method === 'GET'
      if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host) || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address ?? '') ||
        (!callback && ((req.headers.origin && req.headers.origin !== `http://${host}` && req.headers.origin !== `https://${host}`) || req.headers['sec-fetch-site'] === 'cross-site'))) throw new MediaError('forbidden', 403)
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method ?? '') && req.headers['x-cathedral-media'] !== '1') throw new MediaError('forbidden', 403)
      const fileMatch = /^\/api\/media\/files\/([^/]+)$/.exec(url.pathname)
      // Output windows share the installation's scanned media; all writes and library management require sign-in.
      if (fileMatch && (req.method === 'GET' || req.method === 'HEAD')) return serve(req, res, fileMatch[1])
      const session = await authenticate(req)
      if (!session) throw new MediaError('sign-in-required', 401)
      if (await packages(req, res, url.pathname)) return
      if (url.pathname === '/api/media/drive/config' && req.method === 'POST') {
        if (!canManageDrive(session)) throw new MediaError('drive-admin-required', 403)
        let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 2048) throw new MediaError('invalid-config') }
        const configured = JSON.parse(raw)
        drive.configureClient(String(configured.clientId ?? '').trim(), String(configured.clientSecret ?? '').trim())
        return json(res, 200, { configured: true })
      }
      if (url.pathname === '/api/media/status' && req.method === 'GET') {
        if (!health || Date.now() - health.at > 60000) health = { at: Date.now(), ready: await scan(healthFile) === 'clean' }
        return json(res, 200, { local: true, scanner: { ready: health.ready, engine: 'ClamAV', databaseUpdatedAt: engine.databaseUpdatedAt() }, drive: { configured: drive.configured, connected: drive.connected, canManage: canManageDrive(session), redirectUri: drive.redirectUri } })
      }
      if (url.pathname === '/api/media/library' && req.method === 'GET') {
        if (url.searchParams.get('refresh') === 'drive' && drive.connected) {
          for (const entry of await drive.list()) {
            const id = entry.appProperties?.cathedralMediaId
            if (!id || !UUID.test(id) || !extensions[entry.mimeType]) continue
            const previous = find(id)
            save({ id, name: safeDisplayFileName(entry.name), kind: entry.mimeType.startsWith('image/') ? 'image' : entry.mimeType.startsWith('audio/') ? 'audio' : 'video', mime: entry.mimeType, size: Number(entry.size) || 0, source: `/api/media/files/${id}`, status: 'ready', provider: 'upload', addedAt: previous?.addedAt ?? new Date().toISOString(), tags: previous?.tags, storage: 'drive', driveId: entry.id, sha256: entry.appProperties?.sha256, scan: 'clean' })
          }
        }
        const rows = database.prepare('SELECT record FROM assets WHERE deleted=0 ORDER BY rowid DESC LIMIT 2000').all() as { record: string }[]
        return json(res, 200, { assets: rows.map((row) => JSON.parse(row.record)) })
      }
      if (url.pathname === '/api/media/upload' && req.method === 'POST') return upload(req, res)
      if (url.pathname === '/api/media/scan' && req.method === 'POST') return upload(req, res, true)
      if (fileMatch && req.method === 'DELETE') { database.prepare('UPDATE assets SET deleted=1 WHERE id=?').run(fileMatch[1]); return json(res, 200, { ok: true }) }
      if (fileMatch && req.method === 'PATCH') {
        const asset = find(fileMatch[1])
        if (!asset) throw new MediaError('media-missing', 404)
        let text = ''
        for await (const chunk of req) { text += chunk.toString(); if (Buffer.byteLength(text) > 8192) throw new MediaError('metadata-too-large', 413) }
        let changes: { name?: unknown; tags?: unknown }
        try { changes = JSON.parse(text) } catch { throw new MediaError('invalid-metadata') }
        if (!changes || typeof changes !== 'object') throw new MediaError('invalid-metadata')
        const name = changes.name === undefined ? asset.name : sanitizeSingleLine(changes.name, 120).trim()
        if (!name) throw new MediaError('invalid-filename')
        const updated = { ...asset, name, ...(changes.tags === undefined ? {} : { tags: normalizeMediaTags(changes.tags, 30) }) }
        if (asset.driveId && name !== asset.name) await drive.request(`files/${asset.driveId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
        save(updated)
        return json(res, 200, { asset: updated })
      }
      if (url.pathname === '/api/media/drive/connect' && req.method === 'POST') {
        if (!canManageDrive(session)) throw new MediaError('drive-admin-required', 403)
        if (!drive.configured) throw new MediaError('drive-not-configured', 503)
        for (const [key, value] of states) if (value.expires < Date.now()) states.delete(key)
        const state = randomBytes(32).toString('base64url'), verifier = randomBytes(32).toString('base64url')
        states.set(state, { userId: session.user.id, verifier, expires: Date.now() + 600000 })
        res.setHeader('Set-Cookie', `cathedral-drive-state=${state}; HttpOnly; SameSite=Lax; Path=/api/media/drive; Max-Age=600`)
        const query = new URLSearchParams({ client_id: env.GOOGLE_DRIVE_CLIENT_ID!, redirect_uri: drive.redirectUri, response_type: 'code', scope: 'https://www.googleapis.com/auth/drive.file', access_type: 'offline', prompt: 'consent', state, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' })
        return json(res, 200, { url: `https://accounts.google.com/o/oauth2/v2/auth?${query}` })
      }
      if (callback) {
        const state = url.searchParams.get('state') ?? '', pending = states.get(state)
        const cookie = /(?:^|;\s*)cathedral-drive-state=([^;]+)/.exec(req.headers.cookie ?? '')?.[1]
        states.delete(state)
        if (!pending || pending.expires < Date.now() || cookie !== state || pending.userId !== session.user.id || !canManageDrive(session) || !url.searchParams.get('code')) throw new MediaError('drive-auth-failed', 403)
        await drive.connect(url.searchParams.get('code')!, pending.verifier, session.user.id)
        res.writeHead(303, { Location: '/#/media', 'Set-Cookie': 'cathedral-drive-state=; HttpOnly; SameSite=Lax; Path=/api/media/drive; Max-Age=0' }); res.end(); return
      }
      throw new MediaError('not-found', 404)
    })().catch((error) => {
      if (!res.headersSent) json(res, error instanceof MediaError ? error.status : 503, { reason: error instanceof Error && /^(drive-|scanner-|virus-|backup-|invalid-backup|media-missing)/.test(error.message) ? error.message : error instanceof MediaError ? error.message : 'media-service-unavailable' })
      else res.destroy()
    })
  }
  return { handle, ensureCached, async getForSync(id: string) { if (!UUID.test(id)) throw new MediaError('media-missing', 404); await ensureCached(id); const asset = find(id); if (!asset || asset.scan !== 'clean') throw new MediaError('media-missing', 404); return { asset, path: join(files, id) } }, close: () => database.close() }
}

export function mediaLibrary(environment: Record<string, string> = {}): Plugin {
  const install = (server: { config: { root: string; mode: string }; middlewares: { use(handler: Connect.NextHandleFunction): unknown }; httpServer?: { once(event: string, listener: () => void): unknown } | null }) => {
    const library = createMediaLibrary(server.config.root, { ...environment, ...process.env })
    server.middlewares.use(library.handle)
    server.httpServer?.once('close', library.close)
  }
  return { name: 'cathedral-media-library', configureServer: install, configurePreviewServer: install }
}
