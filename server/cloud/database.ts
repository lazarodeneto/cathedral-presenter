import { Pool, type PoolClient } from 'pg'
import { getConnectionString } from '@netlify/database'
import type { CloudEnvironment } from './http'
import { CloudError } from './http'

export function createCloudPool(env: CloudEnvironment) {
  let connectionString = env.DATABASE_URL
  if (!connectionString) { try { connectionString = getConnectionString() } catch { throw new CloudError('cloud-database-not-configured', 503) } }
  const url = new URL(connectionString)
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new CloudError('cloud-database-not-configured', 503)
  if (['prefer','require','verify-ca'].includes(url.searchParams.get('sslmode') || '')) url.searchParams.set('sslmode', 'verify-full')
  return new Pool({ connectionString: url.toString(), max: 4, idleTimeoutMillis: 10000, connectionTimeoutMillis: 8000, allowExitOnIdle: true })
}
export async function transaction<T>(pool: Pool, work: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect()
  try { await client.query('BEGIN'); const result = await work(client); await client.query('COMMIT'); return result }
  catch (error) { await client.query('ROLLBACK'); throw error }
  finally { client.release() }
}
export async function rateLimit(pool: Pool, key: string, maximum: number, seconds: number) {
  if (Math.random() < 0.02) await pool.query("DELETE FROM cp_rate_limits WHERE key IN (SELECT key FROM cp_rate_limits WHERE expires_at<now()-interval '1 day' LIMIT 1000)")
  const { rows } = await pool.query(`INSERT INTO cp_rate_limits(key,count,expires_at) VALUES ($1,1,now()+$2*interval '1 second')
    ON CONFLICT(key) DO UPDATE SET count=CASE WHEN cp_rate_limits.expires_at<now() THEN 1 ELSE cp_rate_limits.count+1 END,
    expires_at=CASE WHEN cp_rate_limits.expires_at<now() THEN excluded.expires_at ELSE cp_rate_limits.expires_at END RETURNING count`, [key, seconds])
  if (rows[0].count > maximum) throw new CloudError('rate-limit', 429)
}
