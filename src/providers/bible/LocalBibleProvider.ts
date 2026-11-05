import type {
  BibleBookCatalogEntry,
  BiblePassage,
  BibleSearchResult,
  BibleTranslation,
  BibleVerse,
  Locale,
} from '../../types'
import { BIBLE_BOOKS, bookName } from '../../data/bible'
import { sanitizeSingleLine } from '../../security/text'
import {
  allBibleTranslations,
  bibleVersesFor,
  findBibleTranslation,
} from './customBibles'
import {
  BibleProviderError,
  type BibleProvider,
  type ParsedReference,
} from './BibleProvider'

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const BOOK_ALIASES = new Map<string, string>()
// Abbreviations first, then names, so a full name wins over a colliding short form.
for (const book of BIBLE_BOOKS) {
  for (const abbreviation of book.abbreviations) {
    BOOK_ALIASES.set(normalize(abbreviation), book.id)
  }
}
for (const book of BIBLE_BOOKS) {
  BOOK_ALIASES.set(normalize(book.id), book.id)
  for (const name of Object.values(book.names)) {
    BOOK_ALIASES.set(normalize(name), book.id)
  }
}

function translationOf(translationId: string): BibleTranslation {
  const translation = findBibleTranslation(translationId)
  if (!translation) throw new BibleProviderError('not-found', 'Translation not found')
  return translation
}

function versesOf(translationId: string, bookId: string, chapter: number): Record<number, string> {
  return bibleVersesFor(translationId)[bookId]?.[chapter] ?? {}
}

function buildPassage(
  translation: BibleTranslation,
  bookId: string,
  chapter: number,
  startVerse: number,
  endVerse: number,
): BiblePassage {
  const source = versesOf(translation.id, bookId, chapter)
  const verses: BibleVerse[] = []
  for (let verse = startVerse; verse <= endVerse; verse += 1) {
    const text = source[verse]
    if (!text) continue
    verses.push({
      translationId: translation.id,
      bookId,
      bookName: bookName(bookId, translation.language),
      chapter,
      verse,
      text,
    })
  }
  if (verses.length === 0) {
    throw new BibleProviderError(
      'not-found',
      'That passage is not in the bundled sample. Try Psalm 23, John 3, Romans 8, 1 Corinthians 13, Matthew 5, Isaiah 40, or Philippians 4.',
    )
  }
  const first = verses[0]
  const last = verses[verses.length - 1]
  const reference =
    first.verse === last.verse
      ? `${first.bookName} ${chapter}:${first.verse}`
      : `${first.bookName} ${chapter}:${first.verse}–${last.verse}`
  return {
    id: `${translation.id}:${bookId}:${chapter}:${first.verse}-${last.verse}`,
    translationId: translation.id,
    translationName: translation.name,
    translationAbbreviation: translation.abbreviation,
    language: translation.language,
    bookId,
    bookName: bookName(bookId, translation.language),
    startChapter: chapter,
    startVerse: first.verse,
    endChapter: chapter,
    endVerse: last.verse,
    reference,
    verses,
    licenseType: translation.licenseType,
    copyrightNotice: translation.copyrightNotice,
    sourceUrl: translation.sourceUrl,
  }
}

export function parseLocalReference(raw: string): ParsedReference | null {
  const reference = normalize(raw)
  if (!reference || reference.length > 120) return null
  const match = reference.match(/^(.+?)\s+(\d{1,3})(?::\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?)?$/)
  if (!match) return null
  const bookPart = match[1].trim().replace(/\.$/, '')
  const bookId = BOOK_ALIASES.get(bookPart)
  if (!bookId) return null
  const chapter = Number(match[2])
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > 150) return null
  const start = match[3] ? Number(match[3]) : null
  const end = match[4] ? Number(match[4]) : start
  if (start !== null && (!Number.isInteger(start) || start < 1)) return null
  if (end !== null && (!Number.isInteger(end) || end < 1 || (start !== null && end < start))) {
    return null
  }
  return { bookId, chapter, startVerse: start, endVerse: end }
}

function fullChapterBounds(
  translationId: string,
  bookId: string,
  chapter: number,
): { start: number; end: number } | null {
  const verses = versesOf(translationId, bookId, chapter)
  const numbers = Object.keys(verses).map(Number).sort((a, b) => a - b)
  if (numbers.length === 0) return null
  return { start: numbers[0], end: numbers[numbers.length - 1] }
}

export class LocalBibleProvider implements BibleProvider {
  readonly id = 'local-bible'
  readonly label = 'Local Scripture library · offline'
  readonly security = {
    auth: 'none' as const,
    oauthScopes: [] as string[],
    tokenStorage: 'none' as const,
    cachePolicy: 'bundled' as const,
  }

  listTranslations(): BibleTranslation[] {
    return allBibleTranslations()
  }

  supportsTranslation(translationId: string): boolean {
    return allBibleTranslations().some((translation) => translation.id === translationId)
  }

