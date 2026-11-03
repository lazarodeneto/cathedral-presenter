import type { Branding, BrandingTheme } from '../types'
import { sanitizeSingleLine } from '../security/text'
import { validateImageDataUrl } from '../security/media'

export const DEFAULT_THEME: BrandingTheme = {
  primary: '#ececf0',
  accent: '#9a8bdd',
  background: null,
}

export const DEFAULT_BRANDING: Branding = {
  name: 'Grace Community Church',
  appTitle: 'Church Presenter',
  logoUrl: null,
  logoAsFavicon: true,
  theme: DEFAULT_THEME,
}

export const DEFAULT_BACKGROUND = '#0b0b0c'
/** Default primary before the graphite theme. Saved branding with this value is migrated to the new default. */
export const LEGACY_DEFAULT_PRIMARY = '#e5a44f'
export const MAX_CHURCH_NAME = 80
export const MAX_APP_TITLE = 60

/* ───────── Colour maths ───────── */

type Rgb = [number, number, number]

/** Accepts #rgb or #rrggbb (any case); returns #rrggbb or null. */
export function normalizeHex(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const v = value.trim().toLowerCase()
  if (/^#[0-9a-f]{6}$/.test(v)) return v
  if (/^#[0-9a-f]{3}$/.test(v)) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`
  return null
}

export function hexToRgb(hex: string): Rgb {
  const n = normalizeHex(hex) ?? '#000000'
  return [1, 3, 5].map((i) => parseInt(n.slice(i, i + 2), 16)) as Rgb
}

export function rgbToHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`
}

/** Linear blend: t = 0 returns `a`, t = 1 returns `b`. */
export function mix(a: string, b: string, t: number): string {
  const x = hexToRgb(a)
  const y = hexToRgb(b)
  return rgbToHex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * t) as Rgb)
}

export function luminance(hex: string): number {
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  const [r, g, b] = hexToRgb(hex)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const channels = (hex: string) => hexToRgb(hex).join(' ')

/* ───────── Theme ───────── */

/** Faintest operator text colour; every background must keep it readable. */
const TEXT_FAINT = '#9a8f80'
const INK_DARK_BLEND = 0.86

export function isDefaultTheme(theme: BrandingTheme): boolean {
  return (
    theme.primary === DEFAULT_THEME.primary &&
    theme.accent === DEFAULT_THEME.accent &&
    (theme.background ?? null) === null
  )
}

/** Text colour for labels sitting on a primary-filled button. */
export function inkFor(primary: string): string {
  const dark = mix(primary, '#000000', INK_DARK_BLEND)
  return contrastRatio(dark, primary) >= contrastRatio('#ffffff', primary) ? dark : '#ffffff'
}

/**
 * CSS custom properties for a custom theme. The stylesheet defines the default
 * values in :root; a custom theme overrides them on <html> (or on a preview
 * container), so every component that uses the tokens follows automatically.
 */
export function themeVariables(theme: BrandingTheme): Record<string, string> {
  const primary = theme.primary
  const accent = theme.accent
  const vars: Record<string, string> = {
    '--amber-rgb': channels(primary),
    // Colours derived from the channels are re-declared so they also resolve
    // correctly when a theme is scoped to a preview element, not just <html>.
    '--amber': primary,
    '--amber-soft': `rgb(${channels(primary)} / 0.14)`,
    '--violet': accent,
    '--amber-bright': mix(primary, '#ffffff', 0.25),
    '--primary-hi': mix(primary, '#ffffff', 0.16),
    '--primary-lo': mix(primary, '#000000', 0.04),
    '--primary-hi-hover': mix(primary, '#ffffff', 0.26),
    '--primary-lo-hover': mix(primary, '#ffffff', 0.04),
    '--amber-ink': inkFor(mix(primary, '#000000', 0.04)),
    '--brand-mark-hi': mix(primary, '#ffffff', 0.45),
    '--brand-mark-lo': mix(primary, '#000000', 0.25),
    '--violet-rgb': channels(accent),
    '--violet-text': mix(accent, '#ffffff', 0.35),
  }
  if (theme.background) {
    const bg = theme.background
    Object.assign(vars, {
      '--bg': bg,
      '--bg-deep': mix(bg, '#000000', 0.3),
      '--surface-solid': mix(bg, '#ffffff', 0.07),
      '--surface-solid-raised': mix(bg, '#ffffff', 0.12),
      '--surface-well': mix(bg, '#ffffff', 0.05),
      '--surface': `rgb(${channels(mix(bg, '#ffffff', 0.07))} / 0.72)`,
      '--surface-2': `rgb(${channels(mix(bg, '#ffffff', 0.12))} / 0.66)`,
    })
  }
  return vars
}

export const THEME_VARIABLE_NAMES = Object.keys(
  themeVariables({ ...DEFAULT_THEME, background: DEFAULT_BACKGROUND }),
)

/** Apply a theme to an element (default: <html>). The default theme clears overrides. */
export function applyTheme(theme: BrandingTheme, element: HTMLElement = document.documentElement): void {
  for (const name of THEME_VARIABLE_NAMES) element.style.removeProperty(name)
  if (isDefaultTheme(theme)) return
  for (const [name, value] of Object.entries(themeVariables(theme))) element.style.setProperty(name, value)
}

/* ───────── Validation ───────── */

export type BrandingField = 'name' | 'appTitle' | 'primary' | 'accent' | 'background'

export type BrandingError =
  | 'required'
  | 'too-long'
  | 'invalid-color'
  | 'low-contrast'
  | 'background-too-light'

export interface ContrastReport {
  /** Primary as text/icon on the background. Needs 4.5:1. */
  primaryOnBackground: number
  /** Button label on the primary fill. Needs 4.5:1. */
  inkOnPrimary: number
  /** Accent as a selection marker on the background. Needs 3:1. */
  accentOnBackground: number
  /** Faintest UI text on the background. Needs 4.5:1. */
  faintTextOnBackground: number
}

export function contrastReport(theme: BrandingTheme): ContrastReport {
  const bg = theme.background ?? DEFAULT_BACKGROUND
  const fill = mix(theme.primary, '#000000', 0.04)
  return {
    primaryOnBackground: contrastRatio(theme.primary, bg),
    inkOnPrimary: contrastRatio(inkFor(fill), fill),
    accentOnBackground: contrastRatio(theme.accent, bg),
    faintTextOnBackground: contrastRatio(TEXT_FAINT, bg),
  }
}

/**
 * Field-level validation for the branding form. Contrast limits follow WCAG
 * 2.2 AA: 4.5:1 for text, 3:1 for UI indicators. The interface is dark, so a
 * background light enough to lose the faint text is refused.
 */
export function validateBranding(draft: Branding): Partial<Record<BrandingField, BrandingError>> {
  const errors: Partial<Record<BrandingField, BrandingError>> = {}
  const name = draft.name.trim()
  const title = draft.appTitle.trim()
  if (!name) errors.name = 'required'
  else if (name.length > MAX_CHURCH_NAME) errors.name = 'too-long'
  if (!title) errors.appTitle = 'required'
  else if (title.length > MAX_APP_TITLE) errors.appTitle = 'too-long'

  const primary = normalizeHex(draft.theme.primary)
  const accent = normalizeHex(draft.theme.accent)
  const background = draft.theme.background === null ? null : normalizeHex(draft.theme.background)
  if (!primary) errors.primary = 'invalid-color'
  if (!accent) errors.accent = 'invalid-color'
  if (draft.theme.background !== null && !background) errors.background = 'invalid-color'
  if (errors.primary || errors.accent || errors.background) return errors

  const report = contrastReport({ primary: primary!, accent: accent!, background })
  if (report.faintTextOnBackground < 4.5) errors.background = 'background-too-light'
  if (report.primaryOnBackground < 4.5 || report.inkOnPrimary < 4.5) errors.primary = 'low-contrast'
  if (report.accentOnBackground < 3) errors.accent = 'low-contrast'
  return errors
}

/**
 * Fill gaps and repair untrusted branding (old saves, backups, partial data).
 * Anything missing or invalid falls back to the default value for that field.
 */
export function normalizeBranding(value: unknown): Branding {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const theme = record.theme && typeof record.theme === 'object' ? (record.theme as Record<string, unknown>) : {}
  const name = sanitizeSingleLine(record.name, MAX_CHURCH_NAME)
  const appTitle = sanitizeSingleLine(record.appTitle, MAX_APP_TITLE)
  const storedPrimary = normalizeHex(theme.primary)
  const candidate: BrandingTheme = {
    // The old default gold was saved with every branding record; it now means "use the default".
    primary: storedPrimary && storedPrimary !== LEGACY_DEFAULT_PRIMARY ? storedPrimary : DEFAULT_THEME.primary,
    accent: normalizeHex(theme.accent) ?? DEFAULT_THEME.accent,
    background: theme.background === null || theme.background === undefined ? null : normalizeHex(theme.background),
  }
  // A stored theme that fails contrast (hand-edited data) is not applied.
  const themeErrors = validateBranding({ ...DEFAULT_BRANDING, theme: candidate })
  return {
    name: name || DEFAULT_BRANDING.name,
    appTitle: appTitle || DEFAULT_BRANDING.appTitle,
    logoUrl: validateImageDataUrl(record.logoUrl) ? (record.logoUrl as string) : null,
    logoAsFavicon: typeof record.logoAsFavicon === 'boolean' ? record.logoAsFavicon : DEFAULT_BRANDING.logoAsFavicon,
    theme:
      themeErrors.primary || themeErrors.accent || themeErrors.background ? DEFAULT_THEME : candidate,
  }
}

export function brandingEquals(a: Branding, b: Branding): boolean {
  return (
    a.name === b.name &&
    a.appTitle === b.appTitle &&
    a.logoUrl === b.logoUrl &&
    a.logoAsFavicon === b.logoAsFavicon &&
    a.theme.primary === b.theme.primary &&
    a.theme.accent === b.theme.accent &&
    a.theme.background === b.theme.background
  )
}
