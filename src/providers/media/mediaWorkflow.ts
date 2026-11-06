import type { MediaAsset, MediaKind, SlideBackground, SlideElement } from '../../types'
import { makeElement } from '../../utils/slides'
import { sanitizeSingleLine, sanitizeText } from '../../security/text'
import { isSafeQrPayload, parseYouTubeUrl, validateExternalUrl } from '../../security/url'
import { mediaStatus, webMediaProvider } from './MediaProvider'

export interface MediaElementLabels {
  providerLabel: string
  fallbackText: string
}

export function mediaElementFromAsset(asset: MediaAsset, labels: MediaElementLabels): SlideElement {
  const isYouTube = asset.provider === 'youtube'
  const type = isYouTube ? 'embed' : asset.kind
  const onlineOnly = asset.provider === 'url' || isYouTube
  const geometry = asset.kind === 'audio' ? { x: 8, y: 82, width: 84, height: 12 } : isYouTube
    ? { x: 13, y: 20, width: 74, height: 58 }
    : asset.kind === 'video'
      ? { x: 8, y: 16, width: 84, height: 62 }
      : { x: 8, y: 12, width: 84, height: 74 }
  const youtube = isYouTube ? parseYouTubeUrl(asset.source) : null
  return makeElement(type, {
    ...geometry,
    text: sanitizeSingleLine(asset.name, 160) || labels.fallbackText,
    source: asset.source,
    settings: {
      fit: asset.kind === 'image' && !isYouTube ? 'cover' : 'contain',
      provider: asset.provider,
      providerLabel: labels.providerLabel,
      youtubeId: youtube?.ok ? youtube.id : undefined,
      localOnly: asset.localOnly,
      onlineOnly,
      missing: asset.status === 'missing',
      status: mediaStatus(asset),
      cropX: 50,
      cropY: 50,
      cropZoom: 1,
    },
  })
}

export function backgroundFromAsset(asset: MediaAsset, overlay = 0.42): SlideBackground | null {
  if (asset.kind !== 'image' || asset.status !== 'ready' || !asset.source) return null
  return {
    type: 'image',
    source: asset.source,
    overlay,
    tone: 'dark',
  }
}

export async function prepareUploadedMedia(file: File, options?: { storage: 'local' | 'drive' }): Promise<{
  ok: boolean
  asset?: MediaAsset
  reason?: string
}> {
  return webMediaProvider.registerFile(file, options)
}

export function prepareRemoteMedia(
  url: string,
  kind: MediaKind,
): { ok: boolean; asset?: MediaAsset; reason?: string } {
  return webMediaProvider.registerUrl(url, kind)
}

export function prepareYouTubeMedia(url: string): {
  ok: boolean
  asset?: MediaAsset
  reason?: string
} {
  return webMediaProvider.registerYouTube(url)
}

// RFC 2426 text value: one line, with backslash, comma, and semicolon escaped.
function vcardValue(value: string, max: number): string {
  return sanitizeSingleLine(value, max).replace(/[\\,;]/g, (char) => `\\${char}`)
}

export type QrVariant = 'url' | 'text' | 'event' | 'contact'

export interface QrInput {
  variant: QrVariant
  value: string
  eventTitle: string
  eventDate: string
  eventLocation: string
  contactName: string
  contactOrganization: string
  contactEmail: string
  contactPhone: string
}

export function qrPayloadFor(input: QrInput): { ok: boolean; payload: string; reason?: string } {
  let payload: string
  if (input.variant === 'url') {
    const checked = validateExternalUrl(input.value)
    if (!checked.ok) return { ok: false, payload: '', reason: checked.reason }
    payload = checked.url
  } else if (input.variant === 'contact') {
    const name = vcardValue(input.contactName, 120)
    const organization = vcardValue(input.contactOrganization, 160)
    const email = vcardValue(input.contactEmail, 160)
    const phone = vcardValue(input.contactPhone, 60)
    if (!name && !organization && !email && !phone) {
      return { ok: false, payload: '', reason: 'empty' }
    }
    payload = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${name}`,
      organization ? `ORG:${organization}` : '',
      email ? `EMAIL:${email}` : '',
      phone ? `TEL:${phone}` : '',
      'END:VCARD',
    ]
      .filter(Boolean)
      .join('\n')
  } else if (input.variant === 'event') {
    payload = [
      sanitizeSingleLine(input.eventTitle, 160),
      sanitizeSingleLine(input.eventDate, 80),
      sanitizeSingleLine(input.eventLocation, 160),
    ]
      .filter(Boolean)
      .join('\n')
  } else {
    payload = sanitizeText(input.value, 1200)
  }

  if (!isSafeQrPayload(payload, input.variant)) {
    return { ok: false, payload, reason: 'invalid-payload' }
  }
  return { ok: true, payload }
}

export function qrElement(payload: string, variant: QrVariant): SlideElement {
  const element = makeElement('qr', {
    width: 22,
    height: 38,
    x: 39,
    y: 25,
    text: payload,
    settings: { payload, variant, quietZone: 2 },
  })
  return element
}

export function openPayload(payload: string): boolean {
  const checked = validateExternalUrl(payload)
  if (!checked.ok) return false
  window.open(checked.url, '_blank', 'noopener,noreferrer')
  return true
}
