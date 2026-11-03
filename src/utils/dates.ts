import type { Locale } from '../types'

const INTL_LOCALE: Record<Locale, string> = {
  // Day-first everywhere (DD/MM/YYYY, 24-hour clock), English included.
  en: 'en-GB',
  pt: 'pt-PT',
  'pt-BR': 'pt-BR',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
}

export function intlLocale(locale: Locale): string {
  return INTL_LOCALE[locale]
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function parseISODate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year || 2026, (month || 1) - 1, day || 1, 12, 0, 0)
}

export function formatLongDate(value: string, _locale: Locale): string {
  return formatNumericDate(value)
}

/** User-facing calendar date format. ISO remains the storage and comparison format. */
export function formatNumericDate(value: string): string {
  const date = parseISODate(value)
  if (!Number.isFinite(date.getTime())) return value
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}/${date.getFullYear()}`
}

/** Date and 24-hour time for timestamps, such as the last backup: DD/MM/YYYY HH:MM. */
export function formatNumericDateTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) return typeof value === 'string' ? value : ''
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${formatNumericDate(isoDate(date))} ${hours}:${minutes}`
}

/**
 * Reads a typed day-first date (DD/MM/YYYY; "/", ".", "-" or spaces between, or
 * DDMMYYYY) and returns it as ISO YYYY-MM-DD. Null when it is not a real date.
 */
export function parseDayMonthYear(text: string): string | null {
  const trimmed = text.trim()
  const parts = /^\d{8}$/.test(trimmed)
    ? [trimmed.slice(0, 2), trimmed.slice(2, 4), trimmed.slice(4)]
    : trimmed.split(/[\s./-]+/)
  if (parts.length !== 3 || parts[2].length !== 4) return null
  const [day, month, year] = parts.map(Number)
  if (![day, month, year].every(Number.isInteger) || year < 1000) return null
  const date = new Date(year, month - 1, day, 12, 0, 0)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  return isoDate(date)
}

/** Readable title format used when a new service name is generated from its date. */
export function formatServiceTitleDate(value: string, locale: Locale): string {
  try {
    const date = parseISODate(value)
    if (locale === 'pt' || locale === 'pt-BR') {
      const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
      return `${weekdays[date.getDay()]}: ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
    }
    return new Intl.DateTimeFormat(intlLocale(locale), {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date)
  } catch {
    return value
  }
}

export function formatMonthYear(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatMonthShort(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { month: 'short' }).format(date)
}

export function formatMonthName(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { month: 'long' }).format(date)
}

export function formatWeekdayShort(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { weekday: 'short' }).format(date)
}

export function formatTime(value: string, locale: Locale): string {
  const [hour, minute] = value.split(':').map(Number)
  const date = new Date(2026, 0, 1, hour || 0, minute || 0)
  try {
    return new Intl.DateTimeFormat(intlLocale(locale), {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date)
  } catch {
    return value
  }
}

export function addDays(date: Date, amount: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + amount)
  return copy
}

export function addMonths(date: Date, amount: number): Date {
  const copy = new Date(date.getFullYear(), date.getMonth() + amount, 1, 12, 0, 0)
  return copy
}

export function startOfMonthGrid(date: Date): Date {
  const first = new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0)
  const start = new Date(first)
  start.setDate(first.getDate() - first.getDay())
  return start
}

export function isoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Returns whether an ISO date falls on the selected Sunday-first weekday. */
export function isDateOnWeekday(value: string, weekday: number | null): boolean {
  if (weekday === null || weekday < 0 || weekday > 6) return false
  return parseISODate(value).getDay() === weekday
}

export function nextSundayISO(from = new Date()): string {
  const day = from.getDay()
  const distance = (7 - day) % 7 || 7
  return isoDate(addDays(from, distance))
}

export function isToday(value: string): boolean {
  return value === isoDate(new Date())
}

export function formatToolbarDate(value: string, locale: Locale): string {
  try {
    const d = parseISODate(value)
    const fmt = intlLocale(locale)
    const weekday = new Intl.DateTimeFormat(fmt, { weekday: 'short' }).format(d)
    const day = d.getDate()
    const month = new Intl.DateTimeFormat(fmt, { month: 'short' }).format(d)
    return `${weekday} ${day} ${month}`
  } catch {
    return value
  }
}

export function formatClock(locale: Locale, date = new Date()): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

export function elapsedLabel(startedAt: string | null): string {
  if (!startedAt) return '00:00:00'
  const elapsed = Math.max(0, Date.now() - new Date(startedAt).getTime())
  const totalSeconds = Math.floor(elapsed / 1000)
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0')
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}
