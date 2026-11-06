// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { GoogleDrive } from '../../server/googleDrive'

afterEach(() => vi.unstubAllGlobals())
describe('shared church Drive credentials', () => {
  it('persists encrypted administrator client configuration and validates before replacing it', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'cathedral-drive-client-'))
    try {
      const drive = new GoogleDrive(directory, {})
      expect(drive.configured).toBe(false)
      drive.configureClient('1234567890-test.apps.googleusercontent.com', 'test-client-secret-private')
      const stored = await readFile(join(directory, 'drive-client'), 'utf8')
      expect(stored).not.toContain('test-client-secret-private')
      expect(stored).not.toContain('googleusercontent.com')
      expect(new GoogleDrive(directory, {}).configured).toBe(true)
      expect(() => drive.configureClient('invalid', 'short')).toThrow('drive-invalid-client')
      expect(await readFile(join(directory, 'drive-client'), 'utf8')).toBe(stored)
    } finally { await rm(directory, { recursive: true, force: true }) }
  })
  it('exchanges the code with PKCE, persists encrypted refresh credentials and reuses the folder on restart', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'cathedral-drive-'))
    try {
      const request = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
        if (String(url).includes('oauth2.googleapis.com/token')) {
          const body = init!.body as URLSearchParams
          if (body.get('grant_type') === 'authorization_code') expect(body.get('code_verifier')).toBe('verifier')
          return new Response(JSON.stringify({ access_token: 'test-access', refresh_token: 'test-refresh-private', expires_in: 3600 }), { status: 200 })
        }
        return new Response(JSON.stringify({ files: [{ id: 'church-folder' }] }), { status: 200 })
      })
      vi.stubGlobal('fetch', request)
      const env = { GOOGLE_DRIVE_CLIENT_ID: 'test-client', GOOGLE_DRIVE_CLIENT_SECRET: 'test-secret' }
      const drive = new GoogleDrive(directory, env)
      await drive.connect('code', 'verifier', 'church-admin')
      expect(drive.connected).toBe(true)
      expect(await readFile(join(directory, 'drive-credentials'), 'utf8')).not.toContain('test-refresh-private')
      const restored = new GoogleDrive(directory, env)
      expect(restored.ownerId).toBe('church-admin')
      await restored.list()
      expect(request).toHaveBeenCalledWith(expect.stringContaining('oauth2.googleapis.com/token'), expect.objectContaining({ body: expect.any(URLSearchParams) }))
      const refresh = request.mock.calls.find((call) => (call[1]?.body as URLSearchParams)?.get?.('grant_type') === 'refresh_token')
      expect((refresh![1]!.body as URLSearchParams).get('refresh_token')).toBe('test-refresh-private')
    } finally { await rm(directory, { recursive: true, force: true }) }
  })
})
