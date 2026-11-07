import type { Pool } from 'pg'
import { createCloudPool, rateLimit } from './database'
import { createCloudAuth, type CloudAuth } from './auth'
import { CloudError, checkOrigin, cloudOrigin, digest, errorResponse, json, type CloudEnvironment } from './http'
import { netlifyStorage, type CloudStorage } from './storage'
import { createCloudWorkspace } from './workspace'
import { createCloudInstallations } from './installations'
import { createCloudRelay } from './relay'
import { createCloudMedia } from './media'
import { createCloudDrive, type CloudDrive } from './drive'
import { secretMatches, readBytes } from './http'

export interface CloudRequestContext { ip?: string }
export function createCloudApp(env: CloudEnvironment, dependencies: { pool?: Pool; storage?: CloudStorage; drive?: CloudDrive } = {}) {
  let pool: Pool | undefined = dependencies.pool, auth: CloudAuth | undefined
  let media: ReturnType<typeof createCloudMedia> | undefined
  const services = () => {
    pool ??= createCloudPool(env)
    auth ??= createCloudAuth(pool, env)
    return { pool, auth }
  }
  return {
    async handle(request: Request, context: CloudRequestContext = {}) {
      try {
        const origin = cloudOrigin(env), path = new URL(request.url).pathname
        checkOrigin(request, origin, path === '/api/media/drive/callback' && request.method === 'GET')
        // Never trust a caller-supplied forwarding header for account throttling.
        const headers = new Headers(request.headers); headers.delete('x-cathedral-client-ip')
        headers.set('x-cathedral-client-ip', context.ip || 'unknown-client')
        let req = new Request(request, { headers })
        const { pool, auth } = services()
        if (path === '/api/app-health' && req.method === 'GET') {
          await rateLimit(pool, `health:${digest(context.ip || 'unknown-client')}`, 30, 60)
          await auth.initialize()
          const bootstrap = await pool.query('SELECT user_id FROM cp_bootstrap WHERE id=1')
          return json({ app: 'church-presenter', production: true, mode: 'cloud', configured: true, bootstrapRequired: !bootstrap.rows[0]?.user_id, emailReady: auth.emailReady })
        }
        if (path.startsWith('/api/auth/')) {
          if (!['GET','HEAD'].includes(req.method)) { const body = await readBytes(req, 32768); req = new Request(req.url, { method: req.method, headers: req.headers, body: body as Uint8Array<ArrayBuffer> }) }
          if (path.endsWith('/get-session')) {
            try { return json(await auth.session(req)) } catch (error) { if (error instanceof CloudError && [401,403].includes(error.status)) return json(null); throw error }
          }
          return await auth.handle(req)
        }
        await rateLimit(pool, `request:${digest(context.ip || 'unknown-client')}`, 600, 60)
        const installations = createCloudInstallations(pool)
        if (path === '/api/installations/pair/complete') {
          await rateLimit(pool, `pair:${digest(context.ip || 'unknown-client')}`, 10, 60)
          return await installations.complete(req)
        }
        const installation = await installations.authenticate(req)
        const cloudMedia = () => media ??= createCloudMedia(pool, env, dependencies.storage ?? netlifyStorage(), dependencies.drive ?? createCloudDrive(pool, env))
        if (path.startsWith('/api/worker/')) {
          const serviceWorker = secretMatches(req.headers.get('authorization')?.replace(/^Bearer /, '') ?? null, env.CATHEDRAL_WORKER_TOKEN)
          if (!serviceWorker && !installation?.canScan) throw new CloudError('worker-required', 403)
          return await cloudMedia().worker(req, { id: installation?.installationId ?? 'service-worker' })
        }
        if (path.startsWith('/api/admin/')) { if (installation) throw new CloudError('administrator-required', 403); return await auth.admin(req) }
        const current = installation ?? (await auth.session(req)).user
        if (path.startsWith('/api/installations')) return await installations.handle(req, current)
        if (path === '/api/output-relay') return await createCloudRelay(pool)(req, current)
        if (path.startsWith('/api/media/')) return await cloudMedia().handle(req, current)
        if (path.startsWith('/api/workspace')) {
          return await createCloudWorkspace(pool, dependencies.storage ?? netlifyStorage()).handle(req, current.id)
        }
        throw new CloudError('not-found', 404)
      } catch (error) {
        if (!(error instanceof CloudError)) {
          // Operational diagnostics must never log request bodies, cookies, tokens or database URLs.
          const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
          console.error(JSON.stringify({ event: 'cloud-request-failed', path: new URL(request.url).pathname.slice(0, 150), type: error instanceof Error ? error.name : 'unknown', ...( /^[A-Z0-9_]{3,32}$/.test(code) ? { code } : {}) }))
        }
        return errorResponse(error)
      }
    },
    async close() { if (!dependencies.pool) await pool?.end() },
  }
}
