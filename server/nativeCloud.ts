import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import type { Connect } from 'vite'
import { cloudEncryption } from './cloud/crypto'
import { createCloudWorker } from './cloudWorker'
import type { createOutputRelay } from './outputRelay'
import type { createWorkspace } from './workspace'
import type { MediaAsset } from '../src/types'
import type { OutputSnapshot } from '../src/providers/output/OutputProvider'

const DEFAULT_ORIGIN = 'https://cathedral-presenter-algarve.netlify.app'
type Link = { token: string; id: string; name: string; canScan: boolean; expiresAt: string; origin: string }
export type RemoteAsset = MediaAsset & { sha256: string; storage: 'drive'; scan: 'clean' }
export interface RemoteMedia { lookup(id: string): Promise<RemoteAsset>; download(asset: RemoteAsset): AsyncIterable<Uint8Array> }
interface Options { root: string; environment: Record<string,string|undefined>; relay: ReturnType<typeof createOutputRelay>; workspace: ReturnType<typeof createWorkspace>; request?: typeof fetch; allowLocalTests?: boolean; autoStart?: boolean }

/** The installed computer initiates all cloud connections. No listening LAN port or remote IPC is exposed. */
export function createNativeCloud(options: Options) {
  const { root, environment, relay, workspace } = options, request = options.request ?? fetch
  const origin = new URL(environment.CATHEDRAL_CLOUD_ORIGIN || DEFAULT_ORIGIN)
  if (origin.username || origin.password || origin.pathname !== '/' || (origin.protocol !== 'https:' && !(options.allowLocalTests && origin.protocol === 'http:' && ['127.0.0.1','localhost'].includes(origin.hostname)))) throw new Error('invalid-cloud-origin')
  const directory = join(root, '.data', 'cloud-link'); mkdirSync(directory, { recursive: true, mode: 0o700 })
  const keyFile = join(directory, 'key'), credentials = join(directory, 'credentials')
  if (!existsSync(keyFile)) writeFileSync(keyFile, randomBytes(32).toString('hex'), { flag: 'wx', mode: 0o600 })
  const cipher = cloudEncryption({ CATHEDRAL_ENCRYPTION_KEY: readFileSync(keyFile, 'utf8') })
  let link: Link | undefined
  try { const saved = cipher.decrypt<Link>(readFileSync(credentials, 'utf8')); if (saved.origin === origin.origin && Date.parse(saved.expiresAt) > Date.now()) link = saved } catch { /* Missing or expired pairing needs a fresh administrator code. */ }
  let cursor = 0, online = false, lastError = '', stopped = false, timer: ReturnType<typeof setTimeout> | undefined, workerTimer: ReturnType<typeof setTimeout> | undefined
  let queue: Promise<unknown> = Promise.resolve(), blocked = false, lastSnapshot: Record<string, unknown> | undefined, cache: ((id: string) => Promise<void>) | undefined
  let worker: ReturnType<typeof createCloudWorker> | undefined, workerToken = '', syncBusy = false
  const seen = new Set<string>()
  const api = async (path: string, init: RequestInit = {}) => {
    if (!link) throw new Error('cloud-not-connected')
    const response = await request(`${origin.origin}${path}`, { ...init, headers: { Authorization: `Bearer ${link.token}`, ...init.headers }, signal: init.signal ?? AbortSignal.timeout(20000) })
    if (!response.ok) { let reason = 'cloud-unavailable'; try { reason = (await response.json()).reason || reason } catch { /* No server details in errors. */ }; throw new Error(response.status === 401 || response.status === 403 ? 'cloud-access-revoked' : reason) }
    return response
  }
  const post = (message: Record<string, unknown>) => {
    queue = queue.then(async () => { if (!link) return; await api('/api/output-relay', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...message, eventId: message.eventId ?? randomUUID() }) }) }).catch(() => { online = false })
  }
  function black() {
    blocked = true
    const envelope = (lastSnapshot ?? relay.readSnapshot()) as { snapshot?: OutputSnapshot } | undefined
    const old = envelope?.snapshot
    if (!old) return
    const sender = 'native-safety', snapshot: OutputSnapshot = { ...old, revision: randomUUID(), transport: { publisher: sender, sequence: Date.now() }, audience: { ...old.audience, mode: 'blank', messageVisible: false }, confidence: { ...old.confidence, mode: 'idle', current: null, next: null, notes: null, stageMessage: '' }, displays: Object.fromEntries(Object.entries(old.displays ?? {}).map(([id, display]) => [id, { ...display, test: false, source: 'live' as const }])), broadcast: old.broadcast ? { ...old.broadcast, mode: 'mirror' } : undefined }
    const controller = { type: 'controller', sender, eventId: randomUUID() }, message = { type: 'snapshot', sender, snapshot, eventId: randomUUID() }
    relay.dispatch(controller); relay.dispatch(message); post({ type: 'claim', sender }); post(message)
  }
  const unsubscribe = relay.onPublish((message) => {
    if (!link) return
    if (message.type === 'claim') blocked = false
    if (message.type === 'snapshot') lastSnapshot = message
    // Local clients cannot relay arbitrary claims that never reached the loopback server.
    post(message)
  })
  const receive = (message: Record<string, unknown>) => {
    const event = typeof message.eventId === 'string' ? message.eventId : ''
    if (event && seen.has(event)) return
    if (event) { seen.add(event); if (seen.size > 1024) seen.delete(seen.values().next().value!) }
    if (message.type === 'snapshot') { lastSnapshot = message; if (blocked) return }
    if (blocked && message.type === 'controller') return
    relay.dispatch(message)
  }
  async function poll() {
    if (stopped) return
    try {
      if (link) {
        const result = await (await api(`/api/output-relay?cursor=${cursor}`)).json() as { cursor: number; messages: Record<string, unknown>[] }
        cursor = result.cursor; online = true; lastError = ''
        for (const message of result.messages) receive(message)
      }
    } catch (error) { online = false; cursor = 0; lastError = error instanceof Error ? error.message : 'cloud-unavailable' }
    if (!stopped && options.autoStart !== false) timer = setTimeout(() => void poll(), 1000)
  }
  async function scanTick() {
    if (stopped) return
    try {
      if (link?.canScan) {
        if (workerToken !== link.token) { workerToken = link.token; worker = createCloudWorker({ origin: origin.origin, token: link.token, root, environment, request, allowLocalTests: options.allowLocalTests }) }
        await worker!.runOnce()
      }
    } catch { /* Durable cloud leases retry without releasing unscanned content. */ }
    if (!stopped) workerTimer = setTimeout(() => void scanTick(), 5000)
  }
  const remote: RemoteMedia = {
    async lookup(id) {
      if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error('media-missing')
      const { asset } = await (await api(`/api/media/files/${id}?metadata=1`)).json() as { asset: RemoteAsset }
      if (!asset || asset.id !== id || asset.scan !== 'clean' || !/^[a-f0-9]{64}$/.test(asset.sha256) || !Number.isSafeInteger(asset.size) || asset.size! < 1 || asset.size! > 300 * 1024 * 1024 || asset.source !== `/api/media/files/${id}` || !/^(image|video|audio)\//.test(asset.mime || '')) throw new Error('media-missing')
      return asset
    },
    async *download(asset) {
      for (let start = 0; start < asset.size!; start += 8 * 1024 * 1024) {
        const end = Math.min(asset.size! - 1, start + 8 * 1024 * 1024 - 1)
        const response = await api(`/api/media/files/${asset.id}`, { headers: { Range: `bytes=${start}-${end}` }, signal: AbortSignal.timeout(60000) })
        if (response.status !== 206 || response.headers.get('content-range') !== `bytes ${start}-${end}/${asset.size}`) throw new Error('file-changed')
        const bytes = new Uint8Array(await response.arrayBuffer()); if (bytes.length !== end - start + 1) throw new Error('file-changed')
        yield bytes
      }
    },
  }
  async function cloudDocument() {
    const data = await (await api('/api/workspace')).json()
    if (!data.documentParts) return { revision: Number(data.revision), document: null }
    const part = data.documentParts
    if (!/^[0-9a-f-]{36}$/.test(part.id) || !Number.isSafeInteger(part.count) || part.count < 1 || part.count > 16 || part.size > 32 * 1024 * 1024) throw new Error('invalid-workspace')
    const chunks: Buffer[] = []
    for (let i = 0; i < part.count; i++) { const bytes = Buffer.from(await (await api(`/api/workspace/content/${part.id}/${i}`)).arrayBuffer()); if (bytes.length > 2 * 1024 * 1024) throw new Error('invalid-workspace'); chunks.push(bytes) }
    const bytes = Buffer.concat(chunks)
    if (bytes.length !== part.size || createHash('sha256').update(bytes).digest('hex') !== part.sha256) throw new Error('file-changed')
    return { revision: Number(data.revision), document: JSON.parse(bytes.toString()) }
  }
  const status = () => ({ connected: Boolean(link), online, name: link?.name, expiresAt: link?.expiresAt, canScan: link?.canScan, origin: origin.origin, blocked, error: lastError, syncBusy })
  const handler: Connect.NextHandleFunction = (req, res, next) => {
    const path = req.url?.split('?')[0] || ''
    if (!path.startsWith('/api/cloud/')) return next()
    const json = (code: number, value: unknown) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(value)) }
    const host = req.headers.host || '', local = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host)
    if (!local || !['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress || '') || req.headers['sec-fetch-site'] === 'cross-site' || req.headers.origin && ![`http://${host}`,`https://${host}`].includes(req.headers.origin) || req.headers['x-cathedral-cloud'] !== '1') return json(403, { reason: 'forbidden' })
    void (async () => {
      if (path === '/api/cloud/status' && req.method === 'GET') return json(200, status())
      if (req.method !== 'POST') return json(405, { reason: 'method-not-allowed' })
      const chunks: Buffer[] = []; let size = 0
      for await (const chunk of req) { size += chunk.length; if (size > 2048) throw new Error('invalid-request'); chunks.push(chunk) }
      const body = size ? JSON.parse(Buffer.concat(chunks).toString()) : {}
      if (path === '/api/cloud/connect') {
        if (body.authorized !== true) throw new Error('authorization-required')
        const code = String(body.code || '').replaceAll('-','').replaceAll(' ','')
        if (!/^[A-Fa-f0-9]{12}$/.test(code)) throw new Error('invalid-pairing-code')
        const response = await request(`${origin.origin}/api/installations/pair/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, platform: process.platform }), signal: AbortSignal.timeout(20000) })
        if (!response.ok) throw new Error('invalid-pairing-code')
        const data = await response.json() as Link
        if (!/^[A-Za-z0-9_-]{43}$/.test(data.token) || !/^[0-9a-f-]{36}$/.test(data.id) || !Number.isFinite(Date.parse(data.expiresAt))) throw new Error('invalid-pairing-code')
        link = { ...data, origin: origin.origin }; writeFileSync(credentials, cipher.encrypt(link), { mode: 0o600 }); cursor = 0
        return json(200, status())
      }
      if (path === '/api/cloud/disconnect') { link = undefined; worker = undefined; workerToken = ''; online = false; cursor = 0; if (existsSync(credentials)) unlinkSync(credentials); return json(200, status()) }
      if (path === '/api/cloud/black') { black(); return json(200, status()) }
      if (path === '/api/cloud/resume') { blocked = false; cursor = 0; seen.clear(); return json(200, status()) }
      const media = /^\/api\/cloud\/cache-media\/([0-9a-f-]{36})$/.exec(path)
      if (media) { if (!cache) throw new Error('media-unavailable'); await cache(media[1]); return json(200, { cached: true }) }
      if (path === '/api/cloud/sync') {
        if (syncBusy) throw new Error('sync-busy')
        const snapshot = (lastSnapshot ?? relay.readSnapshot()) as { snapshot?: OutputSnapshot } | undefined
        if (snapshot?.snapshot?.audience.mode === 'live') throw new Error('stop-live-before-sync')
        if (body.direction !== 'download') throw new Error('invalid-sync-direction')
        syncBusy = true
        try {
          const local = workspace.readCurrent(), cloud = await cloudDocument()
          if (!cloud.document) throw new Error('workspace-missing')
          // Precache every referenced private asset before the local copy becomes active.
          const ids = new Set<string>(), serialized = JSON.stringify(cloud.document)
          for (const match of serialized.matchAll(/\/api\/media\/files\/([0-9a-f-]{36})/g)) ids.add(match[1])
          if (cache) for (const id of ids) await cache(id)
          const revision = workspace.replace(cloud.document, local.revision)
          return json(200, { revision, cloudRevision: cloud.revision, cached: ids.size })
        } finally { syncBusy = false }
      }
      return json(404, { reason: 'not-found' })
    })().catch((error) => json(409, { reason: error instanceof Error && /^[a-z-]{1,80}$/.test(error.message) ? error.message : 'cloud-unavailable' }))
  }
  if (options.autoStart !== false) { void poll(); void scanTick() }
  return { handler, remote, status, poll, black, setMediaCache(fn: (id: string) => Promise<void>) { cache = fn }, close() { stopped = true; clearTimeout(timer); clearTimeout(workerTimer); unsubscribe() } }
}
