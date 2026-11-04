import { DEFAULT_BRANDING } from '../utils/branding'
import { describe, expect, it } from 'vitest'
import {
  isBlank,
  sanitizeSingleLine,
  sanitizeText,
  truncate,
} from '../security/text'
import {
  isPrivateOrLocalHost,
  isSafeQrPayload,
  parseYouTubeUrl,
  validateExternalUrl,
  validateMediaUrl,
} from '../security/url'
import { safeDisplayFileName, validateRelativeMediaPath } from '../security/path'
import {
  extensionOf,
  formatBytes,
  sniffImageMime,
  sniffVideoMime,
  validateImageDataUrl,
} from '../security/media'
import { parseBackup, redactSecrets } from '../security/backup'
import { createServiceSkeleton } from '../store/serviceUtils'
import type { AppSettings, Branding } from '../types'

const settings: AppSettings = {
  locale: 'en',
  defaultTranslationId: 'web',
  secondaryTranslationId: 'blivre',
  reducedTransparency: false,
  reducedMotion: false,
  shortcutsEnabled: true,
  shortcutOverrides: {},
  transition: 'fade',
  transitionDuration: 1,
  lastBackupAt: null,
  showSetupChecklist: true,
  defaultSectionTitle: 'Message',
}

const branding: Branding = { ...DEFAULT_BRANDING, name: 'Campus Algarve', logoUrl: null }

describe('text sanitization', () => {
  it('normalizes line endings and removes control and bidi characters', () => {
    const value = '  Hello\u202E world\u0000\n\nnext\r\nline  '
    expect(sanitizeText(value)).toBe('Hello world\n\nnext\nline')
  })

  it('truncates to the requested maximum and trims whitespace', () => {
    expect(sanitizeText('abcdefghij', 5)).toBe('abcde')
    expect(sanitizeText('   spaced   ')).toBe('spaced')
  })

  it('collapses newlines for single-line fields', () => {
    expect(sanitizeSingleLine('  one\n\n two\t three  ')).toBe('one two three')
  })

  it('handles non-string input and blank detection', () => {
    expect(sanitizeText(null)).toBe('')
    expect(sanitizeText(42)).toBe('')
    expect(isBlank(' \n\t ')).toBe(true)
    expect(isBlank('x')).toBe(false)
  })

  it('truncates with an ellipsis without splitting the budget', () => {
    expect(truncate('abcdefghij', 5)).toBe('abcd…')
    expect(truncate('abc', 5)).toBe('abc')
  })
})

describe('URL validation', () => {
  it('accepts public HTTPS URLs and strips fragments', () => {
    expect(validateExternalUrl('https://example.com/path?q=1#section')).toEqual({
      ok: true,
      url: 'https://example.com/path?q=1',
      hostname: 'example.com',
      protocol: 'https:',
    })
  })

  it.each([
    ['http://example.com', 'unsafe-scheme'],
    ['javascript:alert(1)', 'unsafe-scheme'],
    ['https://user:pass@example.com', 'credentials-in-url'],
    ['https://localhost/admin', 'private-network'],
    ['https://app.local', 'private-network'],
    ['https://127.0.0.1', 'private-network'],
    ['https://10.0.0.1', 'private-network'],
    ['https://192.168.1.4', 'private-network'],
    ['https://example.com:8443', 'unsafe-port'],
    ['//example.com/path', 'protocol-relative'],
    ['https://example.com\\path', 'unc-path'],
    ['https://example.com/has space', 'control-characters'],
  ])('rejects %s', (url, reason) => {
    expect(validateExternalUrl(url)).toMatchObject({ ok: false, reason })
  })

  it('detects private and local hosts', () => {
    expect(isPrivateOrLocalHost('example.com')).toBe(false)
    expect(isPrivateOrLocalHost('foo.internal')).toBe(true)
    expect(isPrivateOrLocalHost('[::1]')).toBe(true)
    expect(isPrivateOrLocalHost('100.64.0.1')).toBe(true)
  })

  it('parses supported YouTube forms into privacy-enhanced embeds', () => {
    const fromShort = parseYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')
    expect(fromShort).toMatchObject({
      ok: true,
      id: 'dQw4w9WgXcQ',
      embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    })

    const fromWatch = parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(fromWatch.ok && fromWatch.id).toBe('dQw4w9WgXcQ')

    const fromShorts = parseYouTubeUrl('https://youtube.com/shorts/dQw4w9WgXcQ')
    expect(fromShorts.ok && fromShorts.id).toBe('dQw4w9WgXcQ')
  })

  it('rejects lookalike YouTube hosts and invalid video IDs', () => {
    expect(parseYouTubeUrl('https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ')).toMatchObject({
      ok: false,
      reason: 'unsupported-provider',
    })
    expect(parseYouTubeUrl('https://youtube.com/watch?v=short')).toMatchObject({
      ok: false,
      reason: 'invalid-video-id',
    })
  })

  it('validates QR payloads by variant', () => {
    expect(isSafeQrPayload('https://example.com/event', 'url')).toBe(true)
    expect(isSafeQrPayload('http://example.com/event', 'url')).toBe(false)
    expect(isSafeQrPayload('Meet us in the hall', 'text')).toBe(true)
    expect(isSafeQrPayload('bad\u0000payload', 'text')).toBe(false)
  })

  it('blocks executable and mismatched remote media URLs', () => {
    expect(validateMediaUrl('https://example.com/photo.png', 'image')).toMatchObject({ ok: true })
    expect(validateMediaUrl('https://example.com/clip.webm', 'video')).toMatchObject({ ok: true })
    expect(validateMediaUrl('https://example.com/vector.svg', 'image')).toMatchObject({
      ok: false,
      reason: 'unsafe-media-type',
    })
    expect(validateMediaUrl('https://example.com/page.html', 'image')).toMatchObject({
      ok: false,
      reason: 'unsafe-media-type',
    })
    expect(validateMediaUrl('https://example.com/archive.wasm', 'video')).toMatchObject({
      ok: false,
      reason: 'unsafe-media-type',
    })
    expect(validateMediaUrl('https://example.com/clip.mp4', 'image')).toMatchObject({
      ok: false,
      reason: 'media-kind-mismatch',
    })
    expect(validateMediaUrl('https://example.com/photo.webp', 'video')).toMatchObject({
      ok: false,
      reason: 'media-kind-mismatch',
    })
  })
})

