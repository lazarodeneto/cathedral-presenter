// @vitest-environment node
import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer, type Server } from 'node:http'
import { createWorkspace } from '../../server/workspace'
let root: string, server: Server, url: string, workspace: ReturnType<typeof createWorkspace>
const headers = { 'X-Cathedral-Workspace': '1', 'Content-Type': 'application/json' }
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'cathedral-workspace-')); workspace = createWorkspace(root)
  server = createServer((req, res) => workspace.handle(req, res, () => res.writeHead(404).end()))
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  url = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/workspace`
})
afterEach(async () => { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); workspace.close(); await rm(root, { force: true, recursive: true }) })
describe('durable installation workspace', () => {
  it('shares revisions across clients, refuses stale writes and keeps previous versions across database restarts', async () => {
    const document = { services: [{ id: 's', title: 'Sunday' }], librarySongs: [], settings: { locale: 'pt-BR' } }
    const put = (expectedRevision: number, title: string) => fetch(url, { method: 'PUT', headers, body: JSON.stringify({ expectedRevision, document: { ...document, services: [{ id: 's', title }] } }) })
    expect((await fetch(url, { headers }).then((r) => r.json())).revision).toBe(0)
    expect((await put(0, 'Sunday')).status).toBe(200)
    expect((await put(0, 'Stale operator')).status).toBe(409)
    expect((await put(1, 'Updated Sunday')).status).toBe(200)
    workspace.close(); workspace = createWorkspace(root)
    const current = await fetch(url, { headers }).then((r) => r.json())
    expect(current.document.services[0].title).toBe('Updated Sunday')
    expect((await fetch(`${url}/revisions/1`, { headers }).then((r) => r.json())).document.services[0].title).toBe('Sunday')
    expect((await fetch(`${url}/history`, { headers }).then((r) => r.json())).revisions).toHaveLength(2)
  })
  it('rejects cross-origin writes and strips runtime/private keys', async () => {
    const body = JSON.stringify({ expectedRevision: 0, document: { services: [], librarySongs: [], live: { currentSlideId: 'untrusted' }, password: 'should-not-persist' } })
    expect((await fetch(url, { method: 'PUT', headers: { ...headers, Origin: 'https://attacker.example' }, body })).status).toBe(403)
    expect((await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body })).status).toBe(403)
    expect((await fetch(url, { method: 'PUT', headers, body })).status).toBe(200)
    const stored = (await fetch(url, { headers }).then((r) => r.json())).document
    expect(stored.live).toBeUndefined(); expect(stored.password).toBeUndefined()
  })
})
