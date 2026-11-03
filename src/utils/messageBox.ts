import type {
  MessageBorderStyle,
  MessageBoxStyle,
  MessageFontFamily,
  MessagePosition,
  SlideElement,
  TextAlign,
} from '../types'
import { contrastRatio, mix, normalizeHex } from './branding'
import { newId } from './id'

/* ───────── Limits and defaults ───────── */

export const MESSAGE_LIMITS = {
  fontSize: { min: 14, max: 140 },
  fontWeight: { min: 300, max: 800 },
  lineHeight: { min: 0.9, max: 2.2 },
  borderWidth: { min: 0, max: 16 },
  borderRadius: { min: 0, max: 64 },
  width: { min: 12, max: 100 },
  height: { min: 8, max: 100 },
  text: 2000,
} as const

export const MESSAGE_BORDER_STYLES: MessageBorderStyle[] = ['solid', 'dashed', 'dotted', 'none']
export const MESSAGE_FONT_FAMILIES: MessageFontFamily[] = ['sans', 'serif']
export const MESSAGE_POSITIONS: MessagePosition[] = [
  'top-left',
  'top',
  'top-right',
  'center',
  'bottom-left',
  'bottom',
  'bottom-right',
]
const ALIGNS: TextAlign[] = ['left', 'center', 'right']

/** A dark, warm panel with light text and a thin amber edge: readable on any slide background. */
export const DEFAULT_MESSAGE_STYLE: MessageBoxStyle = {
  textColor: '#f8f0e3',
  backgroundColor: '#100d0a',
  backgroundOpacity: 0.84,
  borderEnabled: true,
  borderStyle: 'solid',
  borderColor: '#e5a44f',
  borderWidth: 2,
  borderRadius: 18,
  fontFamily: 'sans',
  fontSize: 34,
  fontWeight: 600,
  lineHeight: 1.3,
  align: 'center',
}

/** Inner margin kept free when snapping to a preset position (percent of slide). */
export const MESSAGE_EDGE_MARGIN = 5

/* ───────── Geometry ───────── */

