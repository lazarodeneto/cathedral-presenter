import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { resolve } from 'node:path'
import { betterAuth, type BetterAuthOptions } from 'better-auth'
import { getMigrations } from 'better-auth/db/migration'
import { toNodeHandler } from 'better-auth/node'
import { fromNodeHeaders } from 'better-auth/node'
import type { IncomingMessage } from 'node:http'
import Database from 'better-sqlite3'
import type { Connect, Plugin } from 'vite'

let authReady: Promise<ReturnType<typeof betterAuth>> | undefined
export async function accountSession(req: IncomingMessage) {
  const auth = await authReady
  return auth ? auth.api.getSession({ headers: fromNodeHeaders(req.headers) }) : null
}

export function accountAuth(environment: Record<string, string> = {}): Plugin {
  return {
    name: 'church-presenter-accounts',
    configureServer: (server) => installAccounts({ ...server, config: { ...server.config, env: { ...server.config.env, ...environment, ...process.env } as Record<string, string> } }),
    configurePreviewServer: (server) => installAccounts({ ...server, config: { ...server.config, env: { ...server.config.env, ...environment, ...process.env } as Record<string, string> } }),
  }
}

export function installAccounts(server: {
  middlewares: { use: (handler: Connect.NextHandleFunction) => unknown }
  httpServer?: { once: (event: string, callback: () => void) => unknown } | null
  config: { root: string; env: Record<string, string> }
}) {
  // Auth material is server-only and must never live under public/ or dist/.
  const directory = resolve(server.config.root, '.data')
  mkdirSync(directory, { recursive: true, mode: 0o700 })
  let secret = process.env.BETTER_AUTH_SECRET || server.config.env.BETTER_AUTH_SECRET
  if (!secret) {
    const file = resolve(directory, 'auth-secret')
    try {
      secret = readFileSync(file, 'utf8')
    } catch {
      secret = randomBytes(48).toString('base64url')
      writeFileSync(file, secret, { mode: 0o600, flag: 'wx' })
    }
  }
  const database = new Database(resolve(directory, 'accounts.sqlite'))
  database.pragma('journal_mode = WAL')
  database.exec('CREATE TABLE IF NOT EXISTS installation_owner (singleton INTEGER PRIMARY KEY CHECK(singleton=1), userId TEXT NOT NULL)')
  const baseURL =
    server.config.env.BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || 'http://localhost:4173'
  const options: BetterAuthOptions = {
    appName: 'Church Presenter',
    secret,
    baseURL,
    trustedOrigins: [new URL(baseURL).origin],
    database,
    emailAndPassword: { enabled: true, minPasswordLength: 12, maxPasswordLength: 128 },
    user: { additionalFields: { role: { type: 'string', defaultValue: 'operator', input: false } } },
    rateLimit: { enabled: true, storage: 'database' },
    databaseHooks: { user: { create: { after: async (user) => {
      database.transaction(() => {
        const claim = database.prepare('INSERT OR IGNORE INTO installation_owner(singleton,userId) VALUES (1,?)').run(user.id)
        if (claim.changes) database.prepare("UPDATE user SET role='admin' WHERE id=?").run(user.id)
      })()
    } } } },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  }
  const initialized = getMigrations(options)
    .then(async ({ runMigrations }) => {
      await runMigrations()
      const administrator = database.prepare("SELECT id FROM user WHERE role='admin' LIMIT 1").get() as { id: string } | undefined
      if (administrator) database.prepare('INSERT OR IGNORE INTO installation_owner(singleton,userId) VALUES (1,?)').run(administrator.id)
    })
    .then(() => betterAuth(options))
  authReady = initialized
  const ready = initialized.then((auth) => toNodeHandler(auth)).catch(() => null)
  server.middlewares.use((req, res, next) => {
    // Stop the static dev/preview server from exposing account files.
    let pathname: string
    try {
      pathname = decodeURIComponent(new URL(req.url ?? '/', baseURL).pathname)
    } catch {
      res.statusCode = 400
      res.end()
      return
    }
    if (pathname.split('/').includes('.data')) {
      res.statusCode = 404
      res.end()
      return
    }
    if (req.url?.startsWith('/api/admin/')) {
      void initialized.then(async (auth) => {
        const host = req.headers.host ?? '', origin = req.headers.origin
        if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host) || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '') || req.headers['sec-fetch-site'] === 'cross-site' || (origin && origin !== new URL(baseURL).origin) || req.headers['x-cathedral-admin'] !== '1') { res.writeHead(403).end(); return }
        const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) })
        const role = session ? (database.prepare('SELECT role FROM user WHERE id=?').get(session.user.id) as { role: string } | undefined)?.role : null
        if (role !== 'admin') { res.writeHead(403).end(); return }
        res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store')
        if (req.method === 'GET' && req.url === '/api/admin/users') { res.end(JSON.stringify({ users: database.prepare('SELECT id,name,email,role FROM user ORDER BY createdAt').all() })); return }
        res.writeHead(405).end()
      }).catch(() => { if (!res.headersSent) res.writeHead(503).end() })
      return
    }
    if (!req.url?.startsWith('/api/auth/')) return next()
    void ready
      .then((handle) => {
        if (!handle) throw new Error('Account initialization failed')
        return handle(req, res)
      })
      .catch(() => {
        if (!res.headersSent) {
          res.statusCode = 503
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ message: 'Account service unavailable' }))
        }
      })
  })
  server.httpServer?.once('close', () => database.close())
}
