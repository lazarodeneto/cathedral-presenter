// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createMediaLibrary } from '../../server/mediaLibrary'
import { buildBackup } from '../security/backup'
import type { AppSettings, Branding, Service } from '../types'
import { zipSync, strToU8 } from 'fflate'
import type { ScanResult } from '../../server/antivirus'

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64')
let root: string, url: string, server: Server, library: ReturnType<typeof createMediaLibrary>
const scan = vi.fn<(path: string) => Promise<ScanResult>>()
const headers = { 'Content-Type': 'image/png', 'X-File-Name': 'picture.png', 'X-Cathedral-Media': '1', Authorization: 'Bearer local-test' }
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'cathedral-media-'))
  scan.mockReset().mockResolvedValue('clean')
  library = createMediaLibrary(root, {}, async (req) => req.headers.authorization === 'Bearer local-test' ? { user: { id: 'operator', email: 'operator@example.test', role: 'admin' } } : req.headers.authorization === 'Bearer ordinary-operator' ? { user: { id: 'ordinary', email: 'ordinary@example.test', role: 'operator' } } : null, scan)
  server = createServer((req, res) => library.handle(req, res, () => { res.writeHead(404).end() }))
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  url = `http://127.0.0.1:${(server.address() as { port: number }).port}`
})
afterEach(async () => { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); library.close(); await rm(root, { recursive: true, force: true }) })