export interface Box {
  x: number
  y: number
  width: number
  height: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const round1 = (value: number) => Math.round(value * 10) / 10

/** Keep a box fully inside the slide: size within limits, position within 0–100%. */
export function clampMessageBox(box: Box): Box {
  const width = clamp(Number.isFinite(box.width) ? box.width : 60, MESSAGE_LIMITS.width.min, MESSAGE_LIMITS.width.max)
  const height = clamp(Number.isFinite(box.height) ? box.height : 20, MESSAGE_LIMITS.height.min, MESSAGE_LIMITS.height.max)
  const x = clamp(Number.isFinite(box.x) ? box.x : 0, 0, 100 - width)
  const y = clamp(Number.isFinite(box.y) ? box.y : 0, 0, 100 - height)
  return { x: round1(x), y: round1(y), width: round1(width), height: round1(height) }
}

/** Where a box of this size sits for a preset, inside the edge margin. */
export function positionFor(preset: MessagePosition, size: Pick<Box, 'width' | 'height'>): Box {
  const m = MESSAGE_EDGE_MARGIN
  const { width, height } = clampMessageBox({ x: 0, y: 0, ...size })
  const left = m
  const centerX = (100 - width) / 2
  const right = 100 - m - width
  const top = m
  const middle = (100 - height) / 2
  const bottom = 100 - m - height
  const spots: Record<MessagePosition, [number, number]> = {
    'top-left': [left, top],
    top: [centerX, top],
    'top-right': [right, top],
    center: [centerX, middle],
    'bottom-left': [left, bottom],
    bottom: [centerX, bottom],
    'bottom-right': [right, bottom],
  }
  const [x, y] = spots[preset]
  return clampMessageBox({ x, y, width, height })
}

/** The preset a box currently matches, if any (for highlighting the preset buttons). */
export function matchingPosition(box: Box): MessagePosition | null {
  return MESSAGE_POSITIONS.find((preset) => {
    const spot = positionFor(preset, box)
    return Math.abs(spot.x - box.x) < 0.6 && Math.abs(spot.y - box.y) < 0.6
  }) ?? null
}

/* ───────── Colour and contrast ───────── */

/**
 * Worst-case contrast of the text over the box background, assuming the box
 * may sit on a black or a white slide area. With a fully opaque background the
 * slide behind does not matter; with a translucent one it might.
 */
export function messageContrast(style: Pick<MessageBoxStyle, 'textColor' | 'backgroundColor' | 'backgroundOpacity'>): number {
  const text = normalizeHex(style.textColor)
  const background = normalizeHex(style.backgroundColor)
  if (!text || !background) return 0
  const alpha = clamp(style.backgroundOpacity, 0, 1)
  const overBlack = mix('#000000', background, alpha)
  const overWhite = mix('#ffffff', background, alpha)
  return Math.min(contrastRatio(text, overBlack), contrastRatio(text, overWhite))
}

/** Large text (≥ 24 px at the 1280 reference, or ≥ 19 px bold) needs 3:1; smaller text 4.5:1. */
export function requiredContrast(style: Pick<MessageBoxStyle, 'fontSize' | 'fontWeight'>): number {
  return style.fontSize >= 24 || (style.fontSize >= 19 && style.fontWeight >= 700) ? 3 : 4.5
}

/** Smallest background opacity (0.05 steps) that keeps the text readable; null if none does. */
export function minimumReadableOpacity(style: MessageBoxStyle): number | null {
  const needed = requiredContrast(style)
  for (let step = 0; step <= 20; step += 1) {
    const opacity = step / 20
    if (messageContrast({ ...style, backgroundOpacity: opacity }) >= needed) return opacity
  }
  return null
}

/* ───────── Validation ───────── */

export type MessageField =
  | 'textColor'
  | 'backgroundColor'
  | 'backgroundOpacity'
  | 'borderColor'
  | 'borderWidth'
  | 'borderRadius'
  | 'fontSize'
  | 'fontWeight'
  | 'lineHeight'

export type MessageError = 'invalid-color' | 'out-of-range' | 'low-contrast'

/** Check a full style. Returns the first problem per field. */
export function validateMessageStyle(style: MessageBoxStyle): Partial<Record<MessageField, MessageError>> {
  const errors: Partial<Record<MessageField, MessageError>> = {}
  if (!normalizeHex(style.textColor)) errors.textColor = 'invalid-color'
  if (!normalizeHex(style.backgroundColor)) errors.backgroundColor = 'invalid-color'
  if (!normalizeHex(style.borderColor)) errors.borderColor = 'invalid-color'
  const ranges: [MessageField, number, number][] = [
    ['backgroundOpacity', 0, 1],
    ['borderWidth', MESSAGE_LIMITS.borderWidth.min, MESSAGE_LIMITS.borderWidth.max],
    ['borderRadius', MESSAGE_LIMITS.borderRadius.min, MESSAGE_LIMITS.borderRadius.max],
    ['fontSize', MESSAGE_LIMITS.fontSize.min, MESSAGE_LIMITS.fontSize.max],
    ['fontWeight', MESSAGE_LIMITS.fontWeight.min, MESSAGE_LIMITS.fontWeight.max],
    ['lineHeight', MESSAGE_LIMITS.lineHeight.min, MESSAGE_LIMITS.lineHeight.max],
  ]
  for (const [field, min, max] of ranges) {
    const value = style[field as keyof MessageBoxStyle] as number
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) errors[field] = 'out-of-range'
  }
  if (!errors.textColor && !errors.backgroundColor && !errors.backgroundOpacity) {
    if (messageContrast(style) < requiredContrast(style)) errors.textColor = 'low-contrast'
  }
  return errors
}

/**
 * Apply a change only if the result is valid. The editor uses this so the
 * stored style is never invalid; the caller shows the returned error instead.
 */
export function tryUpdateMessageStyle(
  current: MessageBoxStyle,
  patch: Partial<MessageBoxStyle>,
): { ok: true; style: MessageBoxStyle } | { ok: false; field: MessageField; error: MessageError } {
  const next = { ...current, ...patch }
  for (const key of ['textColor', 'backgroundColor', 'borderColor'] as const) {
    const hex = normalizeHex(next[key])
    if (hex) next[key] = hex
  }
  const errors = validateMessageStyle(next)
  const changed = Object.keys(patch) as MessageField[]
  // Report errors on the fields being changed first; contrast is reported on the colour or opacity that caused it.
  const field =
    changed.find((key) => errors[key]) ??
    (errors.textColor === 'low-contrast' ? (changed.find((key) => key === 'backgroundColor' || key === 'backgroundOpacity' || key === 'fontSize' || key === 'fontWeight') ?? 'textColor') : undefined) ??
    (Object.keys(errors)[0] as MessageField | undefined)
  if (field) return { ok: false, field, error: errors[field] ?? errors.textColor! }
  return { ok: true, style: next }
}

