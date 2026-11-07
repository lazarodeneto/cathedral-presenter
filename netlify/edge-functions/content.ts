import { protectedContent } from '../../server/cloud/content.ts'
// Netlify's Edge bundler resolves npm packages from this import map entry.
import { getStore } from '@netlify/blobs'
import type { Config } from '@netlify/edge-functions'
export default (request: Request) => protectedContent(request, Netlify.env.get('CATHEDRAL_ENCRYPTION_KEY') ?? '', {
  async get(key) { const value = await getStore({ name: 'cathedral-private', consistency: 'strong' }).get(key, { type: 'arrayBuffer' }); return value ? new Uint8Array(value) : null },
  async set() { throw new Error('read-only') }, async delete() { throw new Error('read-only') },
})
export const config: Config = { path: '/protected/media/*' }
