import { afterEach, describe, expect, it } from 'vitest'
import { useAppStore } from '../store/useAppStore'
import { buildOutputSnapshot } from '../store/outputState'
import { flatSlides } from '../store/serviceUtils'
import { getVersePassage } from '../providers/bible/LocalBibleProvider'
import { createBibleSlides } from '../utils/slides'
import { BOOK_GROUPS, OLD_TESTAMENT_COUNT, bookAbbreviation } from '../data/bibleModeBooks'
import { BIBLE_BOOKS } from '../data/bible'
import { LOCALES } from '../types'

function verseSlide() {
  const primary = getVersePassage('web', 'john', 3, 16)
  if (!primary) throw new Error('John 3:16 missing from the bundled sample')
  return createBibleSlides({ primary, bilingual: false })[0]
}

const snapshot = () => {
  const state = useAppStore.getState()
  return buildOutputSnapshot({
    service: state.services.find((service) => service.id === state.live?.serviceId) ?? null,
    live: state.live,
    monitors: state.monitors,
    branding: state.branding,
    testMonitorId: null,
  })
}

describe('Bible Mode', () => {
  afterEach(() => useAppStore.getState().endLive())

  it('has a label and a colour group for all 66 books', () => {
    expect(BOOK_GROUPS).toHaveLength(BIBLE_BOOKS.length)
    expect(OLD_TESTAMENT_COUNT).toBe(39)
    expect(bookAbbreviation(42, 'pt-BR')).toBe('Joã')
    expect(bookAbbreviation(8, 'pt-BR')).toBe('1Sa')
    expect(bookAbbreviation(42, 'en')).toBe('Joh')
  })

  it('uses distinct three-character abbreviations in every language, counting the number', () => {
    for (const locale of LOCALES) {
      const labels = BIBLE_BOOKS.map((_, index) => bookAbbreviation(index, locale))
      expect(new Set(labels).size).toBe(BIBLE_BOOKS.length)
      for (const [index, label] of labels.entries()) {
        const number = label.match(/^\d+/)?.[0] ?? ''
        const letters = label.replace(/^\d+/, '')
        const fullName = BIBLE_BOOKS[index].names[locale].replace(/^\d+[.\s]*/, '').replace(/[^\p{L}]/gu, '')
        expect(Array.from(label).length).toBe(Math.min(3, Array.from(number + fullName).length))
        expect(Array.from(letters).length).toBe(Math.min(3 - Array.from(number).length, Array.from(fullName).length))
        expect(letters.slice(0, 1)).toBe(letters.slice(0, 1).toLocaleUpperCase(locale))
        expect(letters.slice(1)).toBe(letters.slice(1).toLocaleLowerCase(locale))
      }
    }
  })

  it('shows a verse on the audience screen until the operator moves on', () => {
    const state = useAppStore.getState()
    const service = state.services.find((entry) => flatSlides(entry).length > 1 && entry.status !== 'archived')!
    expect(state.startLive(service.id, flatSlides(service)[0].slide.id)).toBe(true)
    const verse = verseSlide()
    expect(useAppStore.getState().showScriptureLive(verse)).toBe(true)
    expect(snapshot().audience.slide?.id).toBe(verse.id)
    expect(snapshot().confidence.notes).toBeNull()

    useAppStore.getState().nextLive()
    expect(useAppStore.getState().live?.scripture).toBeNull()
    expect(snapshot().audience.slide?.id).toBe(flatSlides(service)[1].slide.id)
  })

  it('freezes the verse on screen while the operator picks the next one', () => {
    const state = useAppStore.getState()
    const service = state.services.find((entry) => flatSlides(entry).length > 1 && entry.status !== 'archived')!
    state.startLive(service.id, flatSlides(service)[0].slide.id)
    const first = verseSlide()
    useAppStore.getState().showScriptureLive(first)
    useAppStore.getState().toggleFreeze()
    useAppStore.getState().showScriptureLive(verseSlide())
    expect(snapshot().audience.slide?.id).toBe(first.id)
    useAppStore.getState().toggleFreeze()
    expect(snapshot().audience.slide?.id).not.toBe(first.id)
  })

  it('does nothing when no service is live', () => {
    expect(useAppStore.getState().showScriptureLive(verseSlide())).toBe(false)
  })

  it('blacks out during a mode change until a verse or service slide is explicitly presented', () => {
    const state = useAppStore.getState()
    const service = state.services.find((entry) => flatSlides(entry).length > 1 && entry.status !== 'archived')!
    const slide = flatSlides(service)[0].slide
    state.startLive(service.id, slide.id)
    state.toggleFreeze()
    state.blankForModeTransition()
    expect(snapshot().audience.mode).toBe('blank')
    expect(useAppStore.getState().live).toMatchObject({ frozen: false, modeTransitionPending: true, scripture: null })
    state.toggleBlank()
    state.toggleFreeze()
    expect(snapshot().audience.mode).toBe('blank')
    expect(useAppStore.getState().live?.frozen).toBe(false)

    const verse = verseSlide()
    state.showScriptureLive(verse)
    expect(snapshot().audience).toMatchObject({ mode: 'live', slide: expect.objectContaining({ id: verse.id }) })

    state.blankForModeTransition()
    expect(snapshot().audience.mode).toBe('blank')
    expect(useAppStore.getState().live?.scripture).toBeNull()
    expect(state.jumpLive(slide.id)).toBe(true)
    expect(snapshot().audience).toMatchObject({ mode: 'live', slide: expect.objectContaining({ id: slide.id }) })
  })

  it('preserves the manual black screen when navigating slides normally', () => {
    const state = useAppStore.getState()
    const service = state.services.find((entry) => flatSlides(entry).length > 1 && entry.status !== 'archived')!
    state.startLive(service.id, flatSlides(service)[0].slide.id)
    state.toggleBlank()
    state.nextLive()
    expect(snapshot().audience.mode).toBe('blank')
  })
})
