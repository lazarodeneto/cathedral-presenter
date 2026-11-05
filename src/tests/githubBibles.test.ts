import { afterEach, describe, expect, it, vi } from 'vitest'
import { CANONICAL_BIBLE_BOOKS } from '../data/bibleBooks'
import { BIBLE_CATALOG, catalogBibleId } from '../data/bibleCatalog'
import { INCLUDED_BIBLES } from '../data/includedBibles'
import { sanitizeCustomBibleTranslations } from '../providers/bible/customBibles'
import {
  BOOK_CODES,
  BibleDownloadFailure,
  GITHUB_BIBLE_BASE,
  downloadCatalogBible,
  readCanonicalBook,
} from '../providers/bible/githubBibles'

const book = (id: number) => ({
  id,
  code: BOOK_CODES[id - 1],
  chapters: [{ number: 1, verses: [{ number: 1, text: ` Verse of book ${id} ` }, { number: 2, text: '' }] }],
})

describe('Bible catalogue (damarals/biblias)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('lists every translation once, with Sigla, name, Ano and Editora fields', () => {
    expect(BIBLE_CATALOG).toHaveLength(18)
    expect(new Set(BIBLE_CATALOG.map((bible) => bible.code)).size).toBe(18)
    expect(new Set(BIBLE_CATALOG.map(catalogBibleId)).size).toBe(18)
    for (const bible of BIBLE_CATALOG) {
      expect(bible.code).toMatch(/^[A-Z0-9]{2,10}$/)
      expect(bible.name.length).toBeGreaterThan(2)
      expect(bible.year === null || Number.isInteger(bible.year)).toBe(true)
    }
  })

  it('keeps the ids of the public-domain Bibles that ship with the app', () => {
    const bundled = BIBLE_CATALOG.filter((bible) => bible.bundledFile).map(catalogBibleId).sort()
    expect(bundled).toEqual(INCLUDED_BIBLES.map((bible) => bible.id).sort())
  })

  it('has one USFM code per canonical book', () => {
    expect(BOOK_CODES).toHaveLength(CANONICAL_BIBLE_BOOKS.length)
  })

  it('reads a canonical book file and skips empty or malformed verses', () => {
    expect(readCanonicalBook(book(1))).toEqual({ 1: { 1: 'Verse of book 1' } })
    expect(readCanonicalBook({ chapters: 'nope' })).toEqual({})
    expect(readCanonicalBook(null)).toEqual({})
  })

  it('downloads all 66 books and saves Sigla, Ano and Editora', async () => {
    const urls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        urls.push(url)
        if (url.endsWith('/meta.json')) return new Response(JSON.stringify({ code: 'ARA', year: 1993 }))
        const code = url.split('/').pop()!.replace('.json', '')
        return new Response(JSON.stringify(book(BOOK_CODES.indexOf(code as never) + 1)))
      }),
    )
    const progress: number[] = []
    const ara = BIBLE_CATALOG.find((bible) => bible.code === 'ARA')!
    const entry = await downloadCatalogBible(ara, { onProgress: (done) => progress.push(done) })

    expect(urls.every((url) => url.startsWith(`${GITHUB_BIBLE_BASE}/ARA/`))).toBe(true)
    expect(Object.keys(entry.books)).toHaveLength(66)
    expect(entry.books.revelation[1][1]).toBe('Verse of book 66')
    expect(entry.translation).toMatchObject({ abbreviation: 'ARA', year: 1993, publisher: ara.publisher, verseCount: 66 })
    expect(progress.at(-1)).toBe(66)

    // Year and publisher survive the store's own validation.
    const [saved] = sanitizeCustomBibleTranslations([entry])
    expect(saved.translation).toMatchObject({ year: 1993, publisher: ara.publisher })
  })

  it('refuses a book file that claims to be a different book', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(book(5)))))
    await expect(downloadCatalogBible(BIBLE_CATALOG[0])).rejects.toBeInstanceOf(BibleDownloadFailure)
  })
})
