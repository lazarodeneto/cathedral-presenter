export type UrlValidation =
  | { ok: true; url: string; hostname: string; protocol: 'https:' }
  | { ok: false; reason: string }

const BLOCKED_HOST_SUFFIXES = ['.local', '.internal', '.localhost', '.home', '.lan', '.corp']
const BLOCKED_HOSTS = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata',
  'metadata.google.internal',
  'instance-data',
  '0.0.0.0',
  '[::]',
  '::',
])

function stripBrackets(hostname: string): string {
  return hostname.replace(/^\[|\]$/g, '').toLowerCase()
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split('.').map((part) => Number(part))
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false
  }
  const [a, b] = parts
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  )
}

function isPrivateIpv6(hostname: string): boolean {
  const host = stripBrackets(hostname)
  if (!host.includes(':')) return false
  return (
    host === '::1' ||
    host === '::' ||
    host.startsWith('fc') ||
    host.startsWith('fd') ||
    host.startsWith('fe80') ||
    host.startsWith('::ffff:127.') ||
    host.startsWith('::ffff:10.') ||
    host.startsWith('::ffff:192.168.')
  )
}

export function isPrivateOrLocalHost(hostname: string): boolean {
  const host = stripBrackets(hostname)
  if (!host) return true
  if (BLOCKED_HOSTS.has(host)) return true
  if (BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) return true
  return isPrivateIpv4(host) || isPrivateIpv6(host)
}

/**
 * Allows public HTTPS URLs only. This is a client-side guard; a future
 * provider bridge must repeat the check server-side and validate redirects.
 */
export function validateExternalUrl(raw: string, options?: { allowHttp?: boolean }): UrlValidation {
  const input = raw.trim()
  if (!input) return { ok: false, reason: 'empty' }
  if (input.length > 2048) return { ok: false, reason: 'too-long' }
  if (/[\u0000-\u001F\u007F\s]/.test(input)) return { ok: false, reason: 'control-characters' }
  if (input.includes('\\')) return { ok: false, reason: 'unc-path' }
  if (/^\/\//.test(input)) return { ok: false, reason: 'protocol-relative' }

  let parsed: URL
  try {
    parsed = new URL(input)
  } catch {
    return { ok: false, reason: 'invalid-url' }
  }

  const allowedProtocol = options?.allowHttp ? ['https:', 'http:'] : ['https:']
  if (!allowedProtocol.includes(parsed.protocol)) return { ok: false, reason: 'unsafe-scheme' }
  if (parsed.username || parsed.password) return { ok: false, reason: 'credentials-in-url' }
  if (parsed.port && parsed.port !== '443' && !(options?.allowHttp && parsed.port === '80')) {
    return { ok: false, reason: 'unsafe-port' }
  }
  if (isPrivateOrLocalHost(parsed.hostname)) return { ok: false, reason: 'private-network' }
  if (!parsed.hostname.includes('.') && !parsed.hostname.includes(':')) {
    return { ok: false, reason: 'invalid-host' }
  }

  parsed.hash = ''
  return {
    ok: true,
    url: parsed.toString(),
    hostname: parsed.hostname.toLowerCase(),
    protocol: parsed.protocol as 'https:',
  }
}

const BLOCKED_MEDIA_EXTENSIONS = new Set([
  '.svg',
  '.svgz',
  '.html',
  '.htm',
  '.xhtml',
  '.xml',
  '.js',
  '.mjs',
  '.wasm',
])

export function validateMediaUrl(
  raw: string,
  kind: 'image' | 'video',
): UrlValidation {
  const checked = validateExternalUrl(raw)
  if (!checked.ok) return checked
  let pathname: string
  try {
    pathname = new URL(checked.url).pathname.toLowerCase()
  } catch {
    return { ok: false, reason: 'invalid-url' }
  }
  const dot = pathname.lastIndexOf('.')
  const extension = dot >= 0 ? pathname.slice(dot) : ''
  if (BLOCKED_MEDIA_EXTENSIONS.has(extension)) {
    return { ok: false, reason: 'unsafe-media-type' }
  }
  const videoExtensions = new Set(['.mp4', '.webm', '.mov', '.m4v'])
  const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif'])
  if (kind === 'image' && videoExtensions.has(extension)) {
    return { ok: false, reason: 'media-kind-mismatch' }
  }
  if (kind === 'video' && imageExtensions.has(extension)) {
    return { ok: false, reason: 'media-kind-mismatch' }
  }
  return checked
}

export function hostnameOf(raw: string): string {
  try {
    return new URL(raw).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtube-nocookie.com',
  'youtube-nocookie.com',
])

export type YouTubeValidation =
  | {
      ok: true
      id: string
      embedUrl: string
      watchUrl: string
      providerLabel: string
    }
  | { ok: false; reason: string }

export function parseYouTubeUrl(raw: string): YouTubeValidation {
  const checked = validateExternalUrl(raw)
  if (!checked.ok) return { ok: false, reason: checked.reason }

  let parsed: URL
  try {
    parsed = new URL(checked.url)
  } catch {
    return { ok: false, reason: 'invalid-url' }
  }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '')
  if (!YOUTUBE_HOSTS.has(host) && !YOUTUBE_HOSTS.has(parsed.hostname.toLowerCase())) {
    return { ok: false, reason: 'unsupported-provider' }
  }

  let id: string
  if (host === 'youtu.be') {
    id = parsed.pathname.split('/').filter(Boolean)[0] ?? ''
  } else if (parsed.pathname === '/watch') {
    id = parsed.searchParams.get('v') ?? ''
  } else {
    const match = parsed.pathname.match(/\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})/)
    id = match?.[1] ?? ''
  }

  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return { ok: false, reason: 'invalid-video-id' }

  return {
    ok: true,
    id,
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
    watchUrl: `https://www.youtube.com/watch?v=${id}`,
    providerLabel: 'YouTube · official privacy-enhanced embed',
  }
}

export function isSafeQrPayload(payload: string, variant: 'url' | 'text' | 'event' | 'contact'): boolean {
  if (!payload.trim() || payload.length > 1200) return false
  if (variant === 'url') return validateExternalUrl(payload).ok
  return !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(payload)
}
