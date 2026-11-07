import { extensionOf, MAX_LOGO_BYTES, sniffImageMime, validateImageDataUrl } from '../security/media'
import { isCloud } from '../runtime'

export const LOGO_ACCEPT = 'image/png,image/jpeg,image/svg+xml,image/webp,.png,.jpg,.jpeg,.svg,.webp'
/** Longest edge of a logo after an SVG is converted to PNG. */
export const LOGO_RASTER_EDGE = 512

const RASTER: Record<string, string[]> = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
}

export type LogoError =
  | 'empty'
  | 'too-large'
  | 'unsupported-type'
  | 'mismatch'
  | 'corrupt'
  | 'svg-invalid'
  | 'read-failed'
  | 'virus-detected'
  | 'scanner-unavailable'
  | 'sign-in-required'

export type LogoCheck =
  | { ok: true; kind: 'raster'; mime: string }
  | { ok: true; kind: 'svg'; text: string }
  | { ok: false; reason: LogoError }

const readText = (file: Blob) =>
  typeof file.text === 'function'
    ? file.text()
    : new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result ?? ''))
        reader.onerror = () => reject(new Error('read-failed'))
        reader.readAsText(file)
      })

const readHead = async (file: Blob) =>
  new Uint8Array(
    typeof file.arrayBuffer === 'function'
      ? await file.slice(0, 32).arrayBuffer()
      : await new Response(file.slice(0, 32)).arrayBuffer(),
  )

/**
 * Check type, size and content of a logo file before anything is decoded.
 * PNG, JPEG and WebP must carry a matching file signature. SVG must be a real
 * <svg> document; it is never stored as SVG (see rasterizeSvg).
 */
export async function checkLogoFile(file: File): Promise<LogoCheck> {
  if (!file || file.size <= 0) return { ok: false, reason: 'empty' }
  if (file.size > MAX_LOGO_BYTES) return { ok: false, reason: 'too-large' }
  const ext = extensionOf(file.name)
  const declared = file.type.toLowerCase()

  if (ext === '.svg' || declared === 'image/svg+xml') {
    if (ext !== '.svg' || (declared && declared !== 'image/svg+xml')) return { ok: false, reason: 'mismatch' }
    let text: string
    try {
      text = await readText(file)
    } catch {
      return { ok: false, reason: 'read-failed' }
    }
    // Strip an XML declaration, comments and a doctype, then require an <svg> root.
    const body = text
      .replace(/^\uFEFF/, '')
      .replace(/<\?xml[\s\S]*?\?>/g, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<!DOCTYPE[^>]*>/gi, '')
      .trim()
    if (!/^<svg[\s>]/i.test(body) || !/<\/svg>\s*$/i.test(body)) return { ok: false, reason: 'svg-invalid' }
    return { ok: true, kind: 'svg', text }
  }

  const mime = Object.keys(RASTER).find((type) => RASTER[type].includes(ext))
  if (!mime) return { ok: false, reason: 'unsupported-type' }
  if (declared && declared !== mime) return { ok: false, reason: 'mismatch' }
  let head: Uint8Array
  try {
    head = await readHead(file)
  } catch {
    return { ok: false, reason: 'read-failed' }
  }
  const sniffed = sniffImageMime(head)
  if (!sniffed) return { ok: false, reason: 'corrupt' }
  if (sniffed !== mime) return { ok: false, reason: 'mismatch' }
  return { ok: true, kind: 'raster', mime }
}