describe('media path validation', () => {
  it('accepts safe relative media paths', () => {
    expect(validateRelativeMediaPath('images/background-01.webp')).toEqual({
      ok: true,
      path: 'images/background-01.webp',
    })
  })

  it.each([
    ['', 'empty'],
    ['/etc/passwd', 'absolute-path'],
    ['~/Pictures/bg.png', 'absolute-path'],
    ['../secrets.png', 'path-traversal'],
    ['images/./bg.png', 'path-traversal'],
    ['C:\\media\\bg.png', 'unc-or-backslash'],
    ['C:media', 'windows-drive-path'],
    ['images\\bg.png', 'unc-or-backslash'],
    ['images/bg.png:stream', 'alternate-data-stream'],
    ['images//bg.png', 'invalid-segment'],
  ])('rejects %s', (path, reason) => {
    expect(validateRelativeMediaPath(path)).toMatchObject({ ok: false, reason })
  })

  it('strips path components and unsafe filename characters', () => {
    expect(safeDisplayFileName('../../evil<>?.png')).toBe('evil.png')
    expect(safeDisplayFileName('....')).toBe('media')
  })
})

describe('media type and signature checks', () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0])
  const webm = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3])

  it('sniffs supported image signatures', () => {
    expect(sniffImageMime(png)).toBe('image/png')
    expect(sniffImageMime(jpeg)).toBe('image/jpeg')
    expect(sniffImageMime(new Uint8Array([1, 2, 3]))).toBeNull()
  })

  it('sniffs supported video signatures', () => {
    expect(sniffVideoMime(webm)).toBe('video/webm')
    expect(sniffVideoMime(new TextEncoder().encode('not a video'))).toBeNull()
  })

  it('extracts extensions and formats sizes', () => {
    expect(extensionOf('Photo.PNG')).toBe('.png')
    expect(extensionOf('no-extension')).toBe('')
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1536)).toBe('1.5 KB')
  })

  it('allows only raster image data URLs under the size limit', () => {
    expect(validateImageDataUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(true)
    expect(validateImageDataUrl('data:image/svg+xml;base64,PHN2Zz4=')).toBe(false)
    expect(validateImageDataUrl('javascript:alert(1)')).toBe(false)
    expect(validateImageDataUrl('data:image/png;base64,AAAA', 1)).toBe(false)
  })
})

