import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { resolve } from 'node:path'
import { betterAuth, type BetterAuthOptions } from 'better-auth'
import { getMigrations } from 'better-auth/db/migration'
import { toNodeHandler } from 'better-auth/node'
import Database from 'better-sqlite3'
import type { Connect, Plugin } from 'vite'

export function accountAuth(): Plugin {
  return {
    name: 'church-presenter-accounts',
    configureServer: install,
    configurePreviewServer: install,
  }
}

function install(server: {
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
  const baseURL =
    process.env.BETTER_AUTH_URL || server.config.env.BETTER_AUTH_URL || 'http://localhost:4173'
  const options = {
    appName: 'Church Presenter',
    secret,
    baseURL,
    trustedOrigins: [new URL(baseURL).origin],
    database,
    emailAndPassword: { enabled: true, minPasswordLength: 12, maxPasswordLength: 128 },
    rateLimit: { enabled: true, storage: 'database' },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  } satisfies BetterAuthOptions
  const ready = getMigrations(options)
    .then(({ runMigrations }) => runMigrations())
    .then(() => toNodeHandler(betterAuth(options)))
    .catch(() => null)
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
