import { beforeEach, describe, expect, it } from 'vitest'
import {
  applyTheme,
  contrastRatio,
  DEFAULT_BRANDING,
  DEFAULT_THEME,
  normalizeBranding,
  normalizeHex,
  themeVariables,
  validateBranding,
} from '../utils/branding'
import { checkLogoFile, fitWithin, svgAspect } from '../utils/logo'
import { buildBackup, parseBackup } from '../security/backup'
import { DEFAULT_CHURCH_ID, useAppStore } from '../store/useAppStore'
import { createServiceSkeleton } from '../store/serviceUtils'
import type { Branding } from '../types'

const PNG_HEAD = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]
const JPEG_HEAD = [0xff, 0xd8, 0xff, 0xe0, 0, 0x10]
const LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

const file = (parts: BlobPart[], name: string, type: string) => new File(parts, name, { type })

describe('branding form validation', () => {
  it('accepts the defaults', () => {
    expect(validateBranding(DEFAULT_BRANDING)).toEqual({})
  })

  it('requires a church name and an app title, within their limits', () => {
    expect(validateBranding({ ...DEFAULT_BRANDING, name: '   ', appTitle: '' })).toEqual({
      name: 'required',
      appTitle: 'required',
    })
    expect(validateBranding({ ...DEFAULT_BRANDING, name: 'x'.repeat(81), appTitle: 'y'.repeat(61) })).toEqual({
      name: 'too-long',
      appTitle: 'too-long',
    })
  })

  it('rejects malformed colours and accepts #rgb shorthand', () => {
    expect(normalizeHex('#ABC')).toBe('#aabbcc')
    expect(normalizeHex('blue')).toBeNull()
    const errors = validateBranding({
      ...DEFAULT_BRANDING,
      theme: { primary: 'orange', accent: '#12', background: 'nope' },
    })
    expect(errors).toEqual({ primary: 'invalid-color', accent: 'invalid-color', background: 'invalid-color' })
  })

  it('refuses colours that would make the dark interface hard to read', () => {
    // Dark navy primary on the dark background: links and icons would vanish.
    expect(validateBranding({ ...DEFAULT_BRANDING, theme: { ...DEFAULT_THEME, primary: '#1a2340' } }).primary).toBe(
      'low-contrast',
    )
    // A near-white background loses the faint UI text.
    expect(
      validateBranding({ ...DEFAULT_BRANDING, theme: { ...DEFAULT_THEME, background: '#f4f1ea' } }).background,
    ).toBe('background-too-light')
    // A dark accent cannot mark the selected item.
    expect(validateBranding({ ...DEFAULT_BRANDING, theme: { ...DEFAULT_THEME, accent: '#202020' } }).accent).toBe(
      'low-contrast',
    )
    // A bright teal brand colour on a deep blue background passes.
    expect(
      validateBranding({ ...DEFAULT_BRANDING, theme: { primary: '#3ec7b4', accent: '#8fb4ff', background: '#0b1020' } }),
    ).toEqual({})
  })
})

