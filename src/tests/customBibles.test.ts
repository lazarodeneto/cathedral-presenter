import { beforeEach, describe, expect, it } from 'vitest'
import type { CustomBibleTranslation } from '../types'
import { useAppStore, DEFAULT_SETTINGS } from '../store/useAppStore'
import {
  allBibleTranslations,
  bibleVersesFor,
  countBibleVerses,
  sanitizeCustomBibleTranslations,
} from '../providers/bible/customBibles'
import { listBibleTranslations, resolveBibleProvider } from '../providers/bible/BibleProviderRegistry'
import { parseBibleTextJson } from '../utils/bibleImport'
import { buildBackup, parseBackup } from '../security/backup'
import { mergeWorkspace, partializeWorkspace } from '../store/workspacePersistence'

function sampleEntry(overrides: Partial<CustomBibleTranslation['translation']> = {}): CustomBibleTranslation {
  return {
    translation: {
      id: 'custom-pt-br-tst',
      providerId: 'local-bible',
      name: 'Test Bible',
      abbreviation: 'TST',
      language: 'pt-BR',
      licenseType: 'church-import',
      licenseText: 'Church import',
      copyrightNotice: 'Used with permission.',
      bundled: false,
      sample: false,
      verseCount: 2,
      availability: 'bundled',
      ...overrides,
    },
    books: {
      john: {
        3: {
          16: 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito.',
          17: 'Porque Deus enviou o seu Filho ao mundo, não para que condenasse o mundo.',
        },
      },
    },
  }
}

describe('administrator Bible library', () => {
  beforeEach(() => {
    useAppStore.setState({
      customBibles: [],
      recentPassages: [],
      settings: { ...DEFAULT_SETTINGS, locale: 'en' },
    })
  })

  it('adds a Bible, identifies its language, and serves its verses', async () => {
    const result = useAppStore.getState().addCustomBible(sampleEntry())
    expect(result).toEqual({ ok: true, id: 'custom-pt-br-tst' })

    const translation = allBibleTranslations().find((entry) => entry.id === 'custom-pt-br-tst')
    expect(translation).toMatchObject({ name: 'Test Bible', language: 'pt-BR', bundled: false })
    expect(bibleVersesFor('custom-pt-br-tst').john?.[3]?.[16]).toContain('Deus amou')
    expect(listBibleTranslations().some((entry) => entry.id === 'custom-pt-br-tst')).toBe(true)

    const provider = resolveBibleProvider('custom-pt-br-tst')
    const passage = await provider.getPassage('John 3:16', 'custom-pt-br-tst')
    expect(passage.language).toBe('pt-BR')
    expect(passage.verses[0]?.text).toContain('Deus amou')
  })

  it('rejects duplicate ids, bundled ids, and unknown languages', () => {
    expect(useAppStore.getState().addCustomBible(sampleEntry()).ok).toBe(true)
    expect(useAppStore.getState().addCustomBible(sampleEntry())).toEqual({
      ok: false,
      reason: 'duplicate',
    })
    expect(
      useAppStore.getState().addCustomBible(sampleEntry({ id: 'blivre', name: 'Web copy' })),
    ).toEqual({ ok: false, reason: 'invalid' })
    expect(
      useAppStore.getState().addCustomBible(
        sampleEntry({ id: 'custom-bad', language: 'xx' as CustomBibleTranslation['translation']['language'] }),
      ),
    ).toEqual({ ok: false, reason: 'invalid' })
  })

  it('removes a custom Bible and resets a default that pointed at it', () => {
    useAppStore.getState().addCustomBible(sampleEntry())
    useAppStore.getState().updateSettings({ defaultTranslationId: 'custom-pt-br-tst' })
    useAppStore.getState().recordRecentPassage({
      reference: 'John 3:16',
      translationId: 'custom-pt-br-tst',
    })

    expect(useAppStore.getState().removeCustomBible('custom-pt-br-tst')).toEqual({
      ok: true,
      resetTranslation: true,
    })

    const state = useAppStore.getState()
    expect(state.customBibles).toEqual([])
    expect(state.settings.defaultTranslationId).toBe('blivre')
    expect(state.recentPassages).toEqual([])
    expect(allBibleTranslations().some((entry) => entry.id === 'custom-pt-br-tst')).toBe(false)
  })

  it('never removes bundled Bibles', () => {
    expect(useAppStore.getState().removeCustomBible('blivre')).toEqual({
      ok: false,
      reason: 'bundled',
    })
  })

  it('drops persisted entries without a supported language', () => {
    const empty = sampleEntry({ id: 'custom-empty', name: 'Empty' })
    empty.books = {}
    const sanitized = sanitizeCustomBibleTranslations([
      sampleEntry(),
      sampleEntry({ id: 'custom-bad', language: 'xx' as CustomBibleTranslation['translation']['language'] }),
      empty,
    ])
    expect(sanitized.map((entry) => entry.translation.id)).toEqual(['custom-pt-br-tst'])
  })

  it('keeps custom Bibles and their default selection across rehydration', () => {
    useAppStore.getState().addCustomBible(sampleEntry())
    useAppStore.getState().updateSettings({ defaultTranslationId: 'custom-pt-br-tst' })
    const state = useAppStore.getState()
    const persisted = partializeWorkspace(state)
    const merged = mergeWorkspace(persisted, state)

    expect(merged.customBibles.map((entry) => entry.translation.id)).toEqual([
      'custom-pt-br-tst',
    ])
    expect(merged.settings.defaultTranslationId).toBe('custom-pt-br-tst')
  })

  it('exports and restores custom Bibles in backups', () => {
    useAppStore.getState().addCustomBible(sampleEntry())
    const state = useAppStore.getState()
    const backup = buildBackup({
      services: state.services,
      settings: state.settings,
      branding: state.branding,
      monitors: state.monitors,
      media: state.mediaLibrary,
      bibles: state.customBibles,
    })
    expect(backup.bibles).toHaveLength(1)

    const parsed = parseBackup(JSON.stringify(backup))
    expect(parsed.bibles?.[0]?.translation.language).toBe('pt-BR')
    expect(parsed.settings?.defaultTranslationId).toBe('blivre')
  })
})

