import { afterEach, describe, expect, it } from 'vitest'
import { useAppStore } from '../store/useAppStore'
import { buildOutputSnapshot } from '../store/outputState'
import { flatSlides } from '../store/serviceUtils'
import { getVersePassage } from '../providers/bible/LocalBibleProvider'
import { createBibleSlides } from '../utils/slides'
import { BOOK_GROUPS, OLD_TESTAMENT_COUNT, bookAbbreviation } from '../data/bibleModeBooks'
import { BIBLE_BOOKS } from '../data/bible'

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
    expect(bookAbbreviation(42, 'pt-BR')).toBe('Jo')
    expect(bookAbbreviation(42, 'en')).toBe('Jhn')
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

  it('does nothing when no service is live', () => {
    expect(useAppStore.getState().showScriptureLive(verseSlide())).toBe(false)
  })
})
