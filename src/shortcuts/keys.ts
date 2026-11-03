/**
 * Key combinations are stored as normalized strings such as "Mod+Shift+K".
 *
 * - "Mod" is ⌘ on macOS and Ctrl on Windows/Linux, so one saved shortcut works
 *   on every platform. "Ctrl" (macOS only) and "Meta" (Windows/Linux only)
 *   name the other physical keys when a user records them.
 * - Modifier order is fixed: Mod, Ctrl, Meta, Alt, Shift, then the key.
 * - Letters are upper-case. Named keys use KeyboardEvent.key names
 *   (ArrowRight, Escape, Space, Home, F5, …).
 */

export type Platform = 'mac' | 'other'

const MODIFIER_ORDER = ['Mod', 'Ctrl', 'Meta', 'Alt', 'Shift'] as const
type Modifier = (typeof MODIFIER_ORDER)[number]

const NAMED_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Enter',
  'Escape',
  'Space',
  'Tab',
  'Backspace',
  'Delete',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'Insert',
  ...Array.from({ length: 12 }, (_, i) => `F${i + 1}`),
])

const PUNCTUATION: Record<string, string> = {
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  Backquote: '`',
}

export function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'other'
  const data = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData
  const name = data?.platform ?? navigator.platform ?? navigator.userAgent
  return /mac|iphone|ipad|ipod/i.test(name) ? 'mac' : 'other'
}

export interface KeyLike {
  key: string
  code?: string
  metaKey: boolean
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
}

export const isModifierKey = (key: string) =>
  key === 'Shift' || key === 'Control' || key === 'Alt' || key === 'Meta' || key === 'OS' || key === 'AltGraph'

/**
 * The key part of a combination. Letters follow the active keyboard layout
 * (AZERTY "A" is "A"); when a modifier changes the produced character (⌥S → ß
 * on macOS, Shift+1 → !), the physical key code is used instead, so the
 * combination stays stable.
 */
function baseKey(event: KeyLike): string | null {
  const { key, code = '' } = event
  if (key === ' ' || code === 'Space') return 'Space'
  if (key === 'Esc') return 'Escape'
  if (NAMED_KEYS.has(key)) return key
  if (/^[a-z]$/i.test(key)) return key.toUpperCase()
  if (/^Key[A-Z]$/.test(code)) return code.slice(3)
  if (/^Digit[0-9]$/.test(code)) return code.slice(5)
  if (/^Numpad[0-9]$/.test(code)) return code.slice(6)
  if (/^[0-9]$/.test(key)) return key
  if (PUNCTUATION[code]) return PUNCTUATION[code]
  if (key.length === 1 && !/\s/.test(key)) return key
  return null
}

/** Normalized combination for a keyboard event, or null for modifier-only or unknown keys. */
export function comboFromEvent(event: KeyLike, platform: Platform = detectPlatform()): string | null {
  if (isModifierKey(event.key)) return null
  const key = baseKey(event)
  if (!key) return null
  const mods: Modifier[] = []
  if (platform === 'mac') {
    if (event.metaKey) mods.push('Mod')
    if (event.ctrlKey) mods.push('Ctrl')
  } else {
    if (event.ctrlKey) mods.push('Mod')
    if (event.metaKey) mods.push('Meta')
  }
  if (event.altKey) mods.push('Alt')
  if (event.shiftKey) mods.push('Shift')
  return [...mods, key].join('+')
}

/** Parse and re-normalize a stored combination. Returns null if it is not valid. */
export function normalizeCombo(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 40) return null
  const parts = value.split('+').map((part) => part.trim())
  // A literal "+" key is written as "Shift+=" by the recorder; a trailing "+" is invalid.
  if (parts.some((part) => !part)) return null
  const key = parts.pop()!
  const mods = new Set<Modifier>()
  for (const part of parts) {
    const match = MODIFIER_ORDER.find((m) => m.toLowerCase() === part.toLowerCase())
    if (!match || mods.has(match)) return null
    mods.add(match)
  }
  let normalizedKey: string
  if (/^[a-z]$/i.test(key)) normalizedKey = key.toUpperCase()
  else if (NAMED_KEYS.has(key)) normalizedKey = key
  else if (/^[0-9]$/.test(key) || Object.values(PUNCTUATION).includes(key)) normalizedKey = key
  else return null
  return [...MODIFIER_ORDER.filter((m) => mods.has(m)), normalizedKey].join('+')
}

