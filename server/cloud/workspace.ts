import { randomUUID } from 'node:crypto'
import type { Pool } from 'pg'
import { transaction } from './database'
import { CloudError, digest, json, readBytes, readJson } from './http'
import { CHUNK_BYTES, partKey, type CloudStorage } from './storage'

const LIMIT = 32 * 1024 * 1024
const ALLOWED = new Set(['userTemplates', 'services', 'otherChurchServices', 'branding', 'brandingProfiles', 'churchId', 'settings', 'mediaLibrary', 'mediaTags', 'recentPassages', 'recentSongs', 'librarySongs', 'bibleDefaultsVersion', 'customBibles', 'hiddenBibleIds', 'archivedBibleIds', 'deletedBibleIds'])
export function validateWorkspace(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new CloudError('invalid-workspace')
  const source = input as Record<string, unknown>
  if (!Array.isArray(source.services) || source.services.length > 1000 || !Array.isArray(source.librarySongs) || source.librarySongs.length > 5000) throw new CloudError('invalid-workspace')
  const root = Object.fromEntries(Object.entries(source).filter(([key]) => ALLOWED.has(key)))
  const pending: { value: unknown; depth: number }[] = [{ value: root, depth: 0 }]; let nodes = 0
  while (pending.length) {
    const { value, depth } = pending.pop()!
    if (++nodes > 1000000 || depth > 30) throw new CloudError('invalid-workspace')
    if (!value || typeof value !== 'object') continue
    if (Array.isArray(value)) { for (const v of value) pending.push({ value: v, depth: depth + 1 }); continue }
    for (const [key, v] of Object.entries(value)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key) || /(token|secret|password|credential|authorization|api[_-]?key)/i.test(key)) { delete (value as Record<string, unknown>)[key]; continue }
      pending.push({ value: v, depth: depth + 1 })
    }
  }
  return root
}
export function createCloudWorkspace(pool: Pool, storage: CloudStorage) {
  const metadata = async (revision?: number) => {
    const result = revision
      ? await pool.query('SELECT revision,object_key,created_at AS updated_at FROM cp_workspace_history WHERE revision=$1', [revision])
      : await pool.query('SELECT revision,object_key,updated_at FROM cp_workspace WHERE id=1')
    if (!result.rows[0]) throw new CloudError('workspace-missing', 404)
    const row = result.rows[0]
    if (!row.object_key) return { revision: 0, document: null }
    const upload = await pool.query('SELECT parts,size,sha256 FROM cp_uploads WHERE id=$1 AND kind=\'workspace\' AND status=\'done\'', [row.object_key])
    if (!upload.rowCount) throw new CloudError('workspace-missing', 503)
    return { revision: Number(row.revision), createdAt: row.updated_at, document: null, documentParts: { id: row.object_key, count: upload.rows[0].parts, size: Number(upload.rows[0].size), sha256: upload.rows[0].sha256 } }
  }
  const commit = async (raw: Uint8Array, expected: number, userId: string, uploadId?: string) => {
    if (raw.byteLength > LIMIT || !Number.isSafeInteger(expected) || expected < 0) throw new CloudError('invalid-workspace')
    let input: unknown
    try { input = JSON.parse(Buffer.from(raw).toString()) } catch { throw new CloudError('invalid-workspace') }
    const document = validateWorkspace(input), bytes = Buffer.from(JSON.stringify(document)), id = randomUUID()
    // Store immutable bytes before exposing the new revision. A conflict never changes the current row.
    const parts = Math.ceil(bytes.length / CHUNK_BYTES)
    for (let i = 0; i < parts; i++) await storage.set(partKey(id, i), bytes.subarray(i * CHUNK_BYTES, (i + 1) * CHUNK_BYTES))
    const result = await transaction(pool, async (client) => {
      const current = (await client.query('SELECT revision FROM cp_workspace WHERE id=1 FOR UPDATE')).rows[0]
      if (Number(current.revision) !== expected) throw new CloudError('workspace-conflict', 409)
      const revision = expected + 1
      await client.query(`INSERT INTO cp_uploads(id,kind,owner_id,name,mime,size,sha256,parts,status) VALUES($1,'workspace',$2,'workspace.json','application/json',$3,$4,$5,'done') ON CONFLICT(id) DO UPDATE SET status='done',size=excluded.size,sha256=excluded.sha256,parts=excluded.parts,updated_at=now()`, [id, userId, bytes.length, digest(bytes), parts])
      await client.query('UPDATE cp_workspace SET revision=$1,document=$2::jsonb,object_key=$3,updated_at=now() WHERE id=1', [revision, JSON.stringify(document), id])
      await client.query('INSERT INTO cp_workspace_history(revision,document,object_key,created_by) VALUES($1,$2::jsonb,$3,$4)', [revision, JSON.stringify(document), id, userId])
      if (uploadId) await client.query("UPDATE cp_uploads SET status='done' WHERE id=$1", [uploadId])
      const removed = await client.query('DELETE FROM cp_workspace_history WHERE revision NOT IN (SELECT revision FROM cp_workspace_history ORDER BY revision DESC LIMIT 100) RETURNING object_key')
      return { revision, removed: removed.rows.map((r) => r.object_key as string) }
    }).catch(async (error) => { await Promise.allSettled(Array.from({ length: parts }, (_, i) => storage.delete(partKey(id, i)))); throw error })
    for (const oldId of result.removed) {
      const old = await pool.query('DELETE FROM cp_uploads WHERE id=$1 RETURNING parts', [oldId]).catch(() => ({ rowCount: 0, rows: [] }))
      if (old.rowCount) for (let i = 0; i < old.rows[0].parts; i++) await storage.delete(partKey(oldId, i)).catch(() => {})
    }
    return { revision: result.revision }
  }
  return {
    metadata, commit,
    async handle(req: Request, userId: string) {
      const url = new URL(req.url), path = url.pathname
      if (req.method === 'GET') {
        if (path === '/api/workspace/health') return json({ writable: true, freeBytes: null, mode: 'cloud' })
        if (path === '/api/workspace/history') return json({ revisions: (await pool.query('SELECT revision,created_at AS "createdAt" FROM cp_workspace_history ORDER BY revision DESC LIMIT 100')).rows.map((r) => ({ ...r, revision: Number(r.revision) })) })
        const content = /^\/api\/workspace\/content\/([0-9a-f-]{36})\/(\d+)$/.exec(path)
        if (content) {
          const result = await pool.query('SELECT parts FROM cp_uploads WHERE id=$1::uuid AND kind=\'workspace\' AND status=\'done\' AND EXISTS(SELECT 1 FROM cp_workspace_history WHERE object_key=$1::text)', [content[1]])
          if (!result.rowCount || Number(content[2]) >= result.rows[0].parts) throw new CloudError('workspace-missing', 404)
          const bytes = await storage.get(partKey(content[1], Number(content[2])))
          if (!bytes) throw new CloudError('workspace-missing', 404)
          return new Response(bytes as Uint8Array<ArrayBuffer>, { headers: { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } })
        }
        const revision = /^\/api\/workspace\/revisions\/(\d+)$/.exec(path)
        if (path === '/api/workspace' || revision) {
          const data = await metadata(revision ? Number(revision[1]) : undefined)
          if (!revision && url.searchParams.get('revision') === String(data.revision)) return json({ revision: data.revision, unchanged: true, document: null })
          return json(data)
        }
      }
      if (path === '/api/workspace' && req.method === 'PUT') {
        const body = await readJson(req)
        return json(await commit(Buffer.from(JSON.stringify(body.document)), Number(body.expectedRevision), userId))
      }
      if (path === '/api/workspace/uploads' && req.method === 'POST') {
        const body = await readJson(req, 1024), size = Number(body.size), hash = String(body.sha256)
        if (!Number.isSafeInteger(size) || size < 1 || size > LIMIT || !/^[a-f0-9]{64}$/.test(hash)) throw new CloudError('invalid-workspace')
        const id = randomUUID(), parts = Math.ceil(size / CHUNK_BYTES)
        await pool.query(`INSERT INTO cp_uploads(id,kind,owner_id,name,mime,size,sha256,parts) VALUES($1,'workspace',$2,'workspace.json','application/json',$3,$4,$5)`, [id, userId, size, hash, parts])
        return json({ id, parts, chunkBytes: CHUNK_BYTES }, 201)
      }
      const pending = /^\/api\/workspace\/uploads\/([0-9a-f-]{36})(?:\/(\d+))?$/.exec(path)
      if (pending) {
        const upload = (await pool.query('SELECT * FROM cp_uploads WHERE id=$1 AND kind=\'workspace\' AND owner_id=$2 AND status=\'uploading\' AND created_at>now()-interval \'1 hour\'', [pending[1], userId])).rows[0]
        if (!upload) throw new CloudError('workspace-missing', 404)
        if (pending[2] !== undefined && req.method === 'PUT') {
          const part = Number(pending[2]), bytes = await readBytes(req, CHUNK_BYTES)
          const expectedSize = Math.min(CHUNK_BYTES, Number(upload.size) - part * CHUNK_BYTES)
          if (!Number.isSafeInteger(part) || part < 0 || part >= upload.parts || bytes.length !== expectedSize) throw new CloudError('invalid-part')
          await storage.set(partKey(upload.id, part), bytes)
          await pool.query('INSERT INTO cp_upload_parts(upload_id,part,size,sha256) VALUES($1,$2,$3,$4) ON CONFLICT(upload_id,part) DO UPDATE SET size=excluded.size,sha256=excluded.sha256', [upload.id, part, bytes.length, digest(bytes)])
          return json({ stored: true })
        }
        if (!pending[2] && req.method === 'POST') {
          const body = await readJson(req, 1024), rows = (await pool.query('SELECT part FROM cp_upload_parts WHERE upload_id=$1', [upload.id])).rows
          if (rows.length !== upload.parts) throw new CloudError('parts-missing', 409)
          const chunks: Uint8Array[] = []
          for (let i = 0; i < upload.parts; i++) { const part = await storage.get(partKey(upload.id, i)); if (!part) throw new CloudError('parts-missing', 409); chunks.push(part) }
          const bytes = Buffer.concat(chunks)
          if (bytes.length !== Number(upload.size) || digest(bytes) !== upload.sha256) throw new CloudError('file-changed', 422)
          return json(await commit(bytes, Number(body.expectedRevision), userId, upload.id))
        }
      }
      throw new CloudError('not-found', 404)
    },
  }
}