describe('logo upload validation', () => {
  it('accepts PNG, JPEG and SVG files that match their type', async () => {
    expect(await checkLogoFile(file([new Uint8Array(PNG_HEAD)], 'logo.png', 'image/png'))).toEqual({
      ok: true,
      kind: 'raster',
      mime: 'image/png',
    })
    expect(await checkLogoFile(file([new Uint8Array(JPEG_HEAD)], 'logo.JPEG', 'image/jpeg'))).toMatchObject({
      ok: true,
      mime: 'image/jpeg',
    })
    const svg = '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><rect/></svg>'
    expect(await checkLogoFile(file([svg], 'logo.svg', 'image/svg+xml'))).toMatchObject({ ok: true, kind: 'svg' })
  })

  it('rejects empty, oversized, unsupported, mislabelled and corrupted files', async () => {
    expect(await checkLogoFile(file([], 'logo.png', 'image/png'))).toEqual({ ok: false, reason: 'empty' })
    const big = new Uint8Array(2 * 1024 * 1024 + 1)
    big.set(PNG_HEAD)
    expect(await checkLogoFile(file([big], 'logo.png', 'image/png'))).toEqual({ ok: false, reason: 'too-large' })
    expect(await checkLogoFile(file(['GIF89a'], 'logo.bmp', 'image/bmp'))).toEqual({
      ok: false,
      reason: 'unsupported-type',
    })
    expect(await checkLogoFile(file([new Uint8Array(JPEG_HEAD)], 'logo.png', 'image/png'))).toEqual({
      ok: false,
      reason: 'mismatch',
    })
    expect(await checkLogoFile(file(['not really an image'], 'logo.png', 'image/png'))).toEqual({
      ok: false,
      reason: 'corrupt',
    })
    expect(await checkLogoFile(file(['<html><script>alert(1)</script></html>'], 'logo.svg', 'image/svg+xml'))).toEqual({
      ok: false,
      reason: 'svg-invalid',
    })
  })

  it('keeps the logo aspect ratio when an SVG is converted', () => {
    expect(svgAspect('<svg viewBox="0 0 400 100"></svg>')).toBe(4)
    expect(svgAspect('<svg width="50" height="200"></svg>')).toBe(0.25)
    expect(fitWithin(4)).toEqual({ width: 512, height: 128 })
    expect(fitWithin(0.25)).toEqual({ width: 128, height: 512 })
    expect(fitWithin(Number.NaN)).toEqual({ width: 512, height: 512 })
  })
})

describe('theme application', () => {
  it('derives readable button text and applies the colours as CSS variables', () => {
    const theme = { primary: '#3ec7b4', accent: '#8fb4ff', background: '#0b1020' }
    const vars = themeVariables(theme)
    expect(vars['--amber-rgb']).toBe('62 199 180')
    expect(vars['--violet-rgb']).toBe('143 180 255')
    expect(vars['--bg']).toBe('#0b1020')
    expect(contrastRatio(vars['--amber-ink'], vars['--primary-lo'])).toBeGreaterThanOrEqual(4.5)

    const element = document.createElement('div')
    applyTheme(theme, element)
    expect(element.style.getPropertyValue('--amber-rgb')).toBe('62 199 180')
    expect(element.style.getPropertyValue('--bg')).toBe('#0b1020')

    // The default theme removes every override, so the stylesheet values return.
    applyTheme(DEFAULT_THEME, element)
    expect(element.style.getPropertyValue('--amber-rgb')).toBe('')
    expect(element.style.getPropertyValue('--bg')).toBe('')
  })
})

