import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { INCLUDED_BIBLES } from '../data/includedBibles'
import { BIBLE_CATALOG } from '../data/bibleCatalog'
import { loadBundledCatalogBible } from '../providers/bible/githubBibles'
import { parseBibleTextJson } from '../utils/bibleImport'

const read = (file: string) => readFileSync(resolve(__dirname, '../../public', file), 'utf8')

describe('included public-domain Bibles', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('ships only public-domain translations', () => {
    expect(INCLUDED_BIBLES.map((bible) => bible.abbreviation)).toEqual(['TB', 'BLIVRE', 'ALM1911'])
    expect(INCLUDED_BIBLES.every((bible) => bible.licenseType === 'public-domain')).toBe(true)
  })

  it.each(INCLUDED_BIBLES)('$abbreviation parses as a complete 66-book Bible', (bible) => {
    const result = parseBibleTextJson(read(bible.file))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(Object.keys(result.books)).toHaveLength(66)
    expect(result.books.genesis[1][1]).toMatch(/princ[ií]pio/i)
    expect(result.books.revelation[22]).toBeDefined()
  })

  it('builds a library entry from the app file', async () => {
    const bible = BIBLE_CATALOG.find((entry) => entry.code === 'TB')!
    vi.stubGlobal('fetch', vi.fn(async () => new Response(read(bible.bundledFile!))))
    const entry = await loadBundledCatalogBible(bible)
    expect(entry?.translation).toMatchObject({ id: 'included-pt-br-tb', abbreviation: 'TB', licenseType: 'public-domain', year: 2010 })
    expect(entry?.translation.verseCount).toBeGreaterThan(31_000)
  })
})