const MAC_SYMBOLS: Record<Modifier, string> = { Mod: '⌘', Ctrl: '⌃', Meta: '⌘', Alt: '⌥', Shift: '⇧' }
const OTHER_NAMES: Record<Modifier, string> = { Mod: 'Ctrl', Ctrl: 'Ctrl', Meta: 'Win', Alt: 'Alt', Shift: 'Shift' }
const KEY_LABELS: Record<string, string> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Escape: 'Esc',
  Enter: '↵',
  Backspace: '⌫',
  Delete: 'Del',
  PageUp: 'Page Up',
  PageDown: 'Page Down',
}

/** The parts to draw as key caps, in the platform's conventional order and naming. */
export function comboParts(combo: string, platform: Platform = detectPlatform()): string[] {
  const parts = combo.split('+')
  const key = parts.pop()!
  const label = KEY_LABELS[key] ?? key
  if (platform === 'mac') {
    // macOS convention: ⌃ ⌥ ⇧ ⌘ then the key.
    const order: Modifier[] = ['Ctrl', 'Alt', 'Shift', 'Mod', 'Meta']
    return [...order.filter((m) => parts.includes(m)).map((m) => MAC_SYMBOLS[m]), label]
  }
  return [...MODIFIER_ORDER.filter((m) => parts.includes(m)).map((m) => OTHER_NAMES[m]), label]
}

/** Readable text for a combination: "⌘⇧K" on macOS, "Ctrl+Shift+K" elsewhere. */
export function formatCombo(combo: string, platform: Platform = detectPlatform()): string {
  const parts = comboParts(combo, platform)
  return platform === 'mac' ? parts.join('') : parts.join('+')
}

/** Spoken label for screen readers, e.g. "Command Shift K". */
export function speakCombo(combo: string, platform: Platform = detectPlatform()): string {
  const words: Record<string, string> =
    platform === 'mac'
      ? { Mod: 'Command', Ctrl: 'Control', Meta: 'Command', Alt: 'Option', Shift: 'Shift' }
      : { Mod: 'Control', Ctrl: 'Control', Meta: 'Windows', Alt: 'Alt', Shift: 'Shift' }
  const keyWords: Record<string, string> = {
    ArrowUp: 'Up arrow',
    ArrowDown: 'Down arrow',
    ArrowLeft: 'Left arrow',
    ArrowRight: 'Right arrow',
  }
  return combo
    .split('+')
    .map((part) => words[part] ?? keyWords[part] ?? part)
    .join(' ')
}

export type ComboProblem = 'reserved' | 'text-editing'

/**
 * Combinations the app must not take over: the browser or operating system
 * handles them first (closing tabs, quitting, switching apps), or they are how
 * people move focus and edit text.
 */
const RESERVED = new Set([
  'Mod+W',
  'Mod+Q',
  'Mod+T',
  'Mod+N',
  'Mod+R',
  'Mod+L',
  'Mod+H',
  'Mod+M',
  'Mod+P',
  'Mod+Tab',
  'Mod+Space',
  'Mod+Shift+T',
  'Mod+Shift+N',
  'Mod+Shift+W',
  'Mod+Shift+Q',
  'Mod+Shift+R',
  'Mod+Shift+Delete',
  'Alt+Tab',
  'Alt+F4',
  'Mod+Alt+Escape',
  'Mod+Alt+Delete',
  'Ctrl+Space',
  'F5',
  'F11',
  'F12',
  'Tab',
  'Shift+Tab',
])
const TEXT_EDITING = new Set(['Mod+C', 'Mod+V', 'Mod+X', 'Mod+A', 'Mod+F', 'Backspace', 'Delete', 'Enter', 'Shift+Enter'])

/** Why a recorded combination cannot be used, or null if it can. */
export function comboProblem(combo: string): ComboProblem | null {
  if (RESERVED.has(combo)) return 'reserved'
  if (TEXT_EDITING.has(combo)) return 'text-editing'
  return null
}

/** True for combinations with no Mod/Ctrl/Meta/Alt: they must never fire while typing. */
export const isBareKey = (combo: string) => !/(^|\+)(Mod|Ctrl|Meta|Alt)\+/.test(combo)