describe('branding persistence, reset and church isolation', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({
      churchId: DEFAULT_CHURCH_ID,
      branding: DEFAULT_BRANDING,
      brandingProfiles: { [DEFAULT_CHURCH_ID]: DEFAULT_BRANDING },
    })
  })

  const custom: Branding = {
    name: 'Hope Chapel',
    appTitle: 'Hope Presenter',
    logoUrl: LOGO,
    logoAsFavicon: false,
    theme: { primary: '#3ec7b4', accent: '#8fb4ff', background: '#0b1020' },
  }

  it('saves branding to local storage and restores it on reload', async () => {
    useAppStore.getState().saveBranding(custom)
    const raw = JSON.parse(localStorage.getItem('church-presenter:workspace:v1') ?? '{}')
    expect(raw.state.brandingProfiles[DEFAULT_CHURCH_ID]).toEqual(custom)

    // Simulate a reload: memory goes back to defaults, storage keeps the saved copy.
    const stored = localStorage.getItem('church-presenter:workspace:v1')!
    useAppStore.setState({ branding: DEFAULT_BRANDING, brandingProfiles: {} })
    localStorage.setItem('church-presenter:workspace:v1', stored)
    await useAppStore.persist.rehydrate()
    expect(useAppStore.getState().branding).toEqual(custom)
  })

  it('falls back to defaults for missing or partial saved branding', async () => {
    // A save from before branding colours existed: only a name.
    localStorage.setItem(
      'church-presenter:workspace:v1',
      JSON.stringify({
        version: 1,
        state: { services: [], branding: { name: 'Old Church', logoUrl: 'not-a-data-url' } },
      }),
    )
    await useAppStore.persist.rehydrate()
    expect(useAppStore.getState().branding).toEqual({ ...DEFAULT_BRANDING, name: 'Old Church' })
  })

  it('resets to the default branding', () => {
    useAppStore.getState().saveBranding(custom)
    useAppStore.getState().resetBranding()
    expect(useAppStore.getState().branding).toEqual(DEFAULT_BRANDING)
    expect(useAppStore.getState().brandingProfiles[DEFAULT_CHURCH_ID]).toEqual(DEFAULT_BRANDING)
  })

  it('never lets one church overwrite another church’s branding', () => {
    const store = useAppStore.getState()
    store.saveBranding(custom)
    store.switchChurch('church_second')
    expect(useAppStore.getState().branding).toEqual(DEFAULT_BRANDING)

    useAppStore.getState().saveBranding({ ...DEFAULT_BRANDING, name: 'Second Church' })
    useAppStore.getState().resetBranding()
    expect(useAppStore.getState().brandingProfiles[DEFAULT_CHURCH_ID]).toEqual(custom)

    useAppStore.getState().switchChurch(DEFAULT_CHURCH_ID)
    expect(useAppStore.getState().branding).toEqual(custom)
  })

  it('round-trips branding through backups and repairs bad values', () => {
    const service = createServiceSkeleton({ title: 'Sunday', date: '2026-11-01', time: '10:00', locale: 'en' })
    const backup = buildBackup({
      services: [service],
      settings: useAppStore.getState().settings,
      branding: custom,
      monitors: [],
      media: [],
    })
    expect(parseBackup(JSON.stringify(backup)).branding).toEqual(custom)

    const tampered = JSON.parse(JSON.stringify(backup))
    // Empty name, oversized title, and a near-black primary that would be unreadable.
    tampered.branding = { name: '', appTitle: 'T'.repeat(500), theme: { primary: '#111111', accent: 'red' } }
    const repaired = parseBackup(JSON.stringify(tampered)).branding!
    expect(repaired.name).toBe(DEFAULT_BRANDING.name)
    expect(repaired.appTitle.length).toBeLessThanOrEqual(60)
    expect(repaired.theme).toEqual(DEFAULT_THEME)
  })

  it('normalizes untrusted values field by field', () => {
    expect(normalizeBranding(null)).toEqual(DEFAULT_BRANDING)
    expect(normalizeBranding({ theme: { primary: '#ABC', accent: '#8fb4ff', background: null } }).theme).toEqual({
      primary: '#aabbcc',
      accent: '#8fb4ff',
      background: null,
    })
  })

  it('migrates the old default gold to the current default primary', () => {
    const saved = normalizeBranding({ theme: { primary: '#E5A44F', accent: DEFAULT_THEME.accent, background: null } })
    expect(saved.theme.primary).toBe(DEFAULT_THEME.primary)
  })
})

describe('Cathedral Presenter defaults', () => {
  it('moves the old placeholder identity to the new name, title and logo', () => {
    const migrated = normalizeBranding({ name: 'Grace Community Church', appTitle: 'Church Presenter', logoUrl: null })
    expect(migrated.name).toBe('Cathedral Presenter')
    expect(migrated.appTitle).toBe('Cathedral Presenter')
    expect(migrated.logoUrl).toBe(DEFAULT_BRANDING.logoUrl)
  })

  it('keeps a church that changed its name, and a logo it removed', () => {
    const kept = normalizeBranding({ name: 'Sede Lisboa', appTitle: 'Sede', logoUrl: null })
    expect(kept).toMatchObject({ name: 'Sede Lisboa', appTitle: 'Sede', logoUrl: null })
  })
})
