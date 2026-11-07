import { getStore } from '@netlify/blobs'
export const CHUNK_BYTES = 2 * 1024 * 1024
export interface CloudStorage {
  get(key: string): Promise<Uint8Array | null>
  set(key: string, bytes: Uint8Array): Promise<void>
  delete(key: string): Promise<void>
}
export function netlifyStorage(): CloudStorage {
  const store = () => getStore({ name: 'cathedral-private', consistency: 'strong' })
  return {
    async get(key) { const data = await store().get(key, { type: 'arrayBuffer' }); return data ? new Uint8Array(data) : null },
    async set(key, bytes) { await store().set(key, new Blob([bytes as Uint8Array<ArrayBuffer>])) },
    async delete(key) { await store().delete(key) },
  }
}
export const partKey = (id: string, part: number) => `uploads/${id}/${part}`
export const incomingPartKey = (id: string, part: number, sha256: string) => `incoming/${id}/${part}/${sha256}`
