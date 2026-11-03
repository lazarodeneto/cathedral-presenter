export const IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif',
] as const

export const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'] as const

export const MAX_IMAGE_BYTES = 20 * 1024 * 1024
export const MAX_VIDEO_BYTES = 300 * 1024 * 1024
export const MAX_INLINE_IMAGE_BYTES = 2.5 * 1024 * 1024
export const MAX_LOGO_BYTES = 2 * 1024 * 1024
export const MAX_BACKUP_BYTES = 12 * 1024 * 1024
export const MAX_QR_PAYLOAD = 1200

const ALLOWED_EXTENSIONS = {
  image: ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif'],
  video: ['.mp4', '.webm', '.mov'],
} as const

export type MediaValidation =
  | { ok: true; kind: 'image' | 'video'; mime: string; extension: string }
  | { ok: false; reason: string }

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.slice(dot).toLowerCase() : ''
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

export function sniffImageMime(bytes: Uint8Array): string | null {
  const b = bytes
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return 'image/png'
  }
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b.length >= 6) {
    const signature = String.fromCharCode(...b.slice(0, 6))
    if (signature === 'GIF87a' || signature === 'GIF89a') return 'image/gif'
  }
  if (
    b.length >= 12 &&
    String.fromCharCode(...b.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...b.slice(8, 12)) === 'WEBP'
  ) {
    return 'image/webp'
  }
  if (b.length >= 12 && String.fromCharCode(...b.slice(4, 8)) === 'ftyp') {
    const brand = String.fromCharCode(...b.slice(8, 12))
    if (brand === 'avif' || brand === 'avis') return 'image/avif'
  }
  return null
}

export function sniffVideoMime(bytes: Uint8Array): string | null {
  const b = bytes
  if (b.length >= 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) {
    return 'video/webm'
  }
  if (b.length >= 12 && String.fromCharCode(...b.slice(4, 8)) === 'ftyp') {
    const brand = String.fromCharCode(...b.slice(8, 12))
    if (brand.startsWith('qt')) return 'video/quicktime'
    return 'video/mp4'
  }
  return null
}

export async function validateMediaFile(file: File): Promise<MediaValidation> {
  if (!file || file.size <= 0) return { ok: false, reason: 'empty-file' }

  const declared = file.type.toLowerCase()
  const extension = extensionOf(file.name)
  const isImage =
    (IMAGE_MIME_TYPES as readonly string[]).includes(declared) ||
    (ALLOWED_EXTENSIONS.image as readonly string[]).includes(extension)
  const isVideo =
    (VIDEO_MIME_TYPES as readonly string[]).includes(declared) ||
    (ALLOWED_EXTENSIONS.video as readonly string[]).includes(extension)

  if (!isImage && !isVideo) return { ok: false, reason: 'unsupported-type' }
  if (declared === 'image/svg+xml' || extension === '.svg') {
    return { ok: false, reason: 'svg-rejected' }
  }

  const kind = isImage ? 'image' : 'video'
  const max = kind === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES
  if (file.size > max) return { ok: false, reason: 'file-too-large' }
  if (!(ALLOWED_EXTENSIONS[kind] as readonly string[]).includes(extension)) {
    return { ok: false, reason: 'unsupported-extension' }
  }

  const head = new Uint8Array(await file.slice(0, 32).arrayBuffer())
  const sniffed = kind === 'image' ? sniffImageMime(head) : sniffVideoMime(head)
  if (!sniffed) return { ok: false, reason: 'invalid-file-signature' }
  if (declared && declared !== sniffed) {
    return { ok: false, reason: 'mime-mismatch' }
  }
  if (kind === 'image' && !(IMAGE_MIME_TYPES as readonly string[]).includes(sniffed)) {
    return { ok: false, reason: 'unsupported-type' }
  }
  if (kind === 'video' && !(VIDEO_MIME_TYPES as readonly string[]).includes(sniffed)) {
    return { ok: false, reason: 'unsupported-type' }
  }
  return { ok: true, kind, mime: sniffed, extension }
}

export async function validateLogoFile(file: File): Promise<MediaValidation> {
  const result = await validateMediaFile(file)
  if (!result.ok) return result
  if (result.kind !== 'image') return { ok: false, reason: 'logo-must-be-image' }
  if (file.size > MAX_LOGO_BYTES) return { ok: false, reason: 'logo-too-large' }
  return result
}

export function validateImageDataUrl(value: unknown, maxBytes = MAX_LOGO_BYTES): boolean {
  if (typeof value !== 'string') return false
  const match = value.match(/^data:(image\/(?:png|jpeg|webp|gif|avif));base64,([A-Za-z0-9+/=\s]+)$/)
  if (!match) return false
  const payload = match[2]
  const approxBytes = Math.floor((payload.length * 3) / 4)
  return approxBytes > 0 && approxBytes <= maxBytes
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read-failed'))
    reader.onload = () => {
      if (typeof reader.result === 'string' && reader.result.startsWith('data:')) {
        resolve(reader.result)
      } else {
        reject(new Error('read-failed'))
      }
    }
    reader.readAsDataURL(file)
  })
}
