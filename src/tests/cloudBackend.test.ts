// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { readFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'
import { createCloudWorker } from '../../server/cloudWorker'
import { createNativeCloud } from '../../server/nativeCloud'
import { createOutputRelay } from '../../server/outputRelay'
import { createWorkspace } from '../../server/workspace'
import { Pool } from 'pg'
import { randomUUID } from 'node:crypto'
import { createCloudApp } from '../../server/cloud/app'
import { cloudEncryption } from '../../server/cloud/crypto'
import { checkOrigin, cloudOrigin, CloudError, readBytes } from '../../server/cloud/http'
import { digest } from '../../server/cloud/http'
import type { CloudDrive } from '../../server/cloud/drive'
import { protectedContent } from '../../server/cloud/content'

describe('cloud request boundaries', () => {
  it('requires a configured HTTPS origin and never accepts a different caller origin', () => {
    expect(() => cloudOrigin({ CATHEDRAL_ORIGIN: 'http://public.example' })).toThrow('cloud-not-configured')
    expect(() => checkOrigin(new Request('https://church.example/api/workspace', { headers: { Origin: 'https://attacker.example' } }), 'https://church.example')).toThrow('forbidden')
    expect(() => checkOrigin(new Request('https://church.example/api/workspace', { method: 'POST', headers: { 'Content-Type': 'text/plain' } }), 'https://church.example')).toThrow('forbidden')
  })
  it('encrypts persisted cloud secrets and detects tampering', () => {
    const crypto = cloudEncryption({ CATHEDRAL_ENCRYPTION_KEY: 'ab'.repeat(32) })
    const encoded = crypto.encrypt({ refresh: 'private-refresh-value' })
    expect(encoded).not.toContain('private-refresh-value')
    expect(crypto.decrypt(encoded)).toEqual({ refresh: 'private-refresh-value' })
    const parts = encoded.split('.'); parts[1] = 'x'.repeat(parts[1].length)
    expect(() => crypto.decrypt(parts.join('.'))).toThrow()
  })
  it('stops oversized request streams', async () => {
    const request = new Request('https://church.example/api/test', { method: 'POST', body: new Uint8Array(64) })
    await expect(readBytes(request, 32)).rejects.toBeInstanceOf(CloudError)
  })
})

