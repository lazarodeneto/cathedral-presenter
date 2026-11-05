import { beforeEach, describe, expect, it } from 'vitest'
import { useAppStore } from '../store/useAppStore'
import { flatSlides } from '../store/serviceUtils'
import type { LiveSession } from '../types'

describe('live navigation keeps the editor in sync', () => {
  beforeEach(() => {
    const service = useAppStore.getState().services[0]
    const first = flatSlides(service)[0]
    useAppStore.setState({
      activeServiceId: service.id,
      selectedItemId: first.item.id,
      selectedSlideId: first.slide.id,
      live: {
        isLive: true,
        serviceId: service.id,
        currentSlideId: first.slide.id,
        history: [first.slide.id],
        startedAt: '2026-11-04T10:00:00.000Z',
        blank: false,
        frozen: false,
        frozenSlideId: null,
        message: null,
        messageVisible: false,
      } as LiveSession,
    })
  })

  it('selects the slide that goes live on Next, Previous and Jump', () => {
    const service = useAppStore.getState().services[0]
    const slides = flatSlides(service)
    expect(useAppStore.getState().nextLive()).toBe(true)
    expect(useAppStore.getState().selectedSlideId).toBe(slides[1].slide.id)
    expect(useAppStore.getState().selectedItemId).toBe(slides[1].item.id)

    expect(useAppStore.getState().prevLive()).toBe(true)
    expect(useAppStore.getState().selectedSlideId).toBe(slides[0].slide.id)

    const last = slides[slides.length - 1]
    expect(useAppStore.getState().jumpLive(last.slide.id)).toBe(true)
    expect(useAppStore.getState().selectedSlideId).toBe(last.slide.id)
    expect(useAppStore.getState().selectedItemId).toBe(last.item.id)
  })
})
