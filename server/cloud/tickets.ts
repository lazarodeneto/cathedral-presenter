export interface FileTicket { id: string; key: string; expires: number }
const encode = (value: Uint8Array) => btoa(String.fromCharCode(...value)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
const decode = (value: string) => Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), (c) => c.charCodeAt(0))
async function key(secret: string) {
  if (!/^[a-f0-9]{64}$/i.test(secret)) throw new Error('media-signing-not-configured')
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`cathedral-media-ticket-v1:${secret}`))
  return crypto.subtle.importKey('raw', bytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}
export async function issueFileTicket(secret: string, payload: FileTicket) {
  const body = encode(new TextEncoder().encode(JSON.stringify(payload)))
  const signature = await crypto.subtle.sign('HMAC', await key(secret), new TextEncoder().encode(body))
  return `${body}.${encode(new Uint8Array(signature))}`
}
export async function verifyFileTicket(secret: string, value: string, id: string, now = Date.now()): Promise<FileTicket | null> {
  try {
    if (value.length > 1600) return null
    const [body, signature, extra] = value.split('.')
    if (!body || !signature || extra || !await crypto.subtle.verify('HMAC', await key(secret), decode(signature), new TextEncoder().encode(body))) return null
    const ticket = JSON.parse(new TextDecoder().decode(decode(body))) as FileTicket
    if (ticket.id !== id || !Number.isSafeInteger(ticket.expires) || ticket.expires < now || ticket.expires > now + 15 * 60 * 1000 || !/^assets\/[0-9a-f-]{36}\/manifest$/.test(ticket.key)) return null
    return ticket
  } catch { return null }
}
