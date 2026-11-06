import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { join } from 'node:path'

interface DriveCredentials { refreshToken: string; folderId: string; ownerId: string }
export interface DriveFile { id: string; name: string; mimeType: string; size?: string; appProperties?: Record<string, string> }
export class GoogleDrive {
  private credentials?: DriveCredentials
  private access?: { token: string; expires: number }
  private key: Buffer
  private file: string
  private clientFile: string
  constructor(directory: string, private env: Record<string, string | undefined>) {
    const keyFile = join(directory, 'drive-key')
    if (!existsSync(keyFile)) writeFileSync(keyFile, randomBytes(32), { mode: 0o600, flag: 'wx' })
    this.key = readFileSync(keyFile)
    this.file = join(directory, 'drive-credentials')
    this.clientFile = join(directory, 'drive-client')
    if (!this.configured) {
      try {
        const [iv, tag, content] = readFileSync(this.clientFile, 'utf8').split('.')
        const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(iv, 'base64')); decipher.setAuthTag(Buffer.from(tag, 'base64'))
        const configured = JSON.parse(Buffer.concat([decipher.update(Buffer.from(content, 'base64')), decipher.final()]).toString())
        this.env.GOOGLE_DRIVE_CLIENT_ID = configured.clientId; this.env.GOOGLE_DRIVE_CLIENT_SECRET = configured.clientSecret
      } catch { /* Administrator has not configured this installation. */ }
    }
    try {
      const [iv, tag, content] = readFileSync(this.file, 'utf8').split('.')
      const decrypt = createDecipheriv('aes-256-gcm', this.key, Buffer.from(iv, 'base64'))
      decrypt.setAuthTag(Buffer.from(tag, 'base64'))
      this.credentials = JSON.parse(Buffer.concat([decrypt.update(Buffer.from(content, 'base64')), decrypt.final()]).toString())
    } catch { /* Not connected on this installation. */ }
  }
  get configured() { return Boolean(this.env.GOOGLE_DRIVE_CLIENT_ID && this.env.GOOGLE_DRIVE_CLIENT_SECRET) }
  get connected() { return Boolean(this.credentials) }
  get ownerId() { return this.credentials?.ownerId }
  get redirectUri() { return `${this.env.BETTER_AUTH_URL || 'http://localhost:4173'}/api/media/drive/callback` }
  configureClient(clientId: string, clientSecret: string) {
    if (!/^[A-Za-z0-9._-]{10,255}\.apps\.googleusercontent\.com$/.test(clientId) || !/^\S{12,256}$/.test(clientSecret)) throw new Error('drive-invalid-client')
    if (this.connected) throw new Error('drive-already-connected')
    const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', this.key, iv)
    const encrypted = Buffer.concat([cipher.update(JSON.stringify({ clientId, clientSecret })), cipher.final()])
    const temporary = `${this.clientFile}.${randomUUID()}`
    writeFileSync(temporary, [iv, cipher.getAuthTag(), encrypted].map((v) => v.toString('base64')).join('.'), { mode: 0o600 }); renameSync(temporary, this.clientFile)
    this.env.GOOGLE_DRIVE_CLIENT_ID = clientId; this.env.GOOGLE_DRIVE_CLIENT_SECRET = clientSecret
  }
  private async token(body: URLSearchParams) {
    body.set('client_id', this.env.GOOGLE_DRIVE_CLIENT_ID ?? '')
    body.set('client_secret', this.env.GOOGLE_DRIVE_CLIENT_SECRET ?? '')
    const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body, signal: AbortSignal.timeout(20000) })
    if (!response.ok) throw new Error('drive-auth-failed')
    return await response.json() as { access_token: string; expires_in: number; refresh_token?: string }
  }
  private save(credentials: DriveCredentials) {
    const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', this.key, iv)
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(credentials)), cipher.final()])
    const temp = `${this.file}.${randomUUID()}`
    writeFileSync(temp, [iv, cipher.getAuthTag(), encrypted].map((value) => value.toString('base64')).join('.'), { mode: 0o600 })
    renameSync(temp, this.file)
    this.credentials = credentials
  }
  private async accessToken() {
    if (this.access && this.access.expires > Date.now() + 60000) return this.access.token
    if (!this.credentials) throw new Error('drive-not-connected')
    const result = await this.token(new URLSearchParams({ grant_type: 'refresh_token', refresh_token: this.credentials.refreshToken }))
    this.access = { token: result.access_token, expires: Date.now() + result.expires_in * 1000 }
    return result.access_token
  }
  async request(path: string, init: RequestInit = {}) {
    const response = await fetch(`https://www.googleapis.com/drive/v3/${path}`, { ...init, headers: { ...init.headers, Authorization: `Bearer ${await this.accessToken()}` }, signal: AbortSignal.timeout(30000) })
    if (!response.ok) throw new Error('drive-request-failed')
    return response
  }
  async connect(code: string, verifier: string, ownerId: string) {
    const result = await this.token(new URLSearchParams({ grant_type: 'authorization_code', code, code_verifier: verifier, redirect_uri: this.redirectUri }))
    const refreshToken = result.refresh_token
    if (!refreshToken) throw new Error('drive-auth-failed')
    this.access = { token: result.access_token, expires: Date.now() + result.expires_in * 1000 }
    // Keep credentials in memory until folder creation succeeds; persist only a complete connection.
    const previous = this.credentials
    this.credentials = { refreshToken, folderId: previous?.folderId ?? '', ownerId }
    try {
      const query = new URLSearchParams({ q: "mimeType='application/vnd.google-apps.folder' and trashed=false and appProperties has { key='cathedralFolder' and value='media' }", fields: 'files(id)', pageSize: '10' })
      const folders = await (await this.request(`files?${query}`)).json() as { files: { id: string }[] }
      let folderId = folders.files[0]?.id
      if (!folderId) {
        const folder = await (await this.request('files?fields=id', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Cathedral Presenter', mimeType: 'application/vnd.google-apps.folder', appProperties: { cathedralFolder: 'media' } }) })).json() as { id: string }
        folderId = folder.id
      }
      this.save({ refreshToken, folderId, ownerId })
    } catch (error) { this.credentials = previous; this.access = undefined; throw error }
  }
  async upload(file: string, metadata: { id: string; name: string; mime: string; sha256: string }): Promise<DriveFile> {
    const size = (await stat(file)).size
    const init = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,size,appProperties', {
      method: 'POST', headers: { Authorization: `Bearer ${await this.accessToken()}`, 'Content-Type': 'application/json', 'X-Upload-Content-Type': metadata.mime, 'X-Upload-Content-Length': String(size) },
      body: JSON.stringify({ name: metadata.name, parents: [this.credentials!.folderId], appProperties: { cathedralMediaId: metadata.id, sha256: metadata.sha256 } }), signal: AbortSignal.timeout(20000),
    })
    const location = init.headers.get('location')
    if (!init.ok || !location || new URL(location).origin !== 'https://www.googleapis.com') throw new Error('drive-upload-failed')
    const response = await fetch(location, { method: 'PUT', headers: { Authorization: `Bearer ${await this.accessToken()}`, 'Content-Type': metadata.mime, 'Content-Length': String(size) }, body: createReadStream(file) as never, duplex: 'half', signal: AbortSignal.timeout(180000) } as RequestInit & { duplex: 'half' })
    if (!response.ok) throw new Error('drive-upload-failed')
    return response.json() as Promise<DriveFile>
  }
  async list(): Promise<DriveFile[]> {
    if (!this.credentials) return []
    const files: DriveFile[] = []
    let pageToken = ''
    do {
      const query = new URLSearchParams({ q: `'${this.credentials.folderId}' in parents and trashed=false and (mimeType contains 'image/' or mimeType contains 'video/' or mimeType contains 'audio/')`, fields: 'nextPageToken,files(id,name,mimeType,size,appProperties)', pageSize: '100', ...(pageToken ? { pageToken } : {}) })
      const page = await (await this.request(`files?${query}`)).json() as { files: DriveFile[]; nextPageToken?: string }
      files.push(...page.files)
      pageToken = page.nextPageToken ?? ''
    } while (pageToken && files.length < 2000)
    return files
  }
}
