import { BIBLE_BOOKS } from '../data/bible'
import { sanitizeText } from '../security/text'
import type { BibleBookTexts } from '../types'

export const BIBLE_IMPORT_MAX_BYTES = 2_000_000
const MAX_VERSES = 40_000
const MAX_VERSE_LENGTH = 5_000
const BOOK_IDS = new Set<string>(BIBLE_BOOKS.map((book) => book.id))

export type BibleImportError =
  | 'invalid-json'
  | 'invalid-format'
  | 'too-large'
  | 'no-verses'

export type BibleImportResult =
  | { ok: true; books: BibleBookTexts }
  | { ok: false; reason: BibleImportError }

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Accepts either `{ "books": { ... } }` or a bare books map:
 * `{ "john": { "3": { "16": "For God so loved..." } } }`.
 */
export function parseBibleTextJson(raw: string): BibleImportResult {
  if (raw.length > BIBLE_IMPORT_MAX_BYTES) return { ok: false, reason: 'too-large' }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, reason: 'invalid-json' }
  }

  if (!isRecord(parsed)) return { ok: false, reason: 'invalid-format' }
  const source = isRecord(parsed.books) ? parsed.books : parsed
  const keys = Object.keys(source)
  if (keys.length === 0) return { ok: false, reason: 'no-verses' }
  if (!keys.some((key) => BOOK_IDS.has(key))) return { ok: false, reason: 'invalid-format' }

  const books: BibleBookTexts = {}
  let verseCount = 0
  for (const [bookId, rawChapters] of Object.entries(source)) {
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
        if (verseCount >= MAX_VERSES) break
        verses[verse] = text
        verseCount += 1
      }
      if (Object.keys(verses).length > 0) chapters[chapter] = verses
      if (verseCount >= MAX_VERSES) break
    }
    if (Object.keys(chapters).length > 0) books[bookId] = chapters
    if (verseCount >= MAX_VERSES) break
  }

  if (verseCount === 0) return { ok: false, reason: 'no-verses' }
  return { ok: true, books }
}