/** Width / height from an SVG's width+height or viewBox, used when the browser reports no size. */
export function svgAspect(text: string): number {
  const viewBox = text.match(/viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i)
  if (viewBox) {
    const w = Number(viewBox[1])
    const h = Number(viewBox[2])
    if (w > 0 && h > 0) return w / h
  }
  const w = Number(text.match(/\swidth\s*=\s*["']([\d.]+)/i)?.[1])
  const h = Number(text.match(/\sheight\s*=\s*["']([\d.]+)/i)?.[1])
  return w > 0 && h > 0 ? w / h : 1
}

/** Fit an aspect ratio inside a square edge without distortion. */
export function fitWithin(aspect: number, edge = LOGO_RASTER_EDGE): { width: number; height: number } {
  const safe = Number.isFinite(aspect) && aspect > 0 ? aspect : 1
  return safe >= 1
    ? { width: edge, height: Math.max(1, Math.round(edge / safe)) }
    : { width: Math.max(1, Math.round(edge * safe)), height: edge }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('decode-failed'))
    image.src = src
  })
}

/**
 * Convert an SVG logo to a PNG. The SVG is loaded as an <img>, where browsers
 * never run scripts or load external resources, then drawn to a canvas. Only
 * the resulting PNG is kept, so no SVG markup is stored or rendered later.
 */
async function rasterizeSvg(text: string): Promise<string> {
  const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }))
  try {
    const image = await loadImage(url)
    const aspect = image.naturalWidth > 0 && image.naturalHeight > 0 ? image.naturalWidth / image.naturalHeight : svgAspect(text)
    const { width, height } = fitWithin(aspect)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('canvas-unavailable')
    context.drawImage(image, 0, 0, width, height)
    return canvas.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(url)
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read-failed'))
    reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('read-failed')))
    reader.readAsDataURL(file)
  })
}

export interface ProcessedLogo {
  dataUrl: string
  width: number
  height: number
  sourceType: 'PNG' | 'JPEG' | 'WebP' | 'SVG'
}

export type LogoResult = { ok: true; logo: ProcessedLogo } | { ok: false; reason: LogoError }

/** Validate, decode and (for SVG) convert a logo upload into a safe data URL. */
export async function processLogoFile(file: File): Promise<LogoResult> {
  const check = await checkLogoFile(file)
  if (!check.ok) return check
  try {
    const dataUrl = check.kind === 'svg' ? await rasterizeSvg(check.text) : await fileToDataUrl(file)
    if (!validateImageDataUrl(dataUrl)) return { ok: false, reason: check.kind === 'svg' ? 'svg-invalid' : 'too-large' }
    const upload = check.kind === 'svg' ? new File([await (await fetch(dataUrl)).blob()], 'logo.png', { type: 'image/png' }) : file
    if (isCloud) {
      try { const { uploadCloudFile } = await import('../providers/media/cloudUpload'); await uploadCloudFile(upload, upload.type, true) }
      catch (error) { const reason = error instanceof Error ? error.message : ''; return { ok: false, reason: reason === 'virus-detected' || reason === 'sign-in-required' ? reason : 'scanner-unavailable' } }
    } else {
      const scan = await fetch('/api/media/scan', { method: 'POST', headers: { 'Content-Type': upload.type, 'X-File-Name': encodeURIComponent(upload.name), 'X-Cathedral-Media': '1' }, body: upload })
      if (!scan.ok) {
        const result = await scan.json() as { reason?: string }
        return { ok: false, reason: result.reason === 'virus-detected' || result.reason === 'sign-in-required' ? result.reason : 'scanner-unavailable' }
      }
    }
    // Decoding proves the image is not truncated or corrupted.
    const image = await loadImage(dataUrl)
    if (!image.naturalWidth || !image.naturalHeight) return { ok: false, reason: 'corrupt' }
    const sourceType =
      check.kind === 'svg' ? 'SVG' : check.mime === 'image/png' ? 'PNG' : check.mime === 'image/jpeg' ? 'JPEG' : 'WebP'
    return { ok: true, logo: { dataUrl, width: image.naturalWidth, height: image.naturalHeight, sourceType } }
  } catch {
    return { ok: false, reason: check.kind === 'svg' ? 'svg-invalid' : 'corrupt' }
  }
}

/** Translation keys for each logo upload error. */
export const LOGO_ERROR_KEYS: Record<LogoError, string> = {
  empty: 'branding.logoError.empty',
  'too-large': 'branding.logoError.tooLarge',
  'unsupported-type': 'branding.logoError.type',
  mismatch: 'branding.logoError.mismatch',
  corrupt: 'branding.logoError.corrupt',
  'svg-invalid': 'branding.logoError.svg',
  'read-failed': 'branding.logoError.read',
  'virus-detected': 'storage.virusDetected',
  'scanner-unavailable': 'storage.scannerUnavailable',
  'sign-in-required': 'storage.signIn',
}
