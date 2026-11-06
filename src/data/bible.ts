import type { BibleBookTexts, BibleTranslation, Locale } from '../types'
import { CANONICAL_BIBLE_BOOKS } from './bibleBooks'
import blivre from './bibles/BLIVRE.json'
import brasileira from './bibles/TB.json'

export const BIBLE_BOOKS = CANONICAL_BIBLE_BOOKS
export const BOOK_IDS = BIBLE_BOOKS.map((book) => book.id)
export const DEFAULT_BIBLE_ID = 'blivre'
export const SECONDARY_BIBLE_ID = 'tb'
export const LEGACY_INCLUDED_BIBLE_IDS = new Set([
  'included-pt-br-blivre',
  'included-pt-br-tb',
  'included-pt-alm1911',
])

export function bookName(bookId: string, language: Locale): string {
  const book = BIBLE_BOOKS.find((entry) => entry.id === bookId)
  return book?.names[language] ?? book?.names.en ?? bookId
}

// The two complete texts ship inside the application, never in localStorage.
// Positional book order is the canonical 66-book order used by these source files.
function completeText(raw: { chapters: string[][] }[]): BibleBookTexts {
  if (raw.length !== BIBLE_BOOKS.length) throw new Error('Incomplete bundled Bible')
  return Object.fromEntries(
    raw.map((book, index) => [
      BIBLE_BOOKS[index].id,
      Object.fromEntries(
        book.chapters.map((verses, chapter) => [
          chapter + 1,
          Object.fromEntries(verses.map((text, verse) => [verse + 1, text.trim()])),
        ]),
      ),
    ]),
  )
}

export const BIBLE_VERSES: Record<string, BibleBookTexts> = {
  blivre: completeText(blivre),
  tb: completeText(brasileira),
}

function verseCount(id: string): number {
  return Object.values(BIBLE_VERSES[id]).reduce(
    (total, chapters) =>
      total +
      Object.values(chapters).reduce((count, verses) => count + Object.keys(verses).length, 0),
    0,
  )
}

export const BIBLE_TRANSLATIONS: BibleTranslation[] = [
  {
    id: 'blivre',
    providerId: 'local-bible',
    name: 'Bíblia Livre',
    abbreviation: 'BLIVRE',
    language: 'pt-BR',
    licenseType: 'cc-by',
    licenseText: 'CC BY 4.0',
    sourceUrl: 'https://github.com/damarals/biblias',
    copyrightNotice:
      'Bíblia Livre, Copyright © 2018 Diego Santos, Mario Sérgio e Marco Teles. Creative Commons Atribuição 4.0 Brasil. Texto completo.',
    year: 2018,
    bundled: true,
    sample: false,
    availability: 'bundled',
    verseCount: verseCount('blivre'),
  },
  {
    id: 'tb',
    providerId: 'local-bible',
    name: 'Tradução Brasileira',
    abbreviation: 'TB',
    language: 'pt-BR',
    licenseType: 'public-domain',
    licenseText: 'Domínio público',
    sourceUrl: 'https://github.com/damarals/biblias',
    copyrightNotice:
      'Tradução Brasileira. Texto completo de domínio público, fonte: damarals/biblias.',
    year: 2010,
    publisher: 'SBB',
    bundled: true,
    sample: false,
    availability: 'bundled',
    verseCount: verseCount('tb'),
  },
]
