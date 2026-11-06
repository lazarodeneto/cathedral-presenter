import { LOCALES, type Locale } from '../types'
const KEY = 'church-presenter:locale'
export function preferredLocale(): Locale | undefined {
  try {
    const value = localStorage.getItem(KEY)
    return LOCALES.includes(value as Locale) ? (value as Locale) : undefined
  } catch {
    return undefined
  }
}
export function savePreferredLocale(locale: Locale) {
  try {
    localStorage.setItem(KEY, locale)
  } catch {
    /* Selection still works without storage. */
  }
}
