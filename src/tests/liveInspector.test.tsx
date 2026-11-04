import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { WorkspaceScreen } from '../screens/WorkspaceScreen'
import { useAppStore } from '../store/useAppStore'
import { flatSlides } from '../store/serviceUtils'
import type { LiveSession } from '../types'

describe('inspector while live', () => {
  beforeEach(() => {
    window.matchMedia ??= ((query: string) =>
      ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false }) as MediaQueryList)
    window.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver
    useAppStore.setState({ settings: { ...useAppStore.getState().settings, locale: 'en' }, live: null })
  })

  it('folds to the speaker notes of the live slide, and can be opened again', () => {
    const service = useAppStore.getState().services[0]
    const first = flatSlides(service)[0]
    useAppStore.setState({
      activeServiceId: service.id,
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
    render(<WorkspaceScreen serviceId={service.id} />)

    const notes = screen.getByRole('textbox', { name: 'Speaker notes' })
    expect(notes.closest('.live-notes')).not.toBeNull()
    expect(screen.queryByRole('button', { name: 'Design' })).toBeNull()

    fireEvent.change(notes, { target: { value: 'Pause after this line' } })
    const updated = flatSlides(useAppStore.getState().services.find((entry) => entry.id === service.id)!)[0]
    expect(updated.slide.notes).toBe('Pause after this line')

    fireEvent.click(screen.getByRole('button', { name: /Show inspector/ }))
    expect(screen.getByRole('button', { name: 'Design' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Hide inspector/ }))
    expect(screen.queryByRole('button', { name: 'Design' })).toBeNull()
  })
})
