import { randomBytes, randomUUID } from 'node:crypto'
import type { Pool } from 'pg'
import { safeDisplayFileName } from '../../src/security/path'
import { sanitizeSingleLine } from '../../src/security/text'
import { normalizeMediaTags } from '../../src/utils/mediaTags'
import { sniffImageMime, sniffVideoMime, sniffAudioMime } from '../../src/security/media'
import type { MediaAsset } from '../../src/types'
import { transaction } from './database'
import { CloudError, digest, json, readBytes, readJson, type CloudEnvironment } from './http'
import { CHUNK_BYTES, incomingPartKey, partKey, type CloudStorage } from './storage'
import type { CloudDrive } from './drive'
import { issueFileTicket } from './tickets'
import type { FileManifest } from './content'

type StoredMedia = MediaAsset & { sha256: string; scan: 'clean'; driveId: string; cloudUploadId: string }
export interface CloudIdentity { id: string; role: string; installationId?: string }
export interface WorkerIdentity { id: string }
interface UploadJob { id: string; name: string; mime: string; size: string | number; sha256: string; parts: number; kind: string; status: string; attempts: number; result: { mediaId: string; partHashes: string[]; driveSession?: string; scanClean?: boolean; next?: number; checkedAttempt?: number; convertPdf?: boolean } }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const extensions: Record<string, string[]> = { 'image/jpeg': ['jpg','jpeg'], 'image/png': ['png'], 'image/gif': ['gif'], 'image/webp': ['webp'], 'video/mp4': ['mp4','m4v'], 'video/webm': ['webm'], 'video/quicktime': ['mov'], 'audio/mpeg': ['mp3'], 'audio/wav': ['wav'], 'audio/ogg': ['ogg'], 'audio/flac': ['flac'], 'audio/mp4': ['m4a'] }
const documents: Record<string, string[]> = { 'application/pdf': ['pdf'], 'application/json': ['json'], 'application/xml': ['xml'], 'text/plain': ['txt','md'], 'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pptx'] }
export function createCloudMedia(pool: Pool, env: CloudEnvironment, storage: CloudStorage, drive: CloudDrive) {
  const scannerStatus = async () => {
    const row = (await pool.query("SELECT value FROM cp_settings WHERE key LIKE 'worker:%' AND updated_at>now()-interval '90 seconds' AND value->'ready'='true'::jsonb ORDER BY updated_at DESC LIMIT 1")).rows[0]
    return { ready: Boolean(row), engine: 'ClamAV', databaseUpdatedAt: row?.value.databaseUpdatedAt ?? null }
  }
  const workerJob = async (req: Request, id: string, worker: WorkerIdentity) => {
    const lease = req.headers.get('x-cathedral-job-lease')
    if (!lease || !UUID.test(id)) throw new CloudError('invalid-job-lease', 403)
    const job = (await pool.query("UPDATE cp_uploads SET lease_until=now()+interval '3 minutes' WHERE id=$1 AND lease_worker=$2 AND lease_token=$3 AND lease_until>now() AND status IN ('processing','publishing') RETURNING *", [id, worker.id, digest(lease)])).rows[0]
    if (!job) throw new CloudError('invalid-job-lease', 403)
    return job
  }
  const cleanup = async () => {
    const job = (await pool.query("SELECT id,kind,result FROM cp_uploads WHERE (status='failed' OR (kind='scan' AND status='done' AND updated_at<now()-interval '1 day')) AND coalesce(result->>'cleanupDone','false')<>'true' ORDER BY updated_at LIMIT 1")).rows[0]
    if (!job) return
    const parts = (await pool.query('SELECT part,sha256 FROM cp_upload_parts WHERE upload_id=$1 ORDER BY part', [job.id])).rows
    const keys = parts.map((p) => job.kind === 'workspace' ? partKey(job.id,p.part) : incomingPartKey(job.id,p.part,p.sha256))
    const converted = job.result?.conversion
    if (converted?.id && Array.isArray(converted.partHashes)) converted.partHashes.forEach((hash: string,index: number) => { if (typeof hash === 'string') keys.push(incomingPartKey(converted.id,index,hash)) })
    const offset = Number(job.result?.cleanupPart || 0), next = Math.min(keys.length,offset+8)
    await Promise.all(keys.slice(offset,next).map((key) => storage.delete(key)))
    await pool.query('UPDATE cp_uploads SET result=result||$2::jsonb WHERE id=$1',[job.id,JSON.stringify({cleanupPart:next,cleanupDone:next===keys.length})])
    if(next===keys.length)await pool.query('DELETE FROM cp_upload_parts WHERE upload_id=$1',[job.id])
  }
  const publish = async (job: UploadJob, driveId: string) => {
    const mediaId = job.result?.mediaId || job.id
    if (!UUID.test(mediaId) || !UUID.test(job.id)) throw new CloudError('invalid-media')
    const asset: StoredMedia = { id: mediaId, name: job.name, kind: job.mime.startsWith('image/') ? 'image' : job.mime.startsWith('audio/') ? 'audio' : 'video', mime: job.mime, size: Number(job.size), source: `/api/media/files/${mediaId}`, provider: 'upload', status: 'ready', storage: 'drive', scan: 'clean', sha256: job.sha256, driveId, cloudUploadId: job.id, addedAt: new Date().toISOString(), tags: [] }
    const manifest: FileManifest = { id: mediaId, uploadId: job.id, size: asset.size, mime: asset.mime, parts: job.parts, partHashes: job.result.partHashes, sha256: job.sha256 }
    await storage.set(`assets/${job.id}/manifest`, Buffer.from(JSON.stringify(manifest)))
    await transaction(pool, async (client) => {
      const result = await client.query("INSERT INTO cp_media(id,record) VALUES($1,$2::jsonb) ON CONFLICT(id) DO UPDATE SET record=excluded.record WHERE cp_media.record->>'sha256'=excluded.record->>'sha256' RETURNING id", [mediaId, JSON.stringify(asset)])
      if (!result.rowCount) throw new CloudError('media-id-conflict', 409)
      await client.query("UPDATE cp_uploads SET status='done',result=$2::jsonb,lease_token=NULL,lease_until=NULL,updated_at=now() WHERE id=$1", [job.id, JSON.stringify({ asset })])
    })
    return asset
  }
  return {
    scannerStatus,
    async handle(req: Request, user: CloudIdentity) {
      const url = new URL(req.url), path = url.pathname
      if (path === '/api/media/status' && req.method === 'GET') return json({ local: false, scanner: await scannerStatus(), drive: { ...await drive.status(), canManage: user.role === 'admin' } })
      if (path.startsWith('/api/media/drive/')) return drive.handle(req, user)
      if (path === '/api/media/library' && req.method === 'GET') {
        if (url.searchParams.get('refresh') === 'drive') {
          // Refresh only previously scanned objects. Files dropped directly in Drive cannot bypass quarantine.
          for (const file of await drive.list()) {
            const id = file.appProperties?.cathedralMediaId
            if (!id || !UUID.test(id)) continue
            await pool.query("UPDATE cp_media SET record=jsonb_set(record,'{name}',to_jsonb($2::text)) WHERE id=$1 AND deleted=false AND record->>'driveId'=$3 AND record->>'sha256'=$4", [id, safeDisplayFileName(file.name), file.id, file.appProperties?.sha256 ?? ''])
          }
        }
        const assets = (await pool.query('SELECT record FROM cp_media WHERE deleted=false ORDER BY created_at DESC LIMIT 2000')).rows.map((r) => r.record)
        return json({ assets })
      }
      if (path === '/api/media/uploads' && req.method === 'GET') return json({ uploads: (await pool.query("SELECT id,name,status,result->>'reason' AS reason,created_at FROM cp_uploads WHERE kind IN ('media','scan') AND owner_id=$1 AND status NOT IN ('done') ORDER BY created_at DESC LIMIT 50", [user.id])).rows })
      if (path === '/api/media/uploads' && req.method === 'POST') {
        const body = await readJson(req, 4096), name = safeDisplayFileName(String(body.name ?? '')), mime = String(body.mime), size = Number(body.size), hash = String(body.sha256), scanOnly = body.scanOnly === true
        const accepted = extensions[mime] ?? (scanOnly ? documents[mime] : undefined)
        if (!accepted?.includes(name.split('.').pop()?.toLowerCase() ?? '') || !Number.isSafeInteger(size) || size < 1 || size > (mime.startsWith('image/') ? 12 : scanOnly ? 50 : 300) * 1024 * 1024 || !/^[a-f0-9]{64}$/.test(hash)) throw new CloudError('unsupported-type')
        const convertPdf = scanOnly && body.convertPdf === true && mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        if (convertPdf && !(await pool.query("SELECT key FROM cp_settings WHERE key LIKE 'worker:%' AND updated_at>now()-interval '90 seconds' AND value->'converter'='true'::jsonb LIMIT 1")).rowCount) throw new CloudError('conversion-unavailable', 503)
        if (!(await scannerStatus()).ready) throw new CloudError('scanner-unavailable', 503)
        if (!scanOnly && !(await drive.status()).connected) throw new CloudError('drive-not-connected', 409)
        const preferredId = user.installationId && UUID.test(String(body.mediaId)) ? String(body.mediaId) : undefined
        if (preferredId) {
          const existing = (await pool.query('SELECT record FROM cp_media WHERE id=$1 AND deleted=false', [preferredId])).rows[0]
          if (existing) { if (existing.record.sha256 === hash) return json({ asset: existing.record }); throw new CloudError('media-id-conflict', 409) }
        }
        const id = randomUUID(), parts = Math.ceil(size / CHUNK_BYTES)
        await transaction(pool,async(client)=>{
          await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[user.id])
          const pending = (await client.query("SELECT count(*) AS count,coalesce(sum(size),0) AS bytes FROM cp_uploads WHERE owner_id=$1 AND status NOT IN ('done','failed')", [user.id])).rows[0]
          if (Number(pending.count) >= 10 || Number(pending.bytes) + size > 1024 ** 3) throw new CloudError('upload-busy', 429)
          await client.query('INSERT INTO cp_uploads(id,kind,owner_id,name,mime,size,sha256,parts,storage,result) VALUES($1,$2,$3,$4,$5,$6,$7,$8,\'drive\',$9::jsonb)', [id, scanOnly ? 'scan' : 'media', user.id, name, mime, size, hash, parts, JSON.stringify({ mediaId: preferredId ?? id, convertPdf })])
        })
        return json({ id, parts, chunkBytes: CHUNK_BYTES }, 201)
      }
      const uploadPath = /^\/api\/media\/uploads\/([0-9a-f-]{36})(?:\/(\d+|complete))?$/.exec(path)
      if (uploadPath) {
        const job = (await pool.query('SELECT * FROM cp_uploads WHERE id=$1 AND owner_id=$2 AND kind IN (\'media\',\'scan\')', [uploadPath[1], user.id])).rows[0]
        if (!job) throw new CloudError('not-found', 404)
        if (req.method === 'GET' && !uploadPath[2]) return json({ id: job.id, status: job.status, progress: Math.round(Number(job.result?.next || 0) / Number(job.size) * 100), reason: job.result?.reason, asset: job.status === 'done' ? job.result?.asset : undefined, clean: job.status === 'done' && job.kind === 'scan', conversion: job.status === 'done' ? job.result?.conversion : undefined })
        if (job.status !== 'uploading') throw new CloudError('upload-sealed', 409)
        if (req.method === 'PUT' && /^\d+$/.test(uploadPath[2] ?? '')) {
          const part = Number(uploadPath[2]), bytes = await readBytes(req, CHUNK_BYTES)
          if (part >= job.parts || bytes.length !== Math.min(CHUNK_BYTES, Number(job.size) - part * CHUNK_BYTES)) throw new CloudError('invalid-part')
          const hash = digest(bytes)
          // Content-addressed chunks prevent late upload requests replacing bytes after the antivirus scan.
          await storage.set(incomingPartKey(job.id, part, hash), bytes)
          await transaction(pool, async (client) => {
            const current = (await client.query('SELECT status FROM cp_uploads WHERE id=$1 FOR UPDATE', [job.id])).rows[0]
            if (current.status !== 'uploading') throw new CloudError('upload-sealed', 409)
            await client.query('INSERT INTO cp_upload_parts(upload_id,part,size,sha256) VALUES($1,$2,$3,$4) ON CONFLICT(upload_id,part) DO UPDATE SET size=excluded.size,sha256=excluded.sha256', [job.id, part, bytes.length, hash])
          })
          return json({ stored: true })
        }
        if (req.method === 'POST' && uploadPath[2] === 'complete') {
          const hashes = await transaction(pool, async (client) => {
            const current = (await client.query('SELECT status FROM cp_uploads WHERE id=$1 FOR UPDATE', [job.id])).rows[0]
            if (current.status !== 'uploading') throw new CloudError('upload-sealed', 409)
            const rows = (await client.query('SELECT part,sha256 FROM cp_upload_parts WHERE upload_id=$1 ORDER BY part', [job.id])).rows
            if (rows.length !== job.parts || rows.some((r, i) => r.part !== i)) throw new CloudError('parts-missing', 409)
            const hashes = rows.map((r) => r.sha256 as string)
            await client.query("UPDATE cp_uploads SET status='sealing',result=result||$2::jsonb WHERE id=$1", [job.id, JSON.stringify({ partHashes: hashes })])
            return hashes
          })
          const first = await storage.get(incomingPartKey(job.id, 0, hashes[0])); if (!first) throw new CloudError('parts-missing', 409)
          const detected = sniffImageMime(first) ?? sniffAudioMime(first) ?? sniffVideoMime(first)
          const isDocument = job.kind === 'scan' && documents[job.mime]
          if (!isDocument && detected !== job.mime) { await pool.query("UPDATE cp_uploads SET status='failed',result=result||'{\"reason\":\"invalid-file-signature\"}'::jsonb WHERE id=$1", [job.id]); throw new CloudError('invalid-file-signature') }
          await pool.query("UPDATE cp_uploads SET status='queued',updated_at=now() WHERE id=$1 AND status='sealing'", [job.id])
          return json({ id: job.id, status: 'queued' }, 202)
        }
      }
      const converted = /^\/api\/media\/uploads\/([0-9a-f-]{36})\/conversion\/(\d+)$/.exec(path)
      if (converted && req.method === 'GET') {
        const job = (await pool.query("SELECT result FROM cp_uploads WHERE id=$1 AND owner_id=$2 AND kind='scan' AND status='done' AND updated_at>now()-interval '1 day'", [converted[1],user.id])).rows[0]
        const output = job?.result?.conversion, part = Number(converted[2])
        if (!output || part>=output.parts) throw new CloudError('not-found',404)
        const bytes = await storage.get(incomingPartKey(output.id,part,output.partHashes[part]));if(!bytes)throw new CloudError('not-found',404)
        return new Response(bytes as Uint8Array<ArrayBuffer>,{headers:{'Content-Type':'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})
      }
      const file = /^\/api\/media\/files\/([0-9a-f-]{36})$/.exec(path)
      if (file) {
        const asset = (await pool.query('SELECT record FROM cp_media WHERE id=$1 AND deleted=false', [file[1]])).rows[0]?.record as StoredMedia | undefined
        if (!asset) throw new CloudError('media-missing', 404)
        if (['GET', 'HEAD'].includes(req.method)) {
          if (url.searchParams.get('metadata') === '1') return json({ asset })
          const ticket = await issueFileTicket(env.CATHEDRAL_ENCRYPTION_KEY ?? '', { id: asset.id, key: `assets/${asset.cloudUploadId}/manifest`, expires: Date.now() + 5 * 60 * 1000 })
          return new Response(null, { status: 307, headers: { Location: `/protected/media/${asset.id}?ticket=${ticket}`, 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } })
        }
        if (req.method === 'DELETE') { await pool.query('UPDATE cp_media SET deleted=true WHERE id=$1', [asset.id]); return json({ removed: true }) }
        if (req.method === 'PATCH') {
          const body = await readJson(req, 8192), name = body.name === undefined ? asset.name : sanitizeSingleLine(body.name, 120).trim()
          if (!name) throw new CloudError('invalid-filename')
          if (name !== asset.name) await drive.rename(asset.driveId, name)
          const updated = { ...asset, name, tags: body.tags === undefined ? asset.tags : normalizeMediaTags(body.tags, 30) }
          await pool.query('UPDATE cp_media SET record=$2::jsonb WHERE id=$1', [asset.id, JSON.stringify(updated)]); return json({ asset: updated })
        }
      }
      throw new CloudError('not-found', 404)
    },
    async worker(req: Request, worker: WorkerIdentity) {
      const path = new URL(req.url).pathname
      if (path === '/api/worker/claim' && req.method === 'POST') {
        const body = await readJson(req, 2048)
        await pool.query('INSERT INTO cp_settings(key,value) VALUES($1,$2::jsonb) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=now()', [`worker:${worker.id}`, JSON.stringify({ ready: body.ready === true, converter: body.converter === true, databaseUpdatedAt: typeof body.databaseUpdatedAt === 'string' ? body.databaseUpdatedAt.slice(0, 40) : null })])
        if (body.ready !== true) return json({ job: null })
        await pool.query("UPDATE cp_uploads SET status='failed',result=result||'{\"reason\":\"upload-expired\"}'::jsonb WHERE (status IN ('uploading','sealing') AND created_at<now()-interval '1 day') OR (status IN ('processing','publishing') AND lease_until<now() AND attempts>=5)")
        await cleanup()
        const lease = randomBytes(32).toString('base64url')
        const job = await transaction(pool, async (client) => {
          const row = (await client.query("SELECT * FROM cp_uploads WHERE kind IN ('media','scan') AND attempts<5 AND (status='queued' OR (status IN ('processing','publishing') AND lease_until<now())) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1")).rows[0]
          if (!row) return null
          await client.query("UPDATE cp_uploads SET status=CASE WHEN status='publishing' THEN status ELSE 'processing' END,lease_token=$2,lease_worker=$3,lease_until=now()+interval '3 minutes',attempts=attempts+1 WHERE id=$1", [row.id, digest(lease), worker.id])
          return { id: row.id, name: row.name, mime: row.mime, size: Number(row.size), sha256: row.sha256, parts: row.parts, scanOnly: row.kind === 'scan', convertPdf: row.result?.convertPdf === true, publishing: row.status === 'publishing' }
        })
        return json({ job: job ? { ...job, lease, chunkBytes: CHUNK_BYTES } : null })
      }
      const conversion = /^\/api\/worker\/jobs\/([0-9a-f-]{36})\/conversion(?:\/(\d+|complete))?$/.exec(path)
      if(conversion){
        const job=await workerJob(req,conversion[1],worker)
        if(!job.result?.convertPdf || !job.result.scanClean)throw new CloudError('scan-required',409)
        let output=job.result.conversion
        if(!conversion[2]&&req.method==='POST'){
          const body=await readJson(req,1024),size=Number(body.size),hash=String(body.sha256)
          if(!Number.isSafeInteger(size)||size<5||size>50*1024*1024||!/^[a-f0-9]{64}$/.test(hash))throw new CloudError('invalid-document')
          output={id:randomUUID(),size,sha256:hash,parts:Math.ceil(size/CHUNK_BYTES),partHashes:[]}
          await pool.query('UPDATE cp_uploads SET result=result||$2::jsonb WHERE id=$1',[job.id,JSON.stringify({conversion:output})]);return json(output)
        }
        if(!output)throw new CloudError('parts-missing',409)
        if(req.method==='PUT'&&/^\d+$/.test(conversion[2]||'')){
          const part=Number(conversion[2]),bytes=await readBytes(req,CHUNK_BYTES)
          if(part>=output.parts||bytes.length!==Math.min(CHUNK_BYTES,output.size-part*CHUNK_BYTES))throw new CloudError('invalid-part')
          if(part===0&&Buffer.from(bytes.subarray(0,5)).toString()!=='%PDF-')throw new CloudError('invalid-document')
          const hash=digest(bytes);await storage.set(incomingPartKey(output.id,part,hash),bytes);output.partHashes[part]=hash
          await pool.query('UPDATE cp_uploads SET result=result||$2::jsonb WHERE id=$1',[job.id,JSON.stringify({conversion:output})]);return json({stored:true})
        }
        if(req.method==='POST'&&conversion[2]==='complete'){
          if(output.partHashes.length!==output.parts||output.partHashes.some((h:unknown)=>typeof h!=='string'))throw new CloudError('parts-missing',409)
          await pool.query("UPDATE cp_uploads SET status='done',result=result||'{\"clean\":true}'::jsonb,lease_token=NULL,updated_at=now() WHERE id=$1",[job.id])
          for(let i=0;i<job.parts;i++)await storage.delete(incomingPartKey(job.id,i,job.result.partHashes[i])).catch(()=>{})
          return json({done:true})
        }
        throw new CloudError('method-not-allowed',405)
      }
      const target = /^\/api\/worker\/jobs\/([0-9a-f-]{36})\/(?:parts\/(\d+)|(verdict|publish|error|heartbeat))$/.exec(path)
      if (!target) throw new CloudError('not-found', 404)
      const job = await workerJob(req, target[1], worker)
      if (target[2] !== undefined && req.method === 'GET') {
        const part = Number(target[2]); if (part >= job.parts) throw new CloudError('not-found', 404)
        const bytes = await storage.get(incomingPartKey(job.id, part, job.result.partHashes[part])); if (!bytes) throw new CloudError('parts-missing', 409)
        return new Response(bytes as Uint8Array<ArrayBuffer>, { headers: { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'no-store' } })
      }
      if (req.method !== 'POST') throw new CloudError('method-not-allowed', 405)
      const body = await readJson(req, 2048)
      if(target[3]==='heartbeat')return json({active:true})
      if (target[3] === 'error') {
        const reason=['conversion-unavailable','conversion-failed','external-media-not-supported','document-too-large','virus-detected'].includes(String(body.reason))?String(body.reason):'scanner-unavailable'
        await pool.query("UPDATE cp_uploads SET status='failed',result=result||jsonb_build_object('reason',$2::text),lease_token=NULL WHERE id=$1", [job.id,reason]); return json({ recorded: true })
      }
      if (target[3] === 'verdict') {
        if (body.verdict !== 'clean') {
          const reason = body.verdict === 'infected' ? 'virus-detected' : 'scanner-unavailable'
          await pool.query("UPDATE cp_uploads SET status='failed',result=result||jsonb_build_object('reason',$2::text),lease_token=NULL WHERE id=$1", [job.id, reason])
          for (let i = 0; i < job.parts; i++) await storage.delete(incomingPartKey(job.id, i, job.result.partHashes[i])).catch(() => {})
          return json({ blocked: true, reason })
        }
        if (body.sha256 !== job.sha256 || Number(body.size) !== Number(job.size)) throw new CloudError('file-changed', 422)
        if(job.kind==='scan'&&job.result?.convertPdf){await pool.query("UPDATE cp_uploads SET result=result||'{\"scanClean\":true}'::jsonb WHERE id=$1",[job.id]);return json({conversion:true})}
        if (job.kind === 'scan') { await pool.query("UPDATE cp_uploads SET status='done',result='{\"clean\":true}'::jsonb,lease_token=NULL WHERE id=$1", [job.id]); for (let i = 0; i < job.parts; i++) await storage.delete(incomingPartKey(job.id, i, job.result.partHashes[i])).catch(() => {}); return json({ done: true }) }
        await pool.query("UPDATE cp_uploads SET status='publishing',result=result||'{\"scanClean\":true}'::jsonb WHERE id=$1", [job.id]); return json({ publishing: true })
      }
      if (target[3] === 'publish') {
        if (job.status !== 'publishing' || !job.result?.scanClean) throw new CloudError('scan-required', 409)
        let result = job.result
        if (job.attempts > 1 && result.checkedAttempt !== job.attempts) {
          const completed = await drive.findUploaded(result.mediaId, job.sha256)
          if (completed) return json({ done: true, asset: await publish(job, completed) })
          result = { ...result, checkedAttempt: job.attempts }
          await pool.query('UPDATE cp_uploads SET result=$2::jsonb WHERE id=$1', [job.id, JSON.stringify(result)])
        }
        if (!result.driveSession) {
          const driveSession = await drive.startUpload({ id: result.mediaId, name: job.name, mime: job.mime, size: Number(job.size), sha256: job.sha256 })
          result = { ...result, driveSession, next: 0 }
          await pool.query('UPDATE cp_uploads SET result=$2::jsonb WHERE id=$1', [job.id, JSON.stringify(result)])
        }
        const offset = Number(result.next || 0), part = Math.floor(offset / CHUNK_BYTES), bytes = await storage.get(incomingPartKey(job.id, part, job.result.partHashes[part]))
        if (!bytes) throw new CloudError('parts-missing', 409)
        const uploaded = await drive.uploadPart(result.driveSession, bytes, offset, Number(job.size))
        if (uploaded.done && uploaded.id) return json({ done: true, asset: await publish(job, uploaded.id) })
        if (uploaded.next <= offset || uploaded.next > Number(job.size) || uploaded.next % CHUNK_BYTES !== 0) throw new CloudError('drive-upload-failed', 503)
        await pool.query('UPDATE cp_uploads SET result=$2::jsonb WHERE id=$1', [job.id, JSON.stringify({ ...result, next: uploaded.next })])
        return json({ done: false, next: uploaded.next, size: Number(job.size) })
      }
      throw new CloudError('not-found', 404)
    },
  }
}
