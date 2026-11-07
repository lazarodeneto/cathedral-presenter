import { betterAuth, type BetterAuthOptions } from 'better-auth'
import { APIError } from 'better-auth/api'
import { getMigrations } from 'better-auth/db/migration'
import { randomBytes, randomUUID } from 'node:crypto'
import nodemailer from 'nodemailer'
import type { Pool } from 'pg'
import { cloudOrigin, CloudError, digest, json, readJson, secretMatches, type CloudEnvironment } from './http'
import { transaction } from './database'

export function createCloudAuth(pool: Pool, env: CloudEnvironment) {
  const origin = cloudOrigin(env)
  if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32) throw new CloudError('cloud-auth-not-configured', 503)
  const mailer = env.SMTP_URL && env.SMTP_FROM ? nodemailer.createTransport(env.SMTP_URL) : null
  const emailReady = Boolean(mailer)
  const sendEmail = async (to: string, subject: string, url: string) => {
    if (!mailer) throw new CloudError('email-not-configured', 503)
    if (new URL(url).origin !== origin) throw new CloudError('invalid-email-link')
    await mailer.sendMail({ from: env.SMTP_FROM, to, subject, text: `Cathedral Presenter\n\n${url}\n\nIf you did not request this, ignore this message.` })
  }
  const options: BetterAuthOptions = {
    appName: 'Cathedral Presenter', secret: env.BETTER_AUTH_SECRET,
    baseURL: origin, trustedOrigins: [origin], database: pool,
    emailAndPassword: { enabled: true, minPasswordLength: 12, maxPasswordLength: 128, requireEmailVerification: emailReady,
      sendResetPassword: emailReady ? async ({ user, url }) => sendEmail(user.email, 'Cathedral Presenter — password reset', url) : undefined },
    emailVerification: { sendOnSignUp: emailReady, sendVerificationEmail: emailReady ? async ({ user, url }) => sendEmail(user.email, 'Cathedral Presenter — verify email', url) : undefined },
    user: { additionalFields: { role: { type: 'string', defaultValue: 'operator', input: false } } },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    rateLimit: { enabled: true, storage: 'database' },
    advanced: { ipAddress: { ipAddressHeaders: ['x-cathedral-client-ip'] } },
    databaseHooks: { session: { create: { before: async (session) => {
      const row = (await pool.query('SELECT role FROM "user" WHERE id=$1', [session.userId])).rows[0]
      // During sign-up the user can still be inside Better Auth's creation transaction.
      // Protected APIs always recheck the committed role; an existing disabled account cannot sign in.
      if (row && !['admin','operator'].includes(row.role)) throw new APIError('FORBIDDEN', { message: 'Access disabled.' })
      return { data: session }
    } } }, user: { create: {
      before: async (user, context) => {
        const token = context?.request?.headers.get('x-cathedral-invitation') ?? null
        const email = user.email.toLowerCase()
        const bootstrap = email === env.CATHEDRAL_ADMIN_EMAIL?.trim().toLowerCase() && secretMatches(token, env.CATHEDRAL_BOOTSTRAP_TOKEN)
        if (bootstrap) {
          const allowed = await transaction(pool, async (client) => {
            const row = await client.query('SELECT user_id FROM cp_bootstrap WHERE id=1 FOR UPDATE')
            if (!row.rowCount || row.rows[0].user_id) return false
            // Reserve before user creation. Only the same owner secret can retry a failed bootstrap.
            return true
          })
          if (allowed) return { data: { ...user, role: 'admin' } }
        }
        if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) {
          const result = await pool.query('UPDATE cp_invitations SET used_by=$1 WHERE token_hash=$2 AND lower(email)=$3 AND used_by IS NULL AND expires_at>now() RETURNING role', [user.id || email, digest(token), email])
          if (result.rowCount) return { data: { ...user, role: result.rows[0].role } }
        }
        throw new APIError('FORBIDDEN', { message: 'A valid administrator invitation is required.' })
      },
      after: async (user, context) => {
        if ((user as { role?: string }).role === 'admin' && user.email.toLowerCase() === env.CATHEDRAL_ADMIN_EMAIL?.trim().toLowerCase() && secretMatches(context?.request?.headers.get('x-cathedral-invitation') ?? null, env.CATHEDRAL_BOOTSTRAP_TOKEN)) {
          await pool.query('UPDATE cp_bootstrap SET user_id=$1 WHERE id=1 AND user_id IS NULL', [user.id])
        }
      },
    } } },
  }
  let auth: ReturnType<typeof betterAuth> | undefined
  let ready: Promise<void> | undefined
  const initialize = () => ready ??= (async () => {
    const lock = await pool.connect()
    try {
      await lock.query('SELECT pg_advisory_lock(1729041301)')
      const { runMigrations } = await getMigrations(options); await runMigrations()
      // Better Auth validates the schema during construction. Construct only after
      // migration completes, otherwise a cold serverless instance caches a failed context.
      auth = betterAuth(options)
    } finally { await lock.query('SELECT pg_advisory_unlock(1729041301)'); lock.release() }
  })().catch((error) => { ready = undefined; throw error })
  const session = async (req: Request) => {
    await initialize()
    const current = await auth!.api.getSession({ headers: req.headers })
    if (!current) throw new CloudError('sign-in-required', 401)
    const { rows } = await pool.query('SELECT role FROM "user" WHERE id=$1', [current.user.id])
    if (!rows.length || !['admin', 'operator'].includes(rows[0].role)) throw new CloudError('access-revoked', 403)
    return { ...current, user: { ...current.user, role: rows[0].role as 'admin' | 'operator' } }
  }
  return { initialize, session, emailReady,
    async handle(req: Request) { await initialize(); return auth!.handler(req) },
    async admin(req: Request) {
      const current = await session(req)
      if (current.user.role !== 'admin') throw new CloudError('administrator-required', 403)
      const path = new URL(req.url).pathname
      if (path === '/api/admin/users' && req.method === 'GET') return json({ users: (await pool.query('SELECT id,name,email,role,"emailVerified" FROM "user" ORDER BY "createdAt"')).rows })
      if (path === '/api/admin/invitations' && req.method === 'GET') return json({ invitations: (await pool.query('SELECT id,email,role,expires_at,used_by,created_at FROM cp_invitations ORDER BY created_at DESC LIMIT 100')).rows })
      if (path === '/api/admin/invitations' && req.method === 'POST') {
        const body = await readJson(req, 2048), email = String(body.email ?? '').trim().toLowerCase(), role = body.role === 'admin' ? 'admin' : 'operator'
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new CloudError('invalid-email')
        const token = randomBytes(32).toString('base64url'), id = randomUUID()
        await pool.query('INSERT INTO cp_invitations(id,token_hash,email,role,expires_at,created_by) VALUES($1,$2,$3,$4,now()+interval \'7 days\',$5)', [id, digest(token), email, role, current.user.id])
        return json({ id, email, role, url: `${origin}/#/login?mode=signup&invite=${token}` }, 201)
      }
      const invitation = /^\/api\/admin\/invitations\/([0-9a-f-]{36})$/.exec(path)
      if (invitation && req.method === 'DELETE') { await pool.query('UPDATE cp_invitations SET expires_at=now() WHERE id=$1 AND used_by IS NULL', [invitation[1]]); return json({ revoked: true }) }
      const user = /^\/api\/admin\/users\/([A-Za-z0-9_-]{1,140})$/.exec(path)
      if (user && req.method === 'PATCH') {
        const body = await readJson(req, 1024), role = String(body.role)
        if (!['admin', 'operator', 'disabled'].includes(role) || user[1] === current.user.id) throw new CloudError('invalid-role-change')
        await transaction(pool, async (client) => {
          await client.query('LOCK TABLE "user" IN SHARE ROW EXCLUSIVE MODE')
          const target = await client.query('SELECT role FROM "user" WHERE id=$1', [user[1]])
          if (!target.rowCount) throw new CloudError('not-found', 404)
          if (target.rows[0].role === 'admin' && role !== 'admin' && Number((await client.query('SELECT count(*) AS count FROM "user" WHERE role=\'admin\'')).rows[0].count) < 2) throw new CloudError('last-administrator', 409)
          await client.query('UPDATE "user" SET role=$1 WHERE id=$2', [role, user[1]])
          if (role === 'disabled') await client.query('DELETE FROM session WHERE "userId"=$1', [user[1]])
        })
        return json({ updated: true })
      }
      throw new CloudError('not-found', 404)
    },
  }
}
export type CloudAuth = ReturnType<typeof createCloudAuth>
