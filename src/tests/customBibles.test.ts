import { beforeEach, describe, expect, it } from 'vitest'
import type { CustomBibleTranslation } from '../types'
import { useAppStore, DEFAULT_SETTINGS } from '../store/useAppStore'
import {
  allBibleTranslations,
  bibleVersesFor,
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
      useAppStore.getState().addCustomBible(sampleEntry({ id: 'web', name: 'Web copy' })),
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
    expect(state.settings.defaultTranslationId).toBe('web')
    expect(state.recentPassages).toEqual([])
    expect(allBibleTranslations().some((entry) => entry.id === 'custom-pt-br-tst')).toBe(false)
  })

  it('never removes bundled Bibles', () => {
    expect(useAppStore.getState().removeCustomBible('web')).toEqual({
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
    expect(parsed.settings?.defaultTranslationId).toBe('web')
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