/** Repair untrusted or older data field by field; invalid values fall back to defaults. */
export function normalizeMessageStyle(value: unknown): MessageBoxStyle {
  const r = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const d = DEFAULT_MESSAGE_STYLE
  const num = (v: unknown, min: number, max: number, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v) ? clamp(v, min, max) : fallback
  const candidate: MessageBoxStyle = {
    textColor: normalizeHex(r.textColor) ?? d.textColor,
    backgroundColor: normalizeHex(r.backgroundColor) ?? d.backgroundColor,
    backgroundOpacity: num(r.backgroundOpacity, 0, 1, d.backgroundOpacity),
    borderEnabled: typeof r.borderEnabled === 'boolean' ? r.borderEnabled : d.borderEnabled,
    borderStyle: MESSAGE_BORDER_STYLES.includes(r.borderStyle as MessageBorderStyle) ? (r.borderStyle as MessageBorderStyle) : d.borderStyle,
    borderColor: normalizeHex(r.borderColor) ?? d.borderColor,
    borderWidth: num(r.borderWidth, MESSAGE_LIMITS.borderWidth.min, MESSAGE_LIMITS.borderWidth.max, d.borderWidth),
    borderRadius: num(r.borderRadius, MESSAGE_LIMITS.borderRadius.min, MESSAGE_LIMITS.borderRadius.max, d.borderRadius),
    fontFamily: MESSAGE_FONT_FAMILIES.includes(r.fontFamily as MessageFontFamily) ? (r.fontFamily as MessageFontFamily) : d.fontFamily,
    fontSize: num(r.fontSize, MESSAGE_LIMITS.fontSize.min, MESSAGE_LIMITS.fontSize.max, d.fontSize),
    fontWeight: Math.round(num(r.fontWeight, MESSAGE_LIMITS.fontWeight.min, MESSAGE_LIMITS.fontWeight.max, d.fontWeight) / 100) * 100,
    lineHeight: num(r.lineHeight, MESSAGE_LIMITS.lineHeight.min, MESSAGE_LIMITS.lineHeight.max, d.lineHeight),
    align: ALIGNS.includes(r.align as TextAlign) ? (r.align as TextAlign) : d.align,
  }
  // Stored colours that are unreadable together go back to the default pairing.
  if (messageContrast(candidate) < requiredContrast(candidate)) {
    candidate.textColor = d.textColor
    candidate.backgroundColor = d.backgroundColor
    candidate.backgroundOpacity = d.backgroundOpacity
  }
  return candidate
}

/* ───────── Elements ───────── */

export function makeMessageElement(text: string, overrides: Partial<SlideElement> = {}): SlideElement {
  const box = positionFor('bottom', { width: 70, height: 22 })
  return {
    id: newId('el'),
    type: 'message',
    ...box,
    zIndex: 3,
    opacity: 1,
    visible: true,
    text,
    ...overrides,
    settings: { message: { ...DEFAULT_MESSAGE_STYLE }, ...overrides.settings },
  }
}

export function messageStyleOf(element: SlideElement): MessageBoxStyle {
  return normalizeMessageStyle(element.settings?.message)
}

/* ───────── Rendering ───────── */

/** Slide pixels at the 1280 reference → container units, so every view scales the same way. */
const cq = (px: number) => `${(px / 12.8).toFixed(3)}cqw`

export function messageBoxCss(style: MessageBoxStyle): Record<string, string | number> {
  const showBorder = style.borderEnabled && style.borderStyle !== 'none' && style.borderWidth > 0
  const background = normalizeHex(style.backgroundColor) ?? DEFAULT_MESSAGE_STYLE.backgroundColor
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(background.slice(i, i + 2), 16))
  return {
    color: style.textColor,
    backgroundColor: `rgb(${r} ${g} ${b} / ${style.backgroundOpacity})`,
    border: showBorder ? `${cq(style.borderWidth)} ${style.borderStyle} ${style.borderColor}` : 'none',
    borderRadius: cq(style.borderRadius),
    fontFamily: style.fontFamily === 'serif' ? 'var(--font-slide-serif)' : 'var(--font-ui)',
    fontWeight: style.fontWeight,
    lineHeight: style.lineHeight,
    textAlign: style.align,
    padding: `${cq(Math.max(12, style.fontSize * 0.5))} ${cq(Math.max(16, style.fontSize * 0.7))}`,
  }
}

export function messageFontSize(style: MessageBoxStyle, scale = 1): string {
  return cq(style.fontSize * scale)
}