  async getBookCatalog(translationId: string, locale: Locale): Promise<BibleBookCatalogEntry[]> {
    const chaptersByBook = bibleVersesFor(translationId)
    return BIBLE_BOOKS.flatMap((book) => {
      const chapters = chaptersByBook[book.id]
      if (!chapters) return []
      const entries = Object.keys(chapters)
        .map(Number)
        .sort((a, b) => a - b)
        .map((chapter) => {
          const verseNumbers = Object.keys(chapters[chapter]).map(Number).sort((a, b) => a - b)
          return {
            number: chapter,
            firstVerse: verseNumbers[0] ?? 1,
            lastVerse: verseNumbers[verseNumbers.length - 1] ?? 1,
          }
        })
      return [{ id: book.id, name: bookName(book.id, locale), chapters: entries }]
    })
  }

  async getChapter(translationId: string, bookId: string, chapter: number): Promise<BibleVerse[]> {
    const translation = translationOf(translationId)
    const bounds = fullChapterBounds(translationId, bookId, chapter)
    if (!bounds) throw new BibleProviderError('not-found', 'Chapter not found in local sample')
    return buildPassage(translation, bookId, chapter, bounds.start, bounds.end).verses
  }

  parseReference(reference: string): ParsedReference | null {
    return parseLocalReference(reference)
  }

  async search(query: string, translationId: string): Promise<BibleSearchResult> {
    const translation = translationOf(translationId)
    const cleaned = sanitizeSingleLine(query, 120)
    if (!cleaned) return { passages: [], mode: 'reference', messageKey: 'bible.enterQuery' }

    const parsed = parseLocalReference(cleaned)
    if (parsed) {
      const bounds =
        parsed.startVerse !== null
          ? { start: parsed.startVerse, end: parsed.endVerse ?? parsed.startVerse }
          : fullChapterBounds(translationId, parsed.bookId, parsed.chapter)
      if (!bounds) {
        return { passages: [], mode: 'reference', messageKey: 'bible.chapterNotBundled' }
      }
      const passage = buildPassage(
        translation,
        parsed.bookId,
        parsed.chapter,
        bounds.start,
        bounds.end,
      )
      return { passages: [passage], mode: 'reference' }
    }

    const needle = normalize(cleaned)
    if (needle.length < 2) {
      return { passages: [], mode: 'keyword', messageKey: 'bible.keywordMin' }
    }

    const passages: BiblePassage[] = []
    for (const book of BIBLE_BOOKS) {
      const chapters = bibleVersesFor(translationId)[book.id]
      if (!chapters) continue
      for (const chapterKey of Object.keys(chapters)) {
        const chapter = Number(chapterKey)
        const verses = chapters[chapter]
        for (const verseKey of Object.keys(verses)) {
          const verse = Number(verseKey)
          if (normalize(verses[verse]).includes(needle)) {
            passages.push(buildPassage(translation, book.id, chapter, verse, verse))
            if (passages.length >= 40) break
          }
        }
        if (passages.length >= 40) break
      }
      if (passages.length >= 40) break
    }

    return {
      passages,
      mode: 'keyword',
      messageKey: passages.length === 0 ? 'bible.noKeywordMatch' : undefined,
    }
  }

  async getPassage(reference: string, translationId: string): Promise<BiblePassage> {
    const translation = translationOf(translationId)
    const parsed = parseLocalReference(reference)
    if (!parsed) {
      throw new BibleProviderError('invalid-reference', 'That reference could not be understood.')
    }
    const bounds =
      parsed.startVerse !== null
        ? { start: parsed.startVerse, end: parsed.endVerse ?? parsed.startVerse }
        : fullChapterBounds(translationId, parsed.bookId, parsed.chapter)
    if (!bounds) throw new BibleProviderError('empty', 'Passage not found in local sample.')
    return buildPassage(translation, parsed.bookId, parsed.chapter, bounds.start, bounds.end)
  }

  isOfflineAvailable(translationId: string): boolean {
    return allBibleTranslations().some(
      (translation) => translation.id === translationId && translation.availability === 'bundled',
    )
  }
}

export function getLocalPassageSync(reference: string, translationId: string): BiblePassage {
  const translation = translationOf(translationId)
  const parsed = parseLocalReference(reference)
  if (!parsed) {
    throw new BibleProviderError('invalid-reference', 'That reference could not be understood.')
  }
  const bounds =
    parsed.startVerse !== null
      ? { start: parsed.startVerse, end: parsed.endVerse ?? parsed.startVerse }
      : fullChapterBounds(translationId, parsed.bookId, parsed.chapter)
  if (!bounds) throw new BibleProviderError('empty', 'Passage not found in local sample.')
  return buildPassage(translation, parsed.bookId, parsed.chapter, bounds.start, bounds.end)
}

/** One verse as a passage (Bible Mode builds a slide from it). Null when the verse is not in the translation. */
export function getVersePassage(translationId: string, bookId: string, chapter: number, verse: number): BiblePassage | null {
  const translation = findBibleTranslation(translationId)
  if (!translation || !versesOf(translationId, bookId, chapter)[verse]) return null
  return buildPassage(translation, bookId, chapter, verse, verse)
}

export const localBibleProvider = new LocalBibleProvider()

export function translationLanguage(translationId: string): Locale {
  return findBibleTranslation(translationId)?.language ?? 'en'
}