const databaseUrl = process.env.CATHEDRAL_TEST_DATABASE_URL
describe.skipIf(!databaseUrl)('cloud PostgreSQL and account integration', () => {
  const origin = 'http://127.0.0.1:4180', bootstrap = 'b'.repeat(43)
  const schema = `cp_test_${randomUUID().replaceAll('-', '')}`
  const blobs = new Map<string, Uint8Array>()
  const storage = { get: async (key: string) => blobs.get(key) ?? null, set: async (key: string, bytes: Uint8Array) => { blobs.set(key, bytes.slice()) }, delete: async (key: string) => { blobs.delete(key) } }
  const drive: CloudDrive = { findUploaded: async () => null, status: async () => ({ configured: true, connected: true, canManage: true, redirectUri: `${origin}/api/media/drive/callback` }), list: async () => [], downloadPart: async () => new Response(null, { status: 404 }), rename: async () => {}, startUpload: vi.fn(async () => 'encrypted-session'), uploadPart: vi.fn(async (_session: string, bytes: Uint8Array, start: number, size: number) => ({ done: start + bytes.length === size, next: start + bytes.length, id: start + bytes.length === size ? 'google-file-fixture' : undefined })), handle: async () => new Response(null, { status: 404 }) }
  const workerToken = 'w'.repeat(43), encryptionKey = 'ab'.repeat(32)
  let pool: Pool, control: Pool, app: ReturnType<typeof createCloudApp>, adminCookie = '', operatorCookie = ''
  const request = (path: string, options: { method?: string; body?: unknown; token?: string; cookie?: string; origin?: string; bearer?: string; lease?: string } = {}) => app.handle(new Request(`${origin}${path}`, { method: options.method ?? 'GET', headers: { 'Content-Type': 'application/json', ...(options.token ? { 'x-cathedral-invitation': options.token } : {}), ...(options.cookie ? { Cookie: options.cookie } : {}), ...(options.origin ? { Origin: options.origin } : {}), ...(options.bearer ? { Authorization: `Bearer ${options.bearer}` } : {}), ...(options.lease ? { 'X-Cathedral-Job-Lease': options.lease } : {}) }, body: options.body ? JSON.stringify(options.body) : undefined }), { ip: '127.0.0.1' })
  beforeAll(async () => {
    if (!['127.0.0.1', 'localhost'].includes(new URL(databaseUrl!).hostname) || new URL(databaseUrl!).pathname !== '/cathedral_test') throw new Error('Integration tests require the dedicated local cathedral_test database')
    control = new Pool({ connectionString: databaseUrl })
    await control.query(`CREATE SCHEMA "${schema}"`)
    pool = new Pool({ connectionString: databaseUrl, options: `-c search_path=${schema}` })
    await pool.query(await readFile('netlify/database/migrations/001_cloud.sql', 'utf8'))
    app = createCloudApp({ CATHEDRAL_ORIGIN: origin, CATHEDRAL_ALLOW_LOCAL_TESTS: '1', BETTER_AUTH_SECRET: 'integration-secret-'.repeat(4), CATHEDRAL_ADMIN_EMAIL: 'owner@example.test', CATHEDRAL_BOOTSTRAP_TOKEN: bootstrap, CATHEDRAL_ENCRYPTION_KEY: encryptionKey, CATHEDRAL_WORKER_TOKEN: workerToken }, { pool, storage, drive })
    const [health, emptySession] = await Promise.all([request('/api/app-health'), request('/api/auth/get-session')]); expect(health.status).toBe(200);expect(await emptySession.json()).toBeNull()
  }, 30000)
  afterAll(async () => { await pool?.end(); if (control) { await control.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); await control.end() } })
  it('refuses public signup and prevents a visitor claiming administrator by email alone', async () => {
    const result = await request('/api/auth/sign-up/email', { method: 'POST', body: { email: 'owner@example.test', password: 'Test-password-12345!', name: 'Owner' } })
    expect(result.ok).toBe(false)
    expect(Number((await pool.query('SELECT count(*) FROM "user"')).rows[0].count)).toBe(0)
  })
  it('creates only the configured owner with a bootstrap secret, then disables that bootstrap', async () => {
    const created = await request('/api/auth/sign-up/email', { method: 'POST', token: bootstrap, body: { email: 'owner@example.test', password: 'Test-password-12345!', name: 'Owner', role: 'operator' } })
    expect(created.status, await created.clone().text()).toBe(200)
    const login = await request('/api/auth/sign-in/email', { method: 'POST', body: { email: 'owner@example.test', password: 'Test-password-12345!' } })
    expect(login.ok).toBe(true); adminCookie = login.headers.getSetCookie().map((v) => v.split(';')[0]).join('; ')
    expect((await (await request('/api/auth/get-session', { cookie: adminCookie })).json()).user.role).toBe('admin')
    expect((await (await request('/api/app-health')).json()).bootstrapRequired).toBe(false)
  })
  it('requires an administrator invitation, ignores a client-selected role and prevents invite replay', async () => {
    const inviteResponse = await request('/api/admin/invitations', { method: 'POST', cookie: adminCookie, body: { email: 'operator@example.test', role: 'operator' } })
    expect(inviteResponse.status).toBe(201)
    const invitation = await inviteResponse.json(), token = invitation.url.split('invite=')[1]
    const signup = await request('/api/auth/sign-up/email', { method: 'POST', token, body: { email: 'operator@example.test', password: 'Test-password-56789!', name: 'Operator', role: 'admin' } })
    expect(signup.status, await signup.clone().text()).toBe(200)
    const login = await request('/api/auth/sign-in/email', { method: 'POST', body: { email: 'operator@example.test', password: 'Test-password-56789!' } })
    operatorCookie = login.headers.getSetCookie().map((v) => v.split(';')[0]).join('; ')
    expect((await (await request('/api/auth/get-session', { cookie: operatorCookie })).json()).user.role).toBe('operator')
    expect((await request('/api/admin/users', { cookie: operatorCookie })).status).toBe(403)
    const replay = await request('/api/auth/sign-up/email', { method: 'POST', token, body: { email: 'other@example.test', password: 'Test-password-56789!', name: 'Other' } })
    expect(replay.ok).toBe(false)
  })
  it('revokes account sessions and rejects cross-origin administrative changes', async () => {
    const user = (await pool.query('SELECT id FROM "user" WHERE email=$1', ['operator@example.test'])).rows[0]
    expect((await request(`/api/admin/users/${user.id}`, { method: 'PATCH', cookie: adminCookie, origin: 'https://attacker.example', body: { role: 'disabled' } })).status).toBe(403)
    expect((await request(`/api/admin/users/${user.id}`, { method: 'PATCH', cookie: adminCookie, body: { role: 'disabled' } })).status).toBe(200)
    expect(await (await request('/api/auth/get-session', { cookie: operatorCookie })).json()).toBeNull()
    expect((await request('/api/auth/sign-in/email', { method: 'POST', body: { email: 'operator@example.test', password: 'Test-password-56789!' } })).status).toBe(403)
  })
  it('shares durable revisions only with signed-in operators and prevents stale overwrites', async () => {
    expect((await request('/api/workspace')).status).toBe(401)
    const document = { services: [], librarySongs: [], settings: { locale: 'en', secret: 'must-not-persist' }, live: { private: true } }
    const saved = await request('/api/workspace', { method: 'PUT', cookie: adminCookie, body: { document, expectedRevision: 0 } })
    expect(await saved.json()).toEqual({ revision: 1 })
    const metadata = await (await request('/api/workspace', { cookie: adminCookie })).json()
    expect(metadata.revision).toBe(1)
    const content = await request(`/api/workspace/content/${metadata.documentParts.id}/0`, { cookie: adminCookie })
    expect(content.status).toBe(200)
    const restored = JSON.parse(await content.text())
    expect(restored.settings).toEqual({ locale: 'en' }); expect(restored.live).toBeUndefined()
    expect((await request('/api/workspace', { method: 'PUT', cookie: adminCookie, body: { document, expectedRevision: 0 } })).status).toBe(409)
    expect((await (await request('/api/workspace/history', { cookie: adminCookie })).json()).revisions).toHaveLength(1)
  })
  it('saves a workspace larger than a function request through verified chunks', async () => {
    const bytes = Buffer.from(JSON.stringify({ services: [], librarySongs: [], settings: { text: 'x'.repeat(2 * 1024 * 1024) } }))
    const upload = await (await request('/api/workspace/uploads', { method: 'POST', cookie: adminCookie, body: { size: bytes.length, sha256: digest(bytes) } })).json()
    expect(upload.parts).toBe(2)
    for (let i = 0; i < upload.parts; i++) {
      const response = await app.handle(new Request(`${origin}/api/workspace/uploads/${upload.id}/${i}`, { method: 'PUT', headers: { Cookie: adminCookie, 'Content-Type': 'application/octet-stream', 'X-Cathedral-Workspace': '1' }, body: bytes.subarray(i * upload.chunkBytes, (i + 1) * upload.chunkBytes) }))
      expect(response.status).toBe(200)
    }
    const completed = await request(`/api/workspace/uploads/${upload.id}`, { method: 'POST', cookie: adminCookie, body: { expectedRevision: 1 } })
    expect(await completed.json()).toEqual({ revision: 2 })
    const metadata = await (await request('/api/workspace', { cookie: adminCookie })).json()
    expect(metadata.documentParts.count).toBe(2)
    const unchanged = await (await request('/api/workspace?revision=2', { cookie: adminCookie })).json()
    expect(unchanged).toMatchObject({ revision: 2, unchanged: true, document: null })
  })
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64')
  async function mediaFixture() {
    const response = await request('/api/media/uploads', { method: 'POST', cookie: adminCookie, body: { name: 'picture.png', mime: 'image/png', size: png.length, sha256: digest(png) } })
    expect(response.status, await response.clone().text()).toBe(201)
    const upload = await response.json()
    expect((await app.handle(new Request(`${origin}/api/media/uploads/${upload.id}/0`, { method: 'PUT', headers: { Cookie: adminCookie, 'Content-Type': 'application/octet-stream', 'X-Cathedral-Media': '1' }, body: png }))).status).toBe(200)
    expect((await request(`/api/media/uploads/${upload.id}/complete`, { method: 'POST', cookie: adminCookie, body: {} })).status).toBe(202)
    return upload
  }
  it('keeps uploads private until a trusted worker scans and publishes exactly the sealed bytes', async () => {
    expect((await request('/api/media/uploads', { method: 'POST', cookie: adminCookie, body: { name: 'picture.png', mime: 'image/png', size: png.length, sha256: digest(png) } })).status).toBe(503)
    await request('/api/worker/claim', { method: 'POST', bearer: workerToken, body: { ready: true } })
    const upload = await mediaFixture()
    expect((await request(`/api/media/files/${upload.id}`, { cookie: adminCookie })).status).toBe(404)
    const { job } = await (await request('/api/worker/claim', { method: 'POST', bearer: workerToken, body: { ready: true } })).json()
    expect(job.id).toBe(upload.id)
    expect((await pool.query('SELECT lease_token FROM cp_uploads WHERE id=$1', [job.id])).rows[0].lease_token).not.toBe(job.lease)
    expect((await request(`/api/worker/jobs/${job.id}/publish`, { method: 'POST', bearer: workerToken, lease: job.lease, body: {} })).status).toBe(409)
    expect((await app.handle(new Request(`${origin}/api/media/uploads/${job.id}/0`, { method: 'PUT', headers: { Cookie: adminCookie, 'Content-Type': 'application/octet-stream', 'X-Cathedral-Media': '1' }, body: png }))).status).toBe(409)
    expect((await request(`/api/worker/jobs/${job.id}/verdict`, { method: 'POST', bearer: workerToken, lease: job.lease, body: { verdict: 'clean', sha256: 'incorrect', size: png.length } })).status).toBe(422)
    expect((await request(`/api/worker/jobs/${job.id}/verdict`, { method: 'POST', bearer: workerToken, lease: job.lease, body: { verdict: 'clean', sha256: digest(png), size: png.length } })).status).toBe(200)
    const published = await request(`/api/worker/jobs/${job.id}/publish`, { method: 'POST', bearer: workerToken, lease: job.lease, body: {} })
    expect(published.status, await published.clone().text()).toBe(200)
    expect((await published.json()).asset).toMatchObject({ id: job.id, scan: 'clean', storage: 'drive' })
    expect((await request(`/api/media/files/${job.id}`)).status).toBe(401)
    const redirect = await request(`/api/media/files/${job.id}`, { cookie: adminCookie })
    const delivered = await protectedContent(new Request(new URL(redirect.headers.get('location')!, origin)), encryptionKey, storage)
    expect(Buffer.from(await delivered.arrayBuffer())).toEqual(png)
  })
  it('blocks infected uploads, refuses forged worker results and never adds them to the library', async () => {
    const upload = await mediaFixture()
    const { job } = await (await request('/api/worker/claim', { method: 'POST', bearer: workerToken, body: { ready: true } })).json()
    expect((await request(`/api/worker/jobs/${job.id}/verdict`, { method: 'POST', cookie: adminCookie, lease: job.lease, body: { verdict: 'clean', sha256: digest(png), size: png.length } })).status).toBe(403)
    const result = await request(`/api/worker/jobs/${job.id}/verdict`, { method: 'POST', bearer: workerToken, lease: job.lease, body: { verdict: 'infected' } })
    expect(await result.json()).toMatchObject({ blocked: true, reason: 'virus-detected' })
    expect((await request(`/api/media/files/${upload.id}`, { cookie: adminCookie })).status).toBe(404)
    expect((await (await request('/api/media/library', { cookie: adminCookie })).json()).assets).toHaveLength(1)
  })
  it('runs the worker protocol, verifies downloaded bytes and publishes only after the scanner succeeds', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cathedral-worker-test-'))
    try {
      const upload = await mediaFixture(), scanned: Buffer[] = []
      const worker = createCloudWorker({ origin, token: workerToken, root, allowLocalTests: true, request: ((input: string | URL | Request, init?: RequestInit) => app.handle(new Request(input, init), { ip: '127.0.0.1' })) as typeof fetch, scan: async (file) => { scanned.push(await readFile(file)); return 'clean' } })
      expect(await worker.runOnce()).toMatchObject({ worked: true, ready: true })
      expect(scanned.at(-1)).toEqual(png)
      expect((await (await request(`/api/media/uploads/${upload.id}`, { cookie: adminCookie })).json()).status).toBe('done')
    } finally { await rm(root, { recursive: true, force: true }) }
  })
  it('connects a native computer, downloads a recovery copy and keeps emergency black during a network failure', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cathedral-native-cloud-test-')), relay = createOutputRelay(), workspace = createWorkspace(root)
    let network = true
    const bridge = createNativeCloud({ root, environment: { CATHEDRAL_CLOUD_ORIGIN: origin }, relay, workspace, allowLocalTests: true, autoStart: false, request: ((input: string | URL | Request, init?: RequestInit) => { if (!network) throw new Error('offline'); return app.handle(new Request(input, init), { ip: '127.0.0.1' }) }) as typeof fetch })
    const server = createServer((req,res) => bridge.handler(req,res,() => { res.writeHead(404).end() }))
    await new Promise<void>((resolve) => server.listen(0,'127.0.0.1',resolve))
    const port = (server.address() as { port: number }).port
    const local = (path: string, body: object) => fetch(`http://127.0.0.1:${port}/api/cloud/${path}`, { method: 'POST', headers: { 'X-Cathedral-Cloud': '1', 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    try {
      const pairing = await (await request('/api/installations/pair', { method: 'POST', cookie: adminCookie, body: { name: 'Native fixture', canScan: false } })).json()
      expect((await local('connect',{ code: pairing.code })).status).toBe(409)
      expect((await local('connect',{ code: pairing.code, authorized: true })).status).toBe(200)
      const list = (await (await request('/api/installations', { cookie: adminCookie })).json()).installations as { id: string; name: string }[]
      const id = list.find((i) => i.name === 'Native fixture')!.id
      expect(await readFile(join(root,'.data','cloud-link','credentials'),'utf8')).not.toContain('token')
      expect((await local('sync',{ direction: 'download' })).status).toBe(200)
      expect(workspace.readCurrent().revision).toBe(1)
      const channel = `/api/output-relay?installation=${id}`
      const claim = () => request(channel, { method: 'POST', cookie: adminCookie, body: { type: 'claim', sender: 'online-operator' } })
      const live = () => request(channel, { method: 'POST', cookie: adminCookie, body: { type: 'snapshot', sender: 'online-operator', snapshot: { audience: { mode: 'live', slide: { id: 'live-fixture' } }, confidence: { mode: 'live' }, transport: { publisher: 'online-operator', sequence: Date.now() } } } })
      await claim(); await live(); await bridge.poll()
      expect(relay.readSnapshot()).toMatchObject({ snapshot: { audience: { mode: 'live' } } })
      expect((await local('sync',{ direction: 'download' })).status).toBe(409)
      await local('black',{})
      expect(relay.readSnapshot()).toMatchObject({ snapshot: { audience: { mode: 'blank', messageVisible: false } } })
      await new Promise((r) => setTimeout(r,50)); await claim(); await live(); await bridge.poll()
      expect(relay.readSnapshot()).toMatchObject({ snapshot: { audience: { mode: 'blank' } } })
      network = false; await bridge.poll()
      expect(bridge.status()).toMatchObject({ online: false, blocked: true })
      expect(relay.readSnapshot()).toMatchObject({ snapshot: { audience: { mode: 'blank' } } })
    } finally { bridge.close(); relay.close(); workspace.close(); await new Promise<void>((resolve) => server.close(() => resolve())); await rm(root, { recursive: true, force: true }) }
  })
  it('keeps converted presentation pages private until a leased scanner completes them', async () => {
    await request('/api/worker/claim',{method:'POST',bearer:workerToken,body:{ready:true,converter:true}})
    const source=Buffer.from([80,75,3,4,0,0,0,0]),pdf=Buffer.from('%PDF-1.3\nConverted fixture')
    const upload=await (await request('/api/media/uploads',{method:'POST',cookie:adminCookie,body:{name:'sermon.pptx',mime:'application/vnd.openxmlformats-officedocument.presentationml.presentation',size:source.length,sha256:digest(source),scanOnly:true,convertPdf:true}})).json()
    expect(upload.id).toBeTruthy()
    expect((await app.handle(new Request(`${origin}/api/media/uploads/${upload.id}/0`,{method:'PUT',headers:{Cookie:adminCookie,'Content-Type':'application/octet-stream','X-Cathedral-Media':'1'},body:source}))).status).toBe(200)
    await request(`/api/media/uploads/${upload.id}/complete`,{method:'POST',cookie:adminCookie,body:{}})
    const {job}=await (await request('/api/worker/claim',{method:'POST',bearer:workerToken,body:{ready:true,converter:true}})).json()
    expect(job.convertPdf).toBe(true)
    await request(`/api/worker/jobs/${job.id}/verdict`,{method:'POST',bearer:workerToken,lease:job.lease,body:{verdict:'clean',sha256:digest(source),size:source.length}})
    const output=await request(`/api/worker/jobs/${job.id}/conversion`,{method:'POST',bearer:workerToken,lease:job.lease,body:{size:pdf.length,sha256:digest(pdf)}})
    expect(output.status).toBe(200)
    expect((await app.handle(new Request(`${origin}/api/worker/jobs/${job.id}/conversion/0`,{method:'PUT',headers:{Authorization:`Bearer ${workerToken}`,'X-Cathedral-Job-Lease':job.lease,'X-Cathedral-Media':'1','Content-Type':'application/octet-stream'},body:pdf}))).status).toBe(200)
    expect((await request(`/api/media/uploads/${job.id}/conversion/0`,{cookie:adminCookie})).status).toBe(404)
    expect((await request(`/api/worker/jobs/${job.id}/conversion/complete`,{method:'POST',bearer:workerToken,lease:job.lease,body:{}})).status).toBe(200)
    expect((await request(`/api/media/uploads/${job.id}/conversion/0`)).status).toBe(401)
    expect(Buffer.from(await (await request(`/api/media/uploads/${job.id}/conversion/0`,{cookie:adminCookie})).arrayBuffer())).toEqual(pdf)
    expect((await (await request(`/api/media/uploads/${job.id}`,{cookie:adminCookie})).json()).conversion).toMatchObject({size:pdf.length,sha256:digest(pdf)})
  })
  it('pairs installations once, scopes their capabilities and persists the exact output snapshot', async () => {
    const pairing = await (await request('/api/installations/pair', { method: 'POST', cookie: adminCookie, body: { name: 'Test Windows', canScan: false } })).json()
    const connected = await request('/api/installations/pair/complete', { method: 'POST', body: { code: pairing.code, platform: 'win32' } })
    expect(connected.status, await connected.clone().text()).toBe(201)
    const computer = await connected.json()
    expect((await request('/api/installations/pair/complete', { method: 'POST', body: { code: pairing.code, platform: 'win32' } })).status).toBe(403)
    expect((await request('/api/admin/users', { bearer: computer.token })).status).toBe(403)
    expect((await request('/api/worker/claim', { method: 'POST', bearer: computer.token, body: { ready: true } })).status).toBe(403)
    const channel = `/api/output-relay?installation=${computer.id}`
    expect((await request(channel, { method: 'POST', cookie: adminCookie, body: { type: 'claim', sender: 'browser1' } })).status).toBe(200)
    const snapshot = { audience: { mode: 'live', slide: { id: 'john-3-16' } }, confidence: { mode: 'live' }, transport: { publisher: 'browser1', sequence: 1 } }
    expect((await request(channel, { method: 'POST', cookie: adminCookie, body: { type: 'snapshot', sender: 'browser1', snapshot } })).status).toBe(200)
    const native = await (await request('/api/output-relay', { bearer: computer.token })).json()
    expect(native.messages.find((m: { type: string }) => m.type === 'snapshot').snapshot.audience.slide.id).toBe('john-3-16')
    expect((await request(channel, { method: 'POST', cookie: adminCookie, body: { type: 'rendered', sender: 'browser1', displayId: 'fake' } })).status).toBe(403)
    expect((await request('/api/output-relay', { method: 'POST', bearer: computer.token, body: { type: 'snapshot', sender: 'browser1', snapshot } })).status).toBe(409)
    expect((await request(`/api/installations/${computer.id}`, { method: 'DELETE', cookie: adminCookie })).status).toBe(200)
    expect((await request('/api/output-relay', { bearer: computer.token })).status).toBe(401)
  })
})
