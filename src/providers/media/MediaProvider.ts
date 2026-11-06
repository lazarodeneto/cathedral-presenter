import type { MediaAsset, MediaKind } from '../../types'
import {
  validateMediaFile,
} from '../../security/media'
import { parseYouTubeUrl, validateMediaUrl } from '../../security/url'
import { safeDisplayFileName } from '../../security/path'

export interface MediaRegistrationResult {
  ok: boolean
  asset?: MediaAsset
  reason?: string
}

/**
 * Provider-ready media boundary. The web adapter keeps local files in the
 * current session (or inline for small images). A desktop adapter should copy
 * accepted media into an allowlisted app-data directory and return a stable
 * relative reference instead of a blob URL.
 */
export interface MediaProvider {
  readonly id: string
  readonly label: string
  registerFile(file: File, options?: { storage: 'local' | 'drive' }): Promise<MediaRegistrationResult>
  registerUrl(url: string, kind: MediaKind): MediaRegistrationResult
  registerYouTube(url: string): MediaRegistrationResult
  supportsOffline(asset: MediaAsset): boolean
}

function isOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine
}

export const webMediaProvider: MediaProvider = {
  id: 'local-web-media',
  label: 'Local media · browser prototype',
  async registerFile(file, options) {
    let checked: Awaited<ReturnType<typeof validateMediaFile>>
    try { checked = await validateMediaFile(file) } catch { return { ok: false, reason: 'read-failed' } }
    if (!checked.ok) return { ok: false, reason: checked.reason }

    try {
      const response = await fetch('/api/media/upload', { method: 'POST', credentials: 'same-origin', headers: {
        'Content-Type': checked.mime, 'X-File-Name': encodeURIComponent(safeDisplayFileName(file.name)),
        'X-Storage-Target': options?.storage ?? 'local', 'X-Cathedral-Media': '1',
      }, body: file })
      const result = await response.json() as { asset?: MediaAsset; reason?: string }
      if (!response.ok || !result.asset) return { ok: false, reason: result.reason ?? 'media-service-unavailable' }
      return { ok: true, asset: result.asset }
    } catch {
      return { ok: false, reason: 'media-service-unavailable' }
    }
  },

  registerUrl(url, kind) {
    const checked = validateMediaUrl(url, kind)
    if (!checked.ok) return { ok: false, reason: checked.reason }
    return {
      ok: true,
      asset: {
        id: crypto.randomUUID(),
        name: checked.hostname,
        kind,
        mime: kind === 'image' ? 'image/*' : kind === 'audio' ? 'audio/*' : 'video/*',
        size: 0,
        source: checked.url,
        status: isOnline() ? 'ready' : 'offline',
        addedAt: new Date().toISOString(),
        provider: 'url',
      },
    }
  },

  registerYouTube(url) {
    const checked = parseYouTubeUrl(url)
    if (!checked.ok) return { ok: false, reason: checked.reason }
    return {
      ok: true,
      asset: {
        id: crypto.randomUUID(),
        name: `YouTube · ${checked.id}`,
        kind: 'video',
        mime: 'video/youtube',
        size: 0,
        source: checked.embedUrl,
        status: isOnline() ? 'ready' : 'offline',
        addedAt: new Date().toISOString(),
        provider: 'youtube',
      },
    }
  },

  supportsOffline(asset) {
    return asset.provider === 'upload'
  },
}

export function mediaStatus(asset: MediaAsset, online = isOnline()): MediaAsset['status'] {
  if (asset.status === 'missing' || asset.status === 'unsupported') return asset.status
  if (!online && (asset.provider === 'url' || asset.provider === 'youtube')) return 'offline'
  return asset.status === 'offline' ? (online ? 'ready' : 'offline') : asset.status
}
