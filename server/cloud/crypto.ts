import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { CloudError, type CloudEnvironment } from './http'
export function cloudEncryption(env: CloudEnvironment) {
  const raw = env.CATHEDRAL_ENCRYPTION_KEY
  if (!raw || !/^[0-9a-f]{64}$/i.test(raw)) throw new CloudError('cloud-encryption-not-configured', 503)
  const key = Buffer.from(raw, 'hex')
  return {
    encrypt(value: unknown) {
      const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv)
      const bytes = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()])
      return [iv, cipher.getAuthTag(), bytes].map((part) => part.toString('base64url')).join('.')
    },
    decrypt<T>(value: string): T {
      const [iv, tag, content] = value.split('.')
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url')); decipher.setAuthTag(Buffer.from(tag, 'base64url'))
      return JSON.parse(Buffer.concat([decipher.update(Buffer.from(content, 'base64url')), decipher.final()]).toString())
    },
  }
}
