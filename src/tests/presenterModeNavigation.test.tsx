import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { useHashRoute } from '../hooks/useHashRoute'
import { useAppStore } from '../store/useAppStore'
import { flatSlides } from '../store/serviceUtils'

describe('presenter mode navigation', () => {
  afterEach(() => { cleanup(); useAppStore.getState().endLive(); window.history.replaceState(null, '', '#/home') })

  it('blacks the live output on navigation in both directions', () => {
    const state = useAppStore.getState()
    const service = state.services.find((item) => flatSlides(item).length > 0 && item.status !== 'archived')!
    const slide = flatSlides(service)[0].slide
    state.startLive(service.id, slide.id)
    window.history.replaceState(null, '', `#/service/${service.id}`)
    renderHook(() => useHashRoute())

    act(() => { window.history.replaceState(null, '', `#/biblemode/${service.id}`); window.dispatchEvent(new HashChangeEvent('hashchange')) })
    expect(useAppStore.getState().live).toMatchObject({ blank: true, modeTransitionPending: true })

    state.jumpLive(slide.id)
    expect(useAppStore.getState().live?.blank).toBe(false)
    act(() => { window.history.replaceState(null, '', `#/service/${service.id}`); window.dispatchEvent(new HashChangeEvent('hashchange')) })
    expect(useAppStore.getState().live).toMatchObject({ blank: true, modeTransitionPending: true })
  })
})