describe('scanned server media storage', () => {
  it('limits Drive configuration to administrators and never returns the secret', async () => {
    const body = JSON.stringify({ clientId: '1234567890-test.apps.googleusercontent.com', clientSecret: 'test-secret-private-value' })
    const configHeaders = { ...headers, 'Content-Type': 'application/json' }
    expect((await fetch(`${url}/api/media/drive/config`, { method: 'POST', headers: { ...configHeaders, Authorization: '' }, body })).status).toBe(401)
    expect((await fetch(`${url}/api/media/drive/config`, { method: 'POST', headers: { ...configHeaders, Authorization: 'Bearer ordinary-operator' }, body })).status).toBe(403)
    const response = await fetch(`${url}/api/media/drive/config`, { method: 'POST', headers: configHeaders, body })
    expect(response.status).toBe(200)
    expect(await response.text()).not.toContain('test-secret-private-value')
    expect((await (await fetch(`${url}/api/media/status`, { headers })).json()).drive).toMatchObject({ configured: true, connected: false })
  })
  it('persists names and canonical tags without replacing the file or its playback URL', async () => {
    const { asset } = await (await fetch(`${url}/api/media/upload`, { method: 'POST', headers, body: png })).json()
    const response = await fetch(`${url}${asset.source}`, { method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Sunday image', tags: ['Worship', 'Pr. Sidney'] }) })
    expect(response.status).toBe(200)
    expect((await response.json()).asset).toMatchObject({ name: 'Sunday image', source: asset.source, tags: ['Louvor', 'Pr. Sidney Santos'] })
    const list = await (await fetch(`${url}/api/media/library`, { headers })).json()
    expect(list.assets[0].name).toBe('Sunday image')
    expect(await readFile(join(root, '.data/media/files', asset.id))).toEqual(png)
  })
  it('stores a clean upload privately, lists it and serves byte ranges for output playback', async () => {
    const response = await fetch(`${url}/api/media/upload`, { method: 'POST', headers, body: png })
    expect(response.status).toBe(201)
    const { asset } = await response.json()
    expect(asset).toMatchObject({ name: 'picture.png', storage: 'local', scan: 'clean', size: png.length })
    expect(scan).toHaveBeenCalledOnce()
    expect(await readFile(join(root, '.data/media/files', asset.id))).toEqual(png)
    const ranged = await fetch(`${url}${asset.source}`, { headers: { Range: 'bytes=0-7' } })
    expect(ranged.status).toBe(206)
    expect(Buffer.from(await ranged.arrayBuffer())).toEqual(png.subarray(0, 8))
    expect(ranged.headers.get('x-content-type-options')).toBe('nosniff')
    const list = await (await fetch(`${url}/api/media/library`, { headers })).json()
    expect(list.assets).toHaveLength(1)
  })
  it.each([['infected', 422, 'virus-detected'], ['unavailable', 503, 'scanner-unavailable']] as const)('quarantines and refuses a file when scanning reports %s', async (verdict, status, reason) => {
    scan.mockResolvedValue(verdict)
    const response = await fetch(`${url}/api/media/upload`, { method: 'POST', headers, body: png })
    expect(response.status).toBe(status)
    expect(await response.json()).toEqual({ reason })
    expect(await readdir(join(root, '.data/media/files'))).toEqual([])
    expect(await readdir(join(root, '.data/media/quarantine'))).toEqual([])
    expect((await (await fetch(`${url}/api/media/library`, { headers })).json()).assets).toEqual([])
  })
  it('rejects unauthenticated, cross-origin and spoofed-image uploads before storage', async () => {
    expect((await fetch(`${url}/api/media/upload`, { method: 'POST', headers: { ...headers, Authorization: '' }, body: png })).status).toBe(401)
    expect((await fetch(`${url}/api/media/upload`, { method: 'POST', headers: { ...headers, Origin: 'https://attacker.example' }, body: png })).status).toBe(403)
    const spoofed = await fetch(`${url}/api/media/upload`, { method: 'POST', headers, body: '<script>alert(1)</script>' })
    expect(spoofed.status).toBe(400)
    expect(scan).not.toHaveBeenCalled()
  })
  it('keeps deletion recoverable and does not expose unavailable Drive as connected', async () => {
    const { asset } = await (await fetch(`${url}/api/media/upload`, { method: 'POST', headers, body: png })).json()
    expect((await fetch(`${url}${asset.source}`, { method: 'DELETE', headers })).status).toBe(200)
    expect((await fetch(`${url}${asset.source}`)).status).toBe(404)
    expect(await readFile(join(root, '.data/media/files', asset.id))).toEqual(png)
    expect((await (await fetch(`${url}/api/media/status`, { headers })).json()).drive.connected).toBe(false)
    expect((await fetch(`${url}/api/media/drive/connect`, { method: 'POST', headers })).status).toBe(503)
  })
  it('rejects OAuth callbacks without a matching one-time session state', async () => {
    expect((await fetch(`${url}/api/media/drive/callback?code=untrusted&state=untrusted`, { headers })).status).toBe(403)
  })
})


describe('portable media packages', () => {
  async function packageFixture() {
    const { asset } = await (await fetch(`${url}/api/media/upload`, { method: 'POST', headers, body: png })).json()
    const backup = buildBackup({ services: [{ id: 'service', title: 'Sunday', date: '2026-11-06', time: '10:00', sections: [{ id: 'section', title: 'Welcome', itemIds: ['item'] }], items: [{ id: 'item', title: 'Picture', type: 'media', slides: [{ id: 'slide', kind: 'media', title: 'Picture', text: '', elements: [{ id: 'image', type: 'image', source: asset.source, visible: true, x: 0, y: 0, width: 100, height: 100, zIndex: 0, opacity: 1 }], background: { type: 'preset', preset: 'graphite' }, textAlign: 'center' }] }] } as Service], settings: {} as AppSettings, branding: {} as Branding, monitors: [], media: [asset], librarySongs: [{ id: 'song', title: 'Amazing Grace', lyrics: 'Amazing grace', createdAt: '', updatedAt: '' }] })
    const exported = await fetch(`${url}/api/media/packages/export`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(backup) })
    expect(exported.status).toBe(200)
    const { download } = await exported.json()
    const archive = Buffer.from(await (await fetch(`${url}${download}`, { headers })).arrayBuffer())
    return { asset, archive }
  }
  it('restores original bytes and songs, remaps references and never overwrites existing media', async () => {
    const { asset, archive } = await packageFixture()
    const response = await fetch(`${url}/api/media/packages/import`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/zip' }, body: archive })
    expect(response.status).toBe(200)
    const { parsed } = await response.json()
    expect(parsed.librarySongs[0].title).toBe('Amazing Grace')
    expect(parsed.media[0].id).not.toBe(asset.id)
    expect(parsed.services[0].items[0].slides[0].elements[0].source).toBe(parsed.media[0].source)
    expect(Buffer.from(await (await fetch(`${url}${parsed.media[0].source}`)).arrayBuffer())).toEqual(png)
    expect(await readFile(join(root, '.data/media/files', asset.id))).toEqual(png)
  })
  it('refuses an infected restore atomically and rejects archive traversal', async () => {
    const { archive } = await packageFixture()
    const before = await readdir(join(root, '.data/media/files'))
    scan.mockResolvedValue('infected')
    expect((await fetch(`${url}/api/media/packages/import`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/zip' }, body: archive })).status).toBe(422)
    expect(await readdir(join(root, '.data/media/files'))).toEqual(before)
    const malicious = zipSync({ '../escape': strToU8('bad') })
    const response = await fetch(`${url}/api/media/packages/import`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/zip' }, body: Buffer.from(malicious) })
    expect(response.ok).toBe(false)
    expect((await readdir(join(root, '.data/media/packages'))).some((name) => name.startsWith('.restore-'))).toBe(false)
  })
})