describe('Bible text import', () => {
  it('accepts a books map or a wrapped books object', () => {
    const bare = parseBibleTextJson('{"john":{"3":{"16":"For God so loved the world."}}}')
    expect(bare.ok).toBe(true)
    if (!bare.ok) return
    expect(bare.books.john?.[3]?.[16]).toContain('loved the world')

    const wrapped = parseBibleTextJson(
      '{"name":"Sample","books":{"psalms":{"23":{"1":"The LORD is my shepherd."}}}}',
    )
    expect(wrapped.ok).toBe(true)
    if (!wrapped.ok) return
    expect(wrapped.books.psalms?.[23]?.[1]).toContain('shepherd')
  })

  it('reports invalid JSON, unknown books, and empty text', () => {
    expect(parseBibleTextJson('{')).toEqual({ ok: false, reason: 'invalid-json' })
    expect(parseBibleTextJson('{"unknown":{"1":{"1":"Text"}}}')).toEqual({
      ok: false,
      reason: 'invalid-format',
    })
    expect(parseBibleTextJson('{"john":{}}')).toEqual({ ok: false, reason: 'no-verses' })
  })
})

describe('full Bible imports', () => {
  // 66 books, as in common Portuguese Almeida downloads: `[{ abbrev, chapters: [[verse, ...]] }]`.
  function bookList(chapterCount = 1, versesPerChapter = 1, padding = '') {
    return Array.from({ length: 66 }, (_, index) => ({
      abbrev: index === 0 ? 'gn' : `b${index}`,
      chapters: Array.from({ length: chapterCount }, () =>
        Array.from({ length: versesPerChapter }, (_, verse) => `Livro ${index + 1}, versículo ${verse + 1}.${padding}`),
      ),
    }))
  }

  it('knows all 66 canonical books, Genesis to Revelation', async () => {
    const { BIBLE_BOOKS } = await import('../data/bible')
    expect(BIBLE_BOOKS).toHaveLength(66)
    expect(BIBLE_BOOKS[0].id).toBe('genesis')
    expect(BIBLE_BOOKS[65].id).toBe('revelation')
  })

  it('reads a list of books by canonical position and strips a byte-order mark', () => {
    const result = parseBibleTextJson(`\uFEFF${JSON.stringify(bookList())}`)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(Object.keys(result.books)).toHaveLength(66)
    expect(result.books.genesis[1][1]).toBe('Livro 1, versículo 1.')
    expect(result.books.revelation[1][1]).toBe('Livro 66, versículo 1.')
  })

  it('reads verse rows keyed by book name or number', () => {
    const rows = [
      { book: 'Gênesis', chapter: 1, verse: 1, text: 'No princípio criou Deus os céus e a terra.' },
      { book_id: 43, chapter: 3, verse: 16, text: 'Porque Deus amou o mundo de tal maneira.' },
    ]
    const result = parseBibleTextJson(JSON.stringify({ verses: rows }))
    expect(result.ok && result.books.genesis[1][1]).toBe('No princípio criou Deus os céus e a terra.')
    expect(result.ok && result.books.john[3][16]).toBe('Porque Deus amou o mundo de tal maneira.')
  })

  it('reads a SQL-style resultset export', () => {
    const json = { resultset: { row: [{ field: [1001001, 1, 1, 1, 'In the beginning.'] }] } }
    const result = parseBibleTextJson(JSON.stringify(json))
    expect(result.ok && result.books.genesis[1][1]).toBe('In the beginning.')
  })

  it('reads a books map keyed by Portuguese names with array chapters', () => {
    const result = parseBibleTextJson(JSON.stringify({ 'Jó': [['Havia um homem na terra de Uz.']], 'João': { '3': { '16': 'Porque Deus amou.' } } }))
    expect(result.ok && result.books.job[1][1]).toBe('Havia um homem na terra de Uz.')
    expect(result.ok && result.books.john[3][16]).toBe('Porque Deus amou.')
  })

  it('accepts a complete Bible of about 31,000 verses', () => {
    const raw = JSON.stringify(bookList(18, 26, ' E disse Deus: Haja luz; e houve luz, e viu Deus que era boa a luz.'))
    expect(raw.length).toBeGreaterThan(2_000_000)
    const result = parseBibleTextJson(raw)
    expect(result.ok).toBe(true)
    expect(result.ok && countBibleVerses(result.books)).toBe(66 * 18 * 26)
  })

  it('keeps persisted Bibles whose text was moved to IndexedDB', () => {
    const entry = { ...sampleEntry(), books: {} }
    const [kept] = sanitizeCustomBibleTranslations([entry], { textStoredElsewhere: true })
    expect(kept?.translation.id).toBe(entry.translation.id)
    expect(sanitizeCustomBibleTranslations([entry])).toEqual([])
  })
})
