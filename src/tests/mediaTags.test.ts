import { describe, expect, it } from 'vitest'
import type { MediaAsset } from '../types'
import { LOCALES } from '../types'
import { canonicalMediaTag, mediaTagLabel } from '../i18n/mediaTagLabels'
import { DEFAULT_MEDIA_TAGS, filterMedia, normalizeMediaTags } from '../utils/mediaTags'
import { buildBackup, parseBackup } from '../security/backup'
import { useAppStore } from '../store/useAppStore'
import { mergeWorkspace, partializeWorkspace } from '../store/workspacePersistence'

const image: MediaAsset = { id: 'image1', name: 'Louvor da noite', kind: 'image', mime: 'image/png', size: 10, source: '', status: 'missing', addedAt: '2026-11-05T12:00:00', provider: 'upload', tags: ['Louvor', 'Jovens'] }
const video: MediaAsset = { id: 'video1', name: 'Culto', kind: 'video', mime: 'video/mp4', size: 10, source: '', status: 'missing', addedAt: '2026-10-01T12:00:00', provider: 'upload', tags: ['Culto'] }
const defaults = { query: '', tags: [] as string[], kind: '', from: '', to: '', sort: 'newest' }

describe('media tags and search', () => {
  it('translates every standard tag, preserves identities and migrates the old pastor name', () => {
    for (const locale of LOCALES) for (const tag of DEFAULT_MEDIA_TAGS) {
      const label = mediaTagLabel(tag, locale)
      expect(label).toBeTruthy()
      expect(canonicalMediaTag(label)).toBe(tag)
    }
    expect(mediaTagLabel('Oração', 'en')).toBe('Prayer')
    expect(mediaTagLabel('Natália Machado', 'de')).toBe('Natália Machado')
    expect(normalizeMediaTags(['Pr. Sidney', 'Pr. Sidney Santos'])).toEqual(['Pr. Sidney Santos'])
    expect(filterMedia([image], { ...defaults, query: 'worship', tags: ['Worship'] }, 'en')).toEqual([image])
  })
  it('offers the requested predefined tags and removes duplicate or unsafe input', () => {
    expect(DEFAULT_MEDIA_TAGS).toContain('Pr. Pool Mcartney')
    expect(DEFAULT_MEDIA_TAGS).toContain('Gabriela Rocha')
    expect(normalizeMediaTags([' Música ', 'musica', '', 'Jovens\u0000'])).toEqual(['Música', 'Jovens'])
  })

  it('combines name, multiple tags, type and inclusive local dates', () => {
    const list = [image, video]
    expect(filterMedia(list, { ...defaults, query: 'louvor', tags: ['jovens', 'Louvor'], kind: 'image', from: '2026-11-05', to: '2026-11-05' })).toEqual([image])
    expect(filterMedia(list, { ...defaults, tags: ['Jovens', 'Culto'] })).toEqual([])
    expect(filterMedia(list, { ...defaults, sort: 'oldest' })).toEqual([video, image])
    expect(filterMedia(list, { ...defaults, from: '2026-11-06' })).toEqual([])
  })

  it('preserves per-media and reusable tags through storage and backup', () => {
    const state = useAppStore.getState()
    const modified = { ...state, mediaLibrary: [image], mediaTags: ['Retiro'] }
    const restored = mergeWorkspace(partializeWorkspace(modified), state)
    expect(restored.mediaLibrary[0].tags).toEqual(['Louvor', 'Jovens'])
    expect(restored.mediaTags).toEqual(['Retiro'])
    const backup = buildBackup({ services: state.services, settings: state.settings, branding: state.branding, monitors: state.monitors, media: [image], mediaTags: ['Retiro'] })
    const imported = parseBackup(JSON.stringify(backup))
    expect(imported.media?.[0]).toMatchObject({ tags: ['Louvor', 'Jovens'], source: '', status: 'missing' })
    expect(imported.mediaTags).toEqual(['Retiro'])
  })
})
