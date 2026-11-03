import { BIBLE_BOOKS, BIBLE_TRANSLATIONS, BIBLE_VERSES } from '../../data/bible'
import { LOCALES } from '../../types'
import type {
  BibleBookTexts,
  BibleTranslation,
  CustomBibleTranslation,
  Locale,
} from '../../types'
import { sanitizeSingleLine, sanitizeText } from '../../security/text'

export const MAX_CUSTOM_BIBLES = 25
const MAX_VERSES_PER_CUSTOM_BIBLE = 40_000
const MAX_VERSE_LENGTH = 5_000
const TRANSLATION_ID_PATTERN = /^[A-Za-z0-9_-]{1,140}$/
const LICENSE_TYPES: readonly BibleTranslation['licenseType'][] = [
  'public-domain',
  'cc0',
  'cc-by',
  'provider',
  'church-import',
]
const BOOK_IDS = new Set<string>(BIBLE_BOOKS.map((book) => book.id))

let customBibles: CustomBibleTranslation[] = []
let hiddenIds: string[] = []
let archivedIds: string[] = []
let deletedIds: string[] = []

export function setCustomBibleTranslations(entries: CustomBibleTranslation[]): void {
  customBibles = entries
}

export function setHiddenBibleIds(ids: string[]): void {
  hiddenIds = ids
}

export function setArchivedBibleIds(ids: string[]): void {
  archivedIds = ids
}

export function setDeletedBibleIds(ids: string[]): void {
  deletedIds = ids
}

export function hiddenBibleIds(): string[] {
  return hiddenIds
}

export function archivedBibleIds(): string[] {
  return archivedIds
}

export function customBibleTranslations(): CustomBibleTranslation[] {
  return customBibles
}

export function allBibleTranslations(): BibleTranslation[] {
  return bibleTranslationsWith(customBibles)
}

/** Bundled translations followed by the supplied administrator imports, excluding hidden and archived. */
export function bibleTranslationsWith(
  entries: CustomBibleTranslation[],
): BibleTranslation[] {
  const visible = BIBLE_TRANSLATIONS.filter(
    (t) => !hiddenIds.includes(t.id) && !archivedIds.includes(t.id) && !deletedIds.includes(t.id),
  )
  return [...visible, ...entries.map((entry) => entry.translation)]
}

/** All bundled translations, including hidden ones. */
export function allBundledTranslations(): BibleTranslation[] {
  return BIBLE_TRANSLATIONS
}

export function allBibleTranslationIds(): Set<string> {
  return new Set(allBibleTranslations().map((translation) => translation.id))
}

export function bibleVersesFor(translationId: string): BibleBookTexts {
  return (
    customBibles.find((entry) => entry.translation.id === translationId)?.books ??
    BIBLE_VERSES[translationId] ??
    {}
  )
}

export function isBundledBibleTranslation(translationId: string): boolean {
  return BIBLE_TRANSLATIONS.some((translation) => translation.id === translationId)
}

export function findBibleTranslation(translationId: string): BibleTranslation | undefined {
  return allBibleTranslations().find((translation) => translation.id === translationId)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function languageOf(value: unknown): Locale | null {
  return typeof value === 'string' && LOCALES.includes(value as Locale) ? (value as Locale) : null
}

function licenseTypeOf(value: unknown): BibleTranslation['licenseType'] {
  return LICENSE_TYPES.includes(value as BibleTranslation['licenseType'])
    ? (value as BibleTranslation['licenseType'])
    : 'church-import'
}

function uniqueId(existing: Set<string>, preferred: string): string {
  if (TRANSLATION_ID_PATTERN.test(preferred) && !existing.has(preferred)) return preferred
  const base = preferred.replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 120) || 'custom-bible'
  let candidate = base
  let index = 2
  while (existing.has(candidate) || !TRANSLATION_ID_PATTERN.test(candidate)) {
    candidate = `${base}-${index}`
    index += 1
  }
  return candidate
}

function slug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Stable, human-readable id for an administrator-imported Bible. */
export function createCustomBibleId(
  abbreviation: string,
  language: Locale,
  existingIds: Set<string>,
): string {
  const suffix = slug(abbreviation) || slug(language) || 'bible'
  return uniqueId(existingIds, `custom-${slug(language)}-${suffix}`)
}