describe('backup parsing', () => {
  function backupForService(service: ReturnType<typeof createServiceSkeleton>) {
    return {
      app: 'church-presenter',
      version: 1,
      exportedAt: new Date().toISOString(),
      services: [service],
      settings,
      branding,
      monitors: [],
      media: [
        {
          id: 'media_1',
          name: 'Background',
          kind: 'image',
          mime: 'image/png',
          size: 100,
          source: 'blob:http://localhost/secret',
          status: 'ready',
          addedAt: new Date().toISOString(),
          provider: 'upload',
        },
      ],
    }
  }

  it('redacts secret-like keys recursively', () => {
    const input = {
      name: 'Safe',
      apiKey: 'secret',
      nested: { accessToken: 'secret', keep: 'yes' },
      list: [{ password: 'x', value: 2 }],
    }
    expect(redactSecrets(input)).toEqual({
      name: 'Safe',
      nested: { keep: 'yes' },
      list: [{ value: 2 }],
    })
  })

  it('rejects malformed, empty, and oversized backups', () => {
    expect(() => parseBackup('{')).toThrow('invalid-json')
    expect(() => parseBackup('{"app":"other","version":1}')).toThrow('invalid-backup')
    expect(() => parseBackup(JSON.stringify({ app: 'church-presenter', version: 1, services: [] }))).toThrow(
      'empty-backup',
    )
    expect(() => parseBackup('x'.repeat(13 * 1024 * 1024))).toThrow('backup-too-large')
  })

  it('sanitizes imported services and never restores local media sources', () => {
    const service = createServiceSkeleton({
      title: '  Sunday\u202E Service  ',
      date: '2026-11-01',
      time: '10:00',
      locale: 'en',
    })
    service.items[0].title = 'Welcome\u0000 <script>'
    service.items[0].slides[0].text = 'Line one\r\nLine two\u202E'

    const parsed = parseBackup(JSON.stringify(backupForService(service)))
    expect(parsed.services).toHaveLength(1)
    expect(parsed.services[0].title).toBe('Sunday Service')
    expect(parsed.services[0].items[0].title).toBe('Welcome <script>')
    expect(parsed.services[0].items[0].slides[0].text).toBe('Line one\nLine two')
    expect(parsed.media?.[0]).toMatchObject({ source: '', status: 'missing' })
    expect(parsed.branding?.logoUrl).toBeNull()
  })

  it('preserves safe media providers while stripping imported sources', () => {
    const service = createServiceSkeleton({
      title: 'Test',
      date: '2026-11-01',
      time: '10:00',
      locale: 'en',
    })
    const raw = backupForService(service)
    const parsed = parseBackup(
      JSON.stringify({
        ...raw,
        media: [
          { ...raw.media[0], provider: 'youtube' },
          { ...raw.media[0], id: 'media_2', provider: 'url' },
          { ...raw.media[0], id: 'media_3', provider: 'shell' },
        ],
      }),
    )
    expect(parsed.media?.map((asset) => asset.provider)).toEqual(['youtube', 'url', 'upload'])
    expect(parsed.media?.every((asset) => asset.source === '' && asset.status === 'missing')).toBe(true)
  })

  it('coerces invalid settings, monitor, and logo values to safe defaults', () => {
    const service = createServiceSkeleton({
      title: 'Test',
      date: '2026-11-01',
      time: '10:00',
      locale: 'en',
    })
    const raw = backupForService(service)
    const parsed = parseBackup(
      JSON.stringify({
        ...raw,
        settings: { ...settings, locale: 'xx', shortcutsEnabled: 'yes', transitionDuration: 99 },
        branding: { name: 'Church', logoUrl: 'javascript:alert(1)' },
        monitors: [{ id: 'bad id', name: 'Screen', role: 'audience', width: 999999 }],
        media: [{ id: 'm', name: 'asset', kind: 'video', source: 'file:///etc/passwd' }],
      }),
    )
    expect(parsed.settings).toMatchObject({ locale: 'en', shortcutsEnabled: true, transitionDuration: 3 })
    // An unsafe logo is replaced by the bundled default logo, never kept.
    expect(parsed.branding?.logoUrl).toBe(DEFAULT_BRANDING.logoUrl)
    expect(parsed.monitors?.[0].id).toMatch(/^monitor_/)
    expect(parsed.monitors?.[0].width).toBe(16384)
    expect(parsed.media?.[0].source).toBe('')
  })
})

describe('imported element style values', () => {
  const backupForService = (service: ReturnType<typeof createServiceSkeleton>) => ({
    app: 'church-presenter',
    version: 1,
    exportedAt: new Date().toISOString(),
    services: [service],
    settings,
    branding,
    monitors: [],
    media: [],
  })

  it('drops CSS that would fetch a remote resource and keeps template fields to known values', () => {
    const service = createServiceSkeleton({ title: 'Imported', date: '2026-11-01', time: '10:00', locale: 'en' })
    service.items[0].slides[0].elements = [
      {
        id: 'el_shape',
        type: 'shape',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        zIndex: 1,
        opacity: 1,
        visible: true,
        settings: { shape: 'rect', fill: 'url(https://tracker.example/pixel.png)', color: 'image-set("https://x.example/a.png" 1x)', motion: 'explode' as never, videoSlot: 'yes' as never },
      },
      {
        id: 'el_ok',
        type: 'shape',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        zIndex: 1,
        opacity: 1,
        visible: true,
        settings: { shape: 'circle', fill: 'radial-gradient(circle, rgba(255,214,140,0.3), transparent 70%)', motion: 'pulse' },
      },
    ]
    const parsed = parseBackup(JSON.stringify(backupForService(service)))
    const [bad, ok] = parsed.services[0].items[0].slides[0].elements
    expect(bad.settings?.fill).toBeUndefined()
    expect(bad.settings?.color).toBeUndefined()
    expect(bad.settings?.motion).toBeUndefined()
    expect(bad.settings?.videoSlot).toBe(false)
    expect(ok.settings?.fill).toContain('radial-gradient')
    expect(ok.settings?.motion).toBe('pulse')
  })
})
