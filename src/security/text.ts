const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g
const BIDI_CHARS = /[\u202A-\u202E\u2066-\u2069]/g

/**
 * Slide and library text is always rendered as React text, never as HTML.
 * This removes control/bidi characters that can spoof operator UI or exports.
 */
export function sanitizeText(input: unknown, maxLength = 20_000): string {
  if (typeof input !== 'string') return ''
  return input
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL_CHARS, '')
    .replace(BIDI_CHARS, '')
    .slice(0, maxLength)
    .trim()
}

/** Sanitizes editable slide text without removing spaces at the caret. */
export function sanitizeEditableText(input: unknown, maxLength = 20_000): string {
  if (typeof input !== 'string') return ''
  return input
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL_CHARS, '')
    .replace(BIDI_CHARS, '')
    .slice(0, maxLength)
}

export function sanitizeSingleLine(input: unknown, maxLength = 500): string {
  return sanitizeText(input, maxLength).replace(/\s+/g, ' ')
}

export function isBlank(value: string): boolean {
  return value.trim().length === 0
}

export function truncate(value: string, max = 120): string {
  if (value.length <= max) return value
  return `${value.slice(0, Math.max(0, max - 1)).trimEnd()}…`
}
