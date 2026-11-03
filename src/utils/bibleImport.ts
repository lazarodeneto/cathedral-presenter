import { BIBLE_BOOKS } from '../data/bible'
import { resolveBookId } from '../data/bibleBooks'
import { sanitizeText } from '../security/text'
import type { BibleBookTexts } from '../types'

/** A complete Bible in JSON is typically 4–6 MB; leave room for verbose formats. */
export const BIBLE_IMPORT_MAX_BYTES = 16_000_000
const MAX_VERSES = 40_000
const MAX_VERSE_LENGTH = 5_000

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

function firstDefined(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) if (record[key] !== undefined) return record[key]
  return undefined
}

const BOOK_FIELDS = ['book', 'book_id', 'bookId', 'book_name', 'bookName', 'abbrev', 'abbreviation', 'id', 'name', 'b']
const CHAPTER_FIELDS = ['chapter', 'chapter_number', 'chapterNumber', 'c']
const VERSE_FIELDS = ['verse', 'verse_number', 'verseNumber', 'v']
const TEXT_FIELDS = ['text', 'content', 't']

/** Collects verses with limits and sanitising; the shape readers below only find them. */
class Collector {
  books: BibleBookTexts = {}
  count = 0

  add(bookId: string | null, chapter: unknown, verse: unknown, rawText: unknown): void {
    if (!bookId || this.count >= MAX_VERSES) return
    const chapterNumber = Number(chapter)
    const verseNumber = Number(verse)
    if (!Number.isInteger(chapterNumber) || chapterNumber < 1 || chapterNumber > 150) return
    if (!Number.isInteger(verseNumber) || verseNumber < 1 || verseNumber > 200) return
    const text = sanitizeText(rawText, MAX_VERSE_LENGTH)
    if (!text) return
    const chapters = (this.books[bookId] ??= {})
    const verses = (chapters[chapterNumber] ??= {})
    if (verses[verseNumber] === undefined) this.count += 1
    verses[verseNumber] = text
  }
}

/** Verses as `{ "16": "text" }` or `["text of 1", "text of 2"]` (1-based by position). */
function readVerses(out: Collector, bookId: string, chapter: unknown, rawVerses: unknown): void {
  if (Array.isArray(rawVerses)) {
    rawVerses.forEach((entry, index) => {
      if (isRecord(entry)) out.add(bookId, chapter, firstDefined(entry, VERSE_FIELDS) ?? index + 1, firstDefined(entry, TEXT_FIELDS))
      else out.add(bookId, chapter, index + 1, entry)
    })
  } else if (isRecord(rawVerses)) {
    for (const [verse, text] of Object.entries(rawVerses)) out.add(bookId, chapter, verse, text)
  }
}

/** Chapters as `{ "3": verses }`, `[verses, verses]`, or `[{ chapter, verses }]`. */
function readChapters(out: Collector, bookId: string, rawChapters: unknown): void {
  if (Array.isArray(rawChapters)) {
    rawChapters.forEach((entry, index) => {
      if (isRecord(entry) && (entry.verses !== undefined || entry.chapter !== undefined)) {
        readVerses(out, bookId, firstDefined(entry, CHAPTER_FIELDS) ?? index + 1, entry.verses)
      } else {
        readVerses(out, bookId, index + 1, entry)
      }
    })
  } else if (isRecord(rawChapters)) {
    for (const [chapter, verses] of Object.entries(rawChapters)) readVerses(out, bookId, chapter, verses)
  }
}

/** One row per verse: `{ book, chapter, verse, text }` with common field spellings. */
function isVerseRow(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    firstDefined(value, CHAPTER_FIELDS) !== undefined &&
    firstDefined(value, VERSE_FIELDS) !== undefined &&
    firstDefined(value, TEXT_FIELDS) !== undefined
  )
}

function readVerseRows(out: Collector, rows: unknown[]): void {
  for (const row of rows) {
    if (Array.isArray(row)) {
      // [book, chapter, verse, text], or [id, book, chapter, verse, text] as in some SQL exports.
      const cells = row.length >= 5 ? row.slice(-4) : row
      out.add(resolveBookId(cells[0]), cells[1], cells[2], cells[3])
    } else if (isRecord(row)) {
      out.add(resolveBookId(firstDefined(row, BOOK_FIELDS)), firstDefined(row, CHAPTER_FIELDS), firstDefined(row, VERSE_FIELDS), firstDefined(row, TEXT_FIELDS))
    }
  }
}

/** Books as an array, `[{ abbrev, chapters }]`; a full 66-book list is matched by position. */
function readBookList(out: Collector, list: unknown[]): void {
  const byPosition = list.length === BIBLE_BOOKS.length
  list.forEach((entry, index) => {
    if (!isRecord(entry)) return
    const named = resolveBookId(firstDefined(entry, BOOK_FIELDS))
    const bookId = byPosition ? BIBLE_BOOKS[index].id : named
    if (bookId) readChapters(out, bookId, entry.chapters)
  })
}

/**
 * Reads the Bible JSON layouts churches most often find online:
 * - a books map `{ "john": { "3": { "16": "..." } } }`, optionally under `books`, keyed by id,
 *   name (any interface language), abbreviation, or canonical number; chapters and verses may
 *   be maps or arrays;
 * - a list of books `[{ "abbrev": "gn", "chapters": [["verse 1", ...]] }]`;
 * - a list of verse rows `[{ "book": "Genesis", "chapter": 1, "verse": 1, "text": "..." }]`,
 *   optionally under `verses`, or a SQL-style `resultset.row[].field` export.
 */
export function parseBibleTextJson(raw: string): BibleImportResult {
  if (raw.length > BIBLE_IMPORT_MAX_BYTES) return { ok: false, reason: 'too-large' }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw.replace(/^\uFEFF/, ''))
  } catch {
    return { ok: false, reason: 'invalid-json' }
  }

  const out = new Collector()
  let recognised = false

  const resultRows = isRecord(parsed) && isRecord(parsed.resultset) ? parsed.resultset.row : undefined
  const list = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.books)
      ? parsed.books
      : isRecord(parsed) && Array.isArray(parsed.verses)
        ? parsed.verses
        : Array.isArray(resultRows)
          ? resultRows.map((row) => (isRecord(row) ? row.field : row))
          : null

  if (list) {
    if (list.some((entry) => Array.isArray(entry) || isVerseRow(entry))) {
      recognised = true
      readVerseRows(out, list)
    } else if (list.some((entry) => isRecord(entry) && entry.chapters !== undefined)) {
      recognised = true
      readBookList(out, list)
    }
  } else if (isRecord(parsed)) {
    const source = isRecord(parsed.books) ? parsed.books : parsed
    for (const [key, chapters] of Object.entries(source)) {
      const bookId = resolveBookId(key)
      if (!bookId) continue
      recognised = true
      readChapters(out, bookId, chapters)
    }
  }

  if (!recognised) return { ok: false, reason: 'invalid-format' }
  if (out.count === 0) return { ok: false, reason: 'no-verses' }
  return { ok: true, books: out.books }
}
