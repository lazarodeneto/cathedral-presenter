import { BIBLE_TRANSLATIONS, BIBLE_VERSES } from '../../data/bible'
import type { BibleBookTexts, CustomBibleTranslation } from '../../types'
import { CANONICAL_BIBLE_BOOKS } from '../../data/bibleBooks'
import { BIBLE_CATALOG_SOURCE, catalogBibleId, type CatalogBible } from '../../data/bibleCatalog'
import { sanitizeSingleLine, sanitizeText } from '../../security/text'
import { countBibleVerses } from './customBibles'

/**
 * Downloads a Bible from github.com/damarals/biblias. The repository keeps
 * each translation as one JSON file per book under data/canonical/<SIGLA>/.
 * raw.githubusercontent.com serves those with CORS (release downloads do
 * not), so the browser can read them directly. Nothing else is contacted.
 */
export const GITHUB_BIBLE_BASE = 'https://raw.githubusercontent.com/damarals/biblias/main/data/canonical'

/** USFM codes of the 66 books, in the same canonical order as CANONICAL_BIBLE_BOOKS. */
export const BOOK_CODES = [
  'GEN', 'EXO', 'LEV', 'NUM', 'DEU', 'JOS', 'JDG', 'RUT', '1SA', '2SA', '1KI', '2KI', '1CH', '2CH', 'EZR', 'NEH',
  'EST', 'JOB', 'PSA', 'PRO', 'ECC', 'SNG', 'ISA', 'JER', 'LAM', 'EZK', 'DAN', 'HOS', 'JOL', 'AMO', 'OBA', 'JON',
  'MIC', 'NAM', 'HAB', 'ZEP', 'HAG', 'ZEC', 'MAL', 'MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL',
  'EPH', 'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS', '1PE', '2PE', '1JN', '2JN', '3JN',
  'JUD', 'REV',
] as const

const CONCURRENCY = 6
const MAX_BOOK_BYTES = 2_000_000
const MAX_VERSE_LENGTH = 5_000

export type BibleDownloadError = 'offline' | 'network' | 'invalid' | 'cancelled'

export class BibleDownloadFailure extends Error {
  constructor(public readonly reason: BibleDownloadError) {
    super(reason)
  }
}

interface RepoMeta {
  name?: unknown
  year?: unknown
  publisher?: unknown
  license?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

async function getJson(url: string, signal?: AbortSignal): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(url, { signal, credentials: 'omit', referrerPolicy: 'no-referrer' })
  } catch {
    if (signal?.aborted) throw new BibleDownloadFailure('cancelled')
    throw new BibleDownloadFailure(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'network')
  }
  if (!response.ok) throw new BibleDownloadFailure('network')
  const text = await response.text()
  if (text.length > MAX_BOOK_BYTES) throw new BibleDownloadFailure('invalid')
  try {
    return JSON.parse(text)
  } catch {
    throw new BibleDownloadFailure('invalid')
  }
}

/**
 * One book file: `{ id, code, chapters: [{ number, verses: [{ number, text }] }] }`.
 * Chapter and verse numbers come from the file; anything malformed is skipped.
 */
export function readCanonicalBook(raw: unknown): Record<number, Record<number, string>> {
  const chapters: Record<number, Record<number, string>> = {}
  if (!isRecord(raw) || !Array.isArray(raw.chapters)) return chapters
  raw.chapters.forEach((entry, index) => {
    if (!isRecord(entry) || !Array.isArray(entry.verses)) return
    const chapter = Number.isInteger(entry.number) ? Number(entry.number) : index + 1
    if (chapter < 1 || chapter > 150) return
    const verses: Record<number, string> = {}
    for (const verse of entry.verses) {
      if (!isRecord(verse)) continue
      const number = Number(verse.number)
      if (!Number.isInteger(number) || number < 1 || number > 200) continue
      const text = sanitizeText(verse.text, MAX_VERSE_LENGTH).trim()
      if (text) verses[number] = text
    }
    if (Object.keys(verses).length > 0) chapters[chapter] = verses
  })
  return chapters
}

/** Builds the library entry: Bíblia (name), Sigla (abbreviation), Ano (year), Editora (publisher). */
export function catalogEntry(bible: CatalogBible, books: BibleBookTexts, meta: RepoMeta = {}): CustomBibleTranslation {
  const metaYear = Number(meta.year)
  const year = bible.year ?? (Number.isInteger(metaYear) ? metaYear : null)
  const publisher = bible.publisher ?? (typeof meta.publisher === 'string' ? sanitizeSingleLine(meta.publisher, 120) : null)
  const rights = bible.publicDomain
    ? `${bible.name}${year ? ` (${year})` : ''}. Domínio público.`
    : `${bible.name}${year ? ` (${year})` : ''}. © ${publisher ?? 'Editora'}. Uso local da igreja.`
  return {
    translation: {
      id: catalogBibleId(bible),
      providerId: 'local-bible',
      name: bible.name,
      abbreviation: bible.code,
      language: bible.language,
      licenseType: bible.publicDomain ? 'public-domain' : 'church-import',
      licenseText: rights,
      sourceUrl: BIBLE_CATALOG_SOURCE,
      copyrightNotice: rights,
      bundled: false,
      sample: false,
      verseCount: countBibleVerses(books),
      availability: 'bundled',
      ...(year ? { year } : {}),
      ...(publisher ? { publisher } : {}),
    },
    books,
  }
}

/** Public-domain Bibles that ship with the app: read from its own files, offline. */
export async function loadBundledCatalogBible(bible: CatalogBible): Promise<CustomBibleTranslation | null> {
  const translation = BIBLE_TRANSLATIONS.find((entry) => entry.id === catalogBibleId(bible))
  return translation ? { translation, books: BIBLE_VERSES[translation.id] } : null
}

/**
 * Downloads every book of a catalogue Bible, `CONCURRENCY` files at a time.
 * `onProgress(done, total)` reports books finished. Fails if a book is missing.
 */
export async function downloadCatalogBible(
  bible: CatalogBible,
  { onProgress, signal }: { onProgress?: (done: number, total: number) => void; signal?: AbortSignal } = {},
): Promise<CustomBibleTranslation> {
  if (!/^[A-Z0-9]{2,10}$/.test(bible.code)) throw new BibleDownloadFailure('invalid')
  const base = `${GITHUB_BIBLE_BASE}/${bible.code}`
  const meta = (await getJson(`${base}/meta.json`, signal).catch((error: unknown) => {
    if (error instanceof BibleDownloadFailure && error.reason !== 'invalid') throw error
    return {}
  })) as RepoMeta

  const books: BibleBookTexts = {}
  let done = 0
  let next = 0
  onProgress?.(0, BOOK_CODES.length)

  const worker = async () => {
    while (next < BOOK_CODES.length) {
      const index = next
      next += 1
      if (signal?.aborted) throw new BibleDownloadFailure('cancelled')
      const raw = await getJson(`${base}/${BOOK_CODES[index]}.json`, signal)
      // The file's own canonical number must match its position, so a renamed file cannot land in the wrong book.
      if (isRecord(raw) && raw.id !== undefined && Number(raw.id) !== index + 1) throw new BibleDownloadFailure('invalid')
      const chapters = readCanonicalBook(raw)
      if (Object.keys(chapters).length === 0) throw new BibleDownloadFailure('invalid')
      books[CANONICAL_BIBLE_BOOKS[index].id] = chapters
      done += 1
      onProgress?.(done, BOOK_CODES.length)
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  return catalogEntry(bible, books, meta)
}
