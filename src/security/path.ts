export type PathValidation = { ok: true; path: string } | { ok: false; reason: string }

const WINDOWS_ABSOLUTE = /^[a-zA-Z]:[\\/]/
const DRIVE_RELATIVE = /^[a-zA-Z]:[^\\/]/

/**
 * Validates a path *relative to the app data directory*. The webview never
 * receives filesystem APIs; a desktop shell must repeat this check and then
 * canonicalize the result inside its allowlisted media root.
 */
export function validateRelativeMediaPath(raw: string): PathValidation {
  const input = raw.trim()
  if (!input) return { ok: false, reason: 'empty' }
  if (input.length > 512) return { ok: false, reason: 'too-long' }
  if (input.includes('\u0000')) return { ok: false, reason: 'null-byte' }
  if (input.includes('\\')) return { ok: false, reason: 'unc-or-backslash' }
  if (input.startsWith('//') || input.startsWith('\\\\')) return { ok: false, reason: 'unc-path' }
  if (input.startsWith('/') || input.startsWith('~')) return { ok: false, reason: 'absolute-path' }
  if (WINDOWS_ABSOLUTE.test(input) || DRIVE_RELATIVE.test(input)) {
    return { ok: false, reason: 'windows-drive-path' }
  }
  if (input.includes(':')) return { ok: false, reason: 'alternate-data-stream' }

  const segments = input.split('/')
  if (segments.some((segment) => segment === '..' || segment === '.')) {
    return { ok: false, reason: 'path-traversal' }
  }
  if (segments.some((segment) => !segment || segment.length > 128)) {
    return { ok: false, reason: 'invalid-segment' }
  }
  if (!/^[a-zA-Z0-9/_\-. ]+$/.test(input)) return { ok: false, reason: 'invalid-characters' }
  return { ok: true, path: segments.join('/') }
}

export function safeDisplayFileName(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? 'media'
  return (
    base
      .replace(/[\u0000-\u001F\u007F<>:"|?*]/g, '')
      .replace(/^\.+/, '')
      .trim()
      .slice(0, 120) || 'media'
  )
}
