import Database from 'better-sqlite3'
import { mkdirSync, statfsSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync, gunzipSync } from 'node:zlib'
import type { Connect, Plugin } from 'vite'

const PATH = '/api/workspace'
const LIMIT = 32 * 1024 * 1024
export function createWorkspace(root: string) {
  const directory = join(root, '.data'); mkdirSync(directory, { recursive: true, mode: 0o700 })
  const db = new Database(join(directory, 'workspace.sqlite')); db.pragma('journal_mode = WAL')
  db.exec('CREATE TABLE IF NOT EXISTS revisions (revision INTEGER PRIMARY KEY AUTOINCREMENT, createdAt TEXT NOT NULL, document BLOB NOT NULL)')
  const read = (revision?: number) => db.prepare(revision ? 'SELECT * FROM revisions WHERE revision=?' : 'SELECT * FROM revisions ORDER BY revision DESC LIMIT 1').get(...(revision ? [revision] : [])) as { revision: number; createdAt: string; document: Buffer } | undefined
  const decode = (row: ReturnType<typeof read>) => row ? { revision: row.revision, createdAt: row.createdAt, document: JSON.parse(gunzipSync(row.document, { maxOutputLength: LIMIT }).toString()) } : { revision: 0, document: null }
  const json = (res: import('node:http').ServerResponse, status: number, body: unknown) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(body)) }
  const handle: Connect.NextHandleFunction = (req, res, next) => {
    if (!req.url?.startsWith(PATH)) return next()
    const host = req.headers.host ?? '', origin = req.headers.origin
    if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host) || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '') || req.headers['sec-fetch-site'] === 'cross-site' || (origin && origin !== `http://${host}` && origin !== `https://${host}`) || req.headers['x-cathedral-workspace'] !== '1') return json(res, 403, { reason: 'forbidden' })
    const pathname = req.url.split('?')[0]
    if (req.method === 'GET') {
      if (pathname === `${PATH}/health`) { const disk = statfsSync(directory); return json(res, 200, { writable: !db.readonly, freeBytes: disk.bavail * disk.bsize }) }
      if (pathname === `${PATH}/history`) return json(res, 200, { revisions: db.prepare('SELECT revision,createdAt FROM revisions ORDER BY revision DESC LIMIT 100').all() })
      const revision = /^\/api\/workspace\/revisions\/(\d+)$/.exec(pathname)
      if (pathname !== PATH && !revision) return json(res, 404, { reason: 'not-found' })
      return json(res, 200, decode(read(revision ? Number(revision[1]) : undefined)))
    }
    if (req.method !== 'PUT' || pathname !== PATH || !req.headers['content-type']?.startsWith('application/json')) return json(res, 405, { reason: 'method' })
    void (async () => {
      const chunks: Buffer[] = []; let bytes = 0
      for await (const chunk of req) { bytes += chunk.length; if (bytes > LIMIT) throw new Error('workspace-too-large'); chunks.push(chunk) }
      const input = JSON.parse(Buffer.concat(chunks).toString())
      const allowed = new Set(['userTemplates', 'services', 'otherChurchServices', 'branding', 'brandingProfiles', 'churchId', 'settings', 'mediaLibrary', 'mediaTags', 'recentPassages', 'recentSongs', 'librarySongs', 'bibleDefaultsVersion', 'customBibles', 'hiddenBibleIds', 'archivedBibleIds', 'deletedBibleIds'])
      const document = input.document && typeof input.document === 'object' ? Object.fromEntries(Object.entries(input.document).filter(([key]) => allowed.has(key))) : null
      if (!Number.isSafeInteger(input.expectedRevision) || !document || typeof document !== 'object' || !Array.isArray(document.services) || !Array.isArray(document.librarySongs) || document.services.length > 1000 || document.librarySongs.length > 5000) throw new Error('invalid-workspace')
      const result = db.transaction(() => {
        const current = read()
        if (input.expectedRevision !== (current?.revision ?? 0)) return null
        const compressed = gzipSync(JSON.stringify(document))
        const inserted = db.prepare('INSERT INTO revisions(createdAt,document) VALUES (?,?)').run(new Date().toISOString(), compressed)
        // Keep bounded recovery history; the current revision is always the newest row.
        db.prepare('DELETE FROM revisions WHERE revision NOT IN (SELECT revision FROM revisions ORDER BY revision DESC LIMIT 100)').run()
        return Number(inserted.lastInsertRowid)
      })()
      json(res, result === null ? 409 : 200, result === null ? { reason: 'workspace-conflict', revision: read()?.revision ?? 0 } : { revision: result })
    })().catch((error) => { if (!res.headersSent) json(res, error instanceof Error && error.message === 'workspace-too-large' ? 413 : 503, { reason: 'workspace-save-failed' }) })
  }
  return {
    handle, readCurrent: () => decode(read()),
    replace(document: unknown, expectedRevision: number) {
      if (!document || typeof document !== 'object' || !Array.isArray((document as { services?: unknown }).services)) throw new Error('invalid-workspace')
      const serialized = JSON.stringify(document); if (Buffer.byteLength(serialized) > LIMIT) throw new Error('workspace-too-large')
      return db.transaction(() => {
        if ((read()?.revision ?? 0) !== expectedRevision) throw new Error('workspace-conflict')
        const result = db.prepare('INSERT INTO revisions(createdAt,document) VALUES (?,?)').run(new Date().toISOString(), gzipSync(serialized))
        db.prepare('DELETE FROM revisions WHERE revision NOT IN (SELECT revision FROM revisions ORDER BY revision DESC LIMIT 100)').run()
        return Number(result.lastInsertRowid)
      })()
    }, close: () => db.close(),
  }
}

export function workspaceStorage(): Plugin {
  const install = (server: { config: { root: string }; middlewares: { use(handler: Connect.NextHandleFunction): unknown }; httpServer?: { once(event: string, callback: () => void): unknown } | null }) => {
    const workspace = createWorkspace(server.config.root)
    server.middlewares.use(workspace.handle); server.httpServer?.once('close', workspace.close)
  }
  return { name: 'cathedral-workspace', configureServer: install, configurePreviewServer: install }
}
