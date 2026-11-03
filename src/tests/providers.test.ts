import { describe, expect, it } from 'vitest'
import { BIBLE_TRANSLATIONS } from '../data/bible'
import {
  listBibleTranslations,
  resolveBibleProvider,
} from '../providers/bible/BibleProviderRegistry'
import { localBibleProvider } from '../providers/bible/LocalBibleProvider'
import { localSongProvider } from '../providers/songs/LocalSongProvider'

describe('bundled Bible provider', () => {
  it('exposes unique translations and the licensed BLIVRE replacement', () => {
    const translations = listBibleTranslations()
    const ids = translations.map((translation) => translation.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).not.toContain('arc')

    const blivre = translations.find((translation) => translation.id === 'blivre')
    expect(blivre).toMatchObject({
      language: 'pt-BR',
      licenseType: 'cc-by',
      availability: 'bundled',
    })
    expect(blivre?.licenseText).toContain('CC BY 4.0')
    expect(blivre?.copyrightNotice).toContain('Diego Santos')
    expect(blivre?.copyrightNotice).toContain('Creative Commons Atribuição 4.0 Brasil')
    expect(resolveBibleProvider('blivre')).toBe(localBibleProvider)
  })

  it('resolves localized references and returns bundled chapters', async () => {
    const parsed = localBibleProvider.parseReference('João 3:16')
    expect(parsed).toEqual({ bookId: 'john', chapter: 3, startVerse: 16, endVerse: 16 })

    const catalog = await localBibleProvider.getBookCatalog('blivre', 'pt-BR')
    const john = catalog.find((book) => book.id === 'john')
    expect(john?.name).toBe('João')
    expect(john?.chapters).toContainEqual({ number: 3, firstVerse: 16, lastVerse: 16 })

    const result = await localBibleProvider.search('John 3:16', 'blivre')
    expect(result.mode).toBe('reference')
    expect(result.passages[0]?.translationAbbreviation).toBe('BLIVRE')
    expect(result.passages[0]?.verses[0]?.text).toContain('Deus amou')
  })

  it('returns a localized message for missing chapters and keywords', async () => {
    const chapter = await localBibleProvider.search('John 5', 'blivre')
    expect(chapter.messageKey).toBe('bible.chapterNotBundled')

    const keyword = await localBibleProvider.search('zzzzzz', 'blivre')
    expect(keyword).toEqual({ passages: [], mode: 'keyword', messageKey: 'bible.noKeywordMatch' })
  })

  it('rejects unknown translations and caps keyword results', async () => {
    await expect(localBibleProvider.search('John 3:16', 'arc')).rejects.toMatchObject({
      code: 'not-found',
    })
    const keyword = await localBibleProvider.search('o', 'blivre')
    expect(keyword.messageKey).toBe('bible.keywordMin')
  })
})

describe('bundled song provider', () => {
  it('reports language and tag facets from bundled songs', () => {
    const facets = localSongProvider.listFacets()
    expect(facets.languages).toContain('en')
    expect(facets.tags).toContain('worship')
  })

  it('applies language and tag filters and reports empty results', async () => {
    const filtered = await localSongProvider.search({
      query: '',
      language: 'en',
      tags: ['worship'],
    })
    expect(filtered.songs.length).toBeGreaterThan(0)
    expect(filtered.songs.every((song) => song.language === 'en')).toBe(true)
    expect(filtered.songs.every((song) => song.tags.includes('worship'))).toBe(true)

    const none = await localSongProvider.search({
      query: 'no-such-hymn',
      language: 'all',
      tags: [],
    })
    expect(none).toEqual({ songs: [], messageKey: 'songs.noResults' })
  })

  it('never returns unknown songs', async () => {
    await expect(localSongProvider.getSong('missing')).resolves.toBeNull()
  })
})

describe('bundled provider data', () => {
  it('keeps translation metadata internally consistent', () => {
    const providerIds = new Set(listBibleTranslations().map((translation) => translation.providerId))
    expect(providerIds).toEqual(new Set(['local-bible']))
    for (const translation of BIBLE_TRANSLATIONS) {
      expect(translation.bundled).toBe(true)
      expect(translation.availability).toBe('bundled')
      expect(translation.sourceUrl).toMatch(/^https:\/\//)
    }
  })
})