export function countBibleVerses(books: BibleBookTexts): number {
  let count = 0
  for (const chapters of Object.values(books)) {
    for (const verses of Object.values(chapters)) {
      count += Object.keys(verses).length
    }
  }
  return count
}

/**
 * Repairs one administrator-imported Bible. Returns null when the entry no
 * longer contains usable Scripture text, an id collision, or an unknown
 * language. Imported text is always stored as plain React text, never HTML.
 */
export function normalizeCustomBible(
  value: unknown,
  existingIds: Set<string> = new Set(),
): CustomBibleTranslation | null {
  if (!isRecord(value)) return null
  const translation = isRecord(value.translation) ? value.translation : null
  const rawBooks = isRecord(value.books) ? value.books : null
  if (!translation || !rawBooks) return null

  const language = languageOf(translation.language)
  if (!language) return null

  const requestedId =
    typeof translation.id === 'string' ? sanitizeSingleLine(translation.id, 140) : ''
  if (!TRANSLATION_ID_PATTERN.test(requestedId) || isBundledBibleTranslation(requestedId)) {
    return null
  }
  const id = uniqueId(existingIds, requestedId)
  if (id !== requestedId) return null

  const name = sanitizeSingleLine(translation.name, 120)
  const abbreviation = sanitizeSingleLine(translation.abbreviation, 24)
  if (!name || !abbreviation) return null

  const books: BibleBookTexts = {}
  let verseCount = 0
  for (const [bookId, rawChapters] of Object.entries(rawBooks)) {
    if (!BOOK_IDS.has(bookId) || !isRecord(rawChapters)) continue
    const chapters: Record<number, Record<number, string>> = {}
    for (const [rawChapter, rawVerses] of Object.entries(rawChapters)) {
      const chapter = Number(rawChapter)
      if (!Number.isInteger(chapter) || chapter < 1 || chapter > 150 || !isRecord(rawVerses)) {
        continue
      }
      const verses: Record<number, string> = {}
      for (const [rawVerse, rawText] of Object.entries(rawVerses)) {
        const verse = Number(rawVerse)
        if (!Number.isInteger(verse) || verse < 1 || verse > 200) continue
        const text = sanitizeText(rawText, MAX_VERSE_LENGTH)
        if (!text) continue
        if (verseCount >= MAX_VERSES_PER_CUSTOM_BIBLE) break
        verses[verse] = text
        verseCount += 1
      }
      if (Object.keys(verses).length > 0) chapters[chapter] = verses
      if (verseCount >= MAX_VERSES_PER_CUSTOM_BIBLE) break
    }
    if (Object.keys(chapters).length > 0) books[bookId] = chapters
    if (verseCount >= MAX_VERSES_PER_CUSTOM_BIBLE) break
  }
  if (verseCount === 0) return null

  const licenseText = sanitizeText(translation.licenseText, 2_000)
  const copyrightNotice =
    sanitizeText(translation.copyrightNotice, 2_000) ||
    licenseText ||
    'Imported by the church. Check the publisher terms before redistribution.'
  const sourceUrl = sanitizeSingleLine(translation.sourceUrl, 500)

  return {
    translation: {
      id,
      providerId: 'local-bible',
      name,
      abbreviation,
      language,
      licenseType: licenseTypeOf(translation.licenseType),
      licenseText: licenseText || 'Imported by the church',
      sourceUrl: sourceUrl || undefined,
      copyrightNotice,
      bundled: false,
      sample: false,
      verseCount,
      availability: 'bundled',
    },
    books,
  }
}

/** Repairs persisted custom Bibles. Invalid or duplicate entries are dropped. */
export function sanitizeCustomBibleTranslations(value: unknown): CustomBibleTranslation[] {
  if (!Array.isArray(value)) return []
  const entries: CustomBibleTranslation[] = []
  const ids = new Set(BIBLE_TRANSLATIONS.map((translation) => translation.id))
  for (const candidate of value.slice(0, MAX_CUSTOM_BIBLES)) {
    const entry = normalizeCustomBible(candidate, ids)
    if (!entry) continue
    ids.add(entry.translation.id)
    entries.push(entry)
  }
  return entries
}
