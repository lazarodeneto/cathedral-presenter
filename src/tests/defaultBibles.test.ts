import { afterEach, describe, expect, it, vi } from 'vitest'
import { readdirSync } from 'node:fs'
import { BIBLE_TRANSLATIONS, BIBLE_VERSES } from '../data/bible'
import { localBibleProvider } from '../providers/bible/LocalBibleProvider'
import { useAppStore, DEFAULT_SETTINGS } from '../store/useAppStore'
import { mergeWorkspace } from '../store/workspacePersistence'
import type { CustomBibleTranslation } from '../types'

afterEach(() => vi.unstubAllGlobals())
describe('complete Portuguese default Bibles', () => {
  it('ships only the two full Portuguese texts with no sample translations', () => {
    expect(readdirSync('src/data/bibles').sort()).toEqual(['BLIVRE.json', 'TB.json'])
    expect(BIBLE_TRANSLATIONS.map((entry) => entry.id)).toEqual(['blivre', 'tb'])
    expect(DEFAULT_SETTINGS.defaultTranslationId).toBe('blivre')
    expect(DEFAULT_SETTINGS.secondaryTranslationId).toBe('tb')
    for (const translation of BIBLE_TRANSLATIONS) {
      expect(translation).toMatchObject({ language: 'pt-BR', bundled: true, sample: false })
      const books = BIBLE_VERSES[translation.id]
      expect(Object.keys(books)).toHaveLength(66)
      expect(
        Object.values(books).reduce((count, chapters) => count + Object.keys(chapters).length, 0),
      ).toBe(1189)
      expect(translation.verseCount).toBeGreaterThanOrEqual(31100)
      expect(books.genesis[50][26]).toBeTruthy()
      expect(books.revelation[22][21]).toBeTruthy()
    }
  })
  it('reads complete chapters offline without fetching or adding a translation', async () => {
    const fetcher = vi.fn(() => {
      throw new Error('Network unavailable')
    })
    vi.stubGlobal('fetch', fetcher)
    for (const id of ['blivre', 'tb']) {
      expect(await localBibleProvider.getChapter(id, 'genesis', 50)).toHaveLength(26)
      expect(await localBibleProvider.getChapter(id, 'revelation', 22)).toHaveLength(21)
      expect(await localBibleProvider.getBookCatalog(id, 'pt-BR')).toHaveLength(66)
    }
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('upgrades old defaults and removes bundled duplicates while preserving church imports', () => {
    const current = useAppStore.getState()
    const imported: CustomBibleTranslation = {
      translation: {
        ...BIBLE_TRANSLATIONS[0],
        id: 'custom-church',
        name: 'Church import',
        bundled: false,
      },
      books: { john: { 3: { 16: 'Texto importado pela igreja.' } } },
    }
    const duplicate = {
      ...imported,
      translation: { ...imported.translation, id: 'included-pt-br-blivre' },
    }
    const result = mergeWorkspace(
      {
        services: current.services,
        settings: {
          ...DEFAULT_SETTINGS,
          defaultTranslationId: 'web',
          secondaryTranslationId: 'blivre',
        },
        customBibles: [imported, duplicate],
        hiddenBibleIds: ['blivre'],
        deletedBibleIds: ['web'],
      },
      current,
    )
    expect(result.settings).toMatchObject({
      defaultTranslationId: 'blivre',
      secondaryTranslationId: 'tb',
    })
    expect(result.customBibles.map((entry) => entry.translation.id)).toEqual(['custom-church'])
    expect(result.hiddenBibleIds).toEqual([])
    expect(result.deletedBibleIds).toEqual([])
    expect(result.bibleDefaultsVersion).toBe(2)
    const next = mergeWorkspace({ ...result, hiddenBibleIds: ['tb'] }, current)
    expect(next.hiddenBibleIds).toEqual(['tb'])
  })
})
