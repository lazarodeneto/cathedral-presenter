// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { issueFileTicket, verifyFileTicket } from '../../server/cloud/tickets'
import { protectedContent } from '../../server/cloud/content'
import { CHUNK_BYTES, incomingPartKey, type CloudStorage } from '../../server/cloud/storage'
import { digest } from '../../server/cloud/http'
const secret = 'cd'.repeat(32), id = '77777777-7777-4777-8777-777777777777'
describe('private cloud media delivery', () => {
  it('rejects expired, altered and cross-file tickets', async () => {
    const ticket = await issueFileTicket(secret, { id, key: `assets/${id}/manifest`, expires: Date.now() + 60000 })
    expect(await verifyFileTicket(secret, ticket, id)).not.toBeNull()
    expect(await verifyFileTicket(secret, ticket, 'different-file')).toBeNull()
    expect(await verifyFileTicket(secret, ticket, id, Date.now() + 120000)).toBeNull()
    expect(await verifyFileTicket(secret, `${ticket}tampered`, id)).toBeNull()
  })
  it('returns exact byte ranges across chunk boundaries and never reads unrelated media', async () => {
    const data = new Uint8Array(CHUNK_BYTES + 10); data.fill(65); data.set([66,67,68,69], CHUNK_BYTES - 2)
    const hashes = [digest(data.slice(0, CHUNK_BYTES)), digest(data.slice(CHUNK_BYTES))]
    const map = new Map<string, Uint8Array>([[`assets/${id}/manifest`, new TextEncoder().encode(JSON.stringify({ id, uploadId: id, size: data.length, mime: 'video/mp4', parts: 2, partHashes: hashes, sha256: 'unused-for-read' }))], [incomingPartKey(id, 0, hashes[0]), data.slice(0, CHUNK_BYTES)], [incomingPartKey(id, 1, hashes[1]), data.slice(CHUNK_BYTES)]])
    const storage: CloudStorage = { get: async (key) => map.get(key) ?? null, set: async () => {}, delete: async () => {} }
    const ticket = await issueFileTicket(secret, { id, key: `assets/${id}/manifest`, expires: Date.now() + 60000 })
    const url = `https://church.example/protected/media/${id}?ticket=${ticket}`
    const ranged = await protectedContent(new Request(url, { headers: { Range: `bytes=${CHUNK_BYTES - 2}-${CHUNK_BYTES + 1}` } }), secret, storage)
    expect(ranged.status).toBe(206); expect(ranged.headers.get('Content-Range')).toBe(`bytes ${CHUNK_BYTES - 2}-${CHUNK_BYTES + 1}/${data.length}`)
    expect(new TextDecoder().decode(await ranged.arrayBuffer())).toBe('BCDE')
    expect((await protectedContent(new Request(url, { headers: { Range: 'bytes=999999999-' } }), secret, storage)).status).toBe(416)
    expect((await protectedContent(new Request(url.replace(ticket, 'invalid')), secret, storage)).status).toBe(403)
    const head = await protectedContent(new Request(url, { method: 'HEAD' }), secret, storage)
    expect(head.headers.get('Content-Length')).toBe(String(data.length)); expect(await head.text()).toBe('')
  })
})
