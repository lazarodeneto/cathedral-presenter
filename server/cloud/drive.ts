import { randomBytes, createHash } from 'node:crypto'
import type { Pool } from 'pg'
import { cloudEncryption } from './crypto'
import { cloudOrigin, CloudError, digest, json, readJson, type CloudEnvironment } from './http'
interface Credentials { refreshToken: string; folderId: string; ownerId: string }
interface Client { clientId: string; clientSecret: string }
export interface CloudDriveFile { id: string; name: string; mimeType: string; size?: string; appProperties?: Record<string, string> }
export function createCloudDrive(pool: Pool, env: CloudEnvironment) {
  const encryption = cloudEncryption(env), origin = cloudOrigin(env)
  const redirectUri = `${origin}/api/media/drive/callback`
  let access: { token: string; expires: number; fingerprint: string } | undefined
  const setting = async <T>(key: string): Promise<T | null> => {
    const row = (await pool.query('SELECT value FROM cp_settings WHERE key=$1', [key])).rows[0]
    return row ? encryption.decrypt<T>(row.value.encrypted) : null
  }
  const save = async (key: string, value: unknown) => pool.query('INSERT INTO cp_settings(key,value) VALUES($1,$2::jsonb) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=now()', [key, JSON.stringify({ encrypted: encryption.encrypt(value) })])
  const client = async (): Promise<Client | null> => env.GOOGLE_DRIVE_CLIENT_ID && env.GOOGLE_DRIVE_CLIENT_SECRET ? { clientId: env.GOOGLE_DRIVE_CLIENT_ID, clientSecret: env.GOOGLE_DRIVE_CLIENT_SECRET } : setting<Client>('drive.client')
  const token = async (body: URLSearchParams) => {
    const config = await client(); if (!config) throw new CloudError('drive-not-configured', 503)
    body.set('client_id', config.clientId); body.set('client_secret', config.clientSecret)
    const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body, signal: AbortSignal.timeout(15000) })
    if (!response.ok) throw new CloudError('drive-auth-failed', 503)
    return response.json() as Promise<{ access_token: string; refresh_token?: string; expires_in: number }>
  }
  const accessToken = async () => {
    const credentials = await setting<Credentials>('drive.credentials')
    if (!credentials) throw new CloudError('drive-not-connected', 409)
    const fingerprint = digest(credentials.refreshToken)
    if (access && access.fingerprint === fingerprint && access.expires > Date.now() + 60000) return access.token
    const result = await token(new URLSearchParams({ grant_type: 'refresh_token', refresh_token: credentials.refreshToken }))
    access = { token: result.access_token, expires: Date.now() + result.expires_in * 1000, fingerprint }
    return access.token
  }
  const request = async (path: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers); headers.set('Authorization', `Bearer ${await accessToken()}`)
    const response = await fetch(`https://www.googleapis.com/drive/v3/${path}`, { ...init, headers, redirect: 'error', signal: AbortSignal.timeout(20000) })
    if (!response.ok) throw new CloudError('drive-request-failed', 503)
    return response
  }
  return {
    async status() { return { configured: Boolean(await client()), connected: Boolean(await setting<Credentials>('drive.credentials')), canManage: true, redirectUri } },
    async list(): Promise<CloudDriveFile[]> {
      const credentials = await setting<Credentials>('drive.credentials'); if (!credentials) return []
      const files: CloudDriveFile[] = []; let pageToken = ''
      do {
        const query = new URLSearchParams({ q: `'${credentials.folderId}' in parents and trashed=false`, fields: 'nextPageToken,files(id,name,mimeType,size,appProperties)', pageSize: '100', ...(pageToken ? { pageToken } : {}) })
        const page = await (await request(`files?${query}`)).json() as { files: CloudDriveFile[]; nextPageToken?: string }
        files.push(...page.files); pageToken = page.nextPageToken ?? ''
      } while (pageToken && files.length < 2000)
      return files
    },
    async downloadPart(fileId: string, start: number, end: number) {
      if (!/^[A-Za-z0-9_-]{1,180}$/.test(fileId)) throw new CloudError('invalid-drive-file')
      return request(`files/${fileId}?alt=media`, { headers: { Range: `bytes=${start}-${end}` } })
    },
    async rename(fileId: string, name: string) {
      if (!/^[A-Za-z0-9_-]{1,180}$/.test(fileId)) throw new CloudError('invalid-drive-file')
      await request(`files/${fileId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
    },
    async findUploaded(id: string, sha256: string) {
      if (!/^[0-9a-f-]{36}$/.test(id) || !/^[a-f0-9]{64}$/.test(sha256)) throw new CloudError('invalid-media')
      const credentials = await setting<Credentials>('drive.credentials'); if (!credentials) return null
      const q = `'${credentials.folderId}' in parents and trashed=false and appProperties has { key='cathedralMediaId' and value='${id}' } and appProperties has { key='sha256' and value='${sha256}' }`
      const result = await (await request(`files?${new URLSearchParams({ q, fields: 'files(id)', pageSize: '1' })}`)).json() as { files: { id: string }[] }
      return result.files[0]?.id ?? null
    },
    async startUpload(metadata: { id: string; name: string; mime: string; size: number; sha256: string }) {
      const credentials = await setting<Credentials>('drive.credentials'); if (!credentials) throw new CloudError('drive-not-connected', 409)
      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id', {
        method: 'POST', headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json', 'X-Upload-Content-Type': metadata.mime, 'X-Upload-Content-Length': String(metadata.size) },
        body: JSON.stringify({ name: metadata.name, parents: [credentials.folderId], appProperties: { cathedralMediaId: metadata.id, sha256: metadata.sha256 } }), redirect: 'error', signal: AbortSignal.timeout(15000),
      })
      const location = response.headers.get('location')
      if (!response.ok || !location || new URL(location).origin !== 'https://www.googleapis.com') throw new CloudError('drive-upload-failed', 503)
      return encryption.encrypt(location)
    },
    async uploadPart(encryptedUrl: string, bytes: Uint8Array, start: number, size: number) {
      const url = encryption.decrypt<string>(encryptedUrl)
      if (new URL(url).origin !== 'https://www.googleapis.com') throw new CloudError('drive-upload-failed', 503)
      const response = await fetch(url, { method: 'PUT', headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Length': String(bytes.length), 'Content-Range': `bytes ${start}-${start + bytes.length - 1}/${size}` }, body: bytes as Uint8Array<ArrayBuffer>, redirect: 'error', signal: AbortSignal.timeout(30000) })
      if (response.status === 308) return { done: false, next: Number(response.headers.get('range')?.match(/bytes=0-(\d+)/)?.[1] ?? -1) + 1 }
      if (!response.ok) throw new CloudError('drive-upload-failed', 503)
      const file = await response.json() as { id: string }; return { done: true, id: file.id, next: size }
    },
    async handle(req: Request, user: { id: string; role: string }) {
      if (user.role !== 'admin') throw new CloudError('drive-admin-required', 403)
      const url = new URL(req.url)
      if (url.pathname.endsWith('/config') && req.method === 'POST') {
        const body = await readJson(req, 2048), clientId = String(body.clientId ?? '').trim(), clientSecret = String(body.clientSecret ?? '').trim()
        if (!/^[A-Za-z0-9._-]{10,255}\.apps\.googleusercontent\.com$/.test(clientId) || !/^\S{12,256}$/.test(clientSecret)) throw new CloudError('drive-invalid-client')
        if (await setting('drive.credentials')) throw new CloudError('drive-already-connected', 409)
        await save('drive.client', { clientId, clientSecret }); return json({ configured: true })
      }
      if (url.pathname.endsWith('/connect') && req.method === 'POST') {
        const config = await client(); if (!config) throw new CloudError('drive-not-configured', 503)
        const state = randomBytes(32).toString('base64url'), verifier = randomBytes(32).toString('base64url')
        await pool.query('DELETE FROM cp_oauth_states WHERE expires_at<now()')
        await pool.query('INSERT INTO cp_oauth_states(state_hash,user_id,verifier_encrypted,expires_at) VALUES($1,$2,$3,now()+interval \'10 minutes\')', [digest(state), user.id, encryption.encrypt(verifier)])
        const query = new URLSearchParams({ client_id: config.clientId, redirect_uri: redirectUri, response_type: 'code', scope: 'https://www.googleapis.com/auth/drive.file', access_type: 'offline', prompt: 'consent', state, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' })
        return json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${query}` }, 200, { 'Set-Cookie': `cathedral-drive-state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/api/media/drive; Max-Age=600` })
      }
      if (url.pathname.endsWith('/callback') && req.method === 'GET') {
        const state = url.searchParams.get('state') ?? '', cookie = /(?:^|;\s*)cathedral-drive-state=([^;]+)/.exec(req.headers.get('cookie') ?? '')?.[1]
        const pending = await pool.query('DELETE FROM cp_oauth_states WHERE state_hash=$1 AND user_id=$2 AND expires_at>now() RETURNING verifier_encrypted', [digest(state), user.id])
        if (!pending.rowCount || cookie !== state || !url.searchParams.get('code')) throw new CloudError('drive-auth-failed', 403)
        const result = await token(new URLSearchParams({ grant_type: 'authorization_code', code: url.searchParams.get('code')!, code_verifier: encryption.decrypt<string>(pending.rows[0].verifier_encrypted), redirect_uri: redirectUri }))
        if (!result.refresh_token) throw new CloudError('drive-auth-failed', 503)
        const connectingRequest = async (path: string, init: RequestInit = {}) => {
          const headers = new Headers(init.headers); headers.set('Authorization', `Bearer ${result.access_token}`)
          const response = await fetch(`https://www.googleapis.com/drive/v3/${path}`, { ...init, headers, redirect: 'error', signal: AbortSignal.timeout(15000) })
          if (!response.ok) throw new CloudError('drive-auth-failed', 503)
          return response
        }
        const query = new URLSearchParams({ q: "mimeType='application/vnd.google-apps.folder' and trashed=false and appProperties has { key='cathedralFolder' and value='media' }", fields: 'files(id)', pageSize: '10' })
        const folders = await (await connectingRequest(`files?${query}`)).json() as { files: { id: string }[] }
        const folderId = folders.files[0]?.id ?? (await (await connectingRequest('files?fields=id', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Cathedral Presenter', mimeType: 'application/vnd.google-apps.folder', appProperties: { cathedralFolder: 'media' } }) })).json() as { id: string }).id
        await save('drive.credentials', { refreshToken: result.refresh_token, folderId, ownerId: user.id })
        access = { token: result.access_token, expires: Date.now() + result.expires_in * 1000, fingerprint: digest(result.refresh_token) }
        return new Response(null, { status: 303, headers: { Location: `${origin}/#/media`, 'Set-Cookie': 'cathedral-drive-state=; HttpOnly; Secure; SameSite=Lax; Path=/api/media/drive; Max-Age=0', 'Cache-Control': 'no-store' } })
      }
      if (url.pathname.endsWith('/disconnect') && req.method === 'DELETE') {
        access = undefined; await pool.query('DELETE FROM cp_settings WHERE key=\'drive.credentials\''); return json({ disconnected: true })
      }
      throw new CloudError('not-found', 404)
    },
  }
}
export type CloudDrive = ReturnType<typeof createCloudDrive>
