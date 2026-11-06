import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react'
import { BibleModeScreen } from '../screens/BibleModeScreen'
import { useAppStore } from '../store/useAppStore'
import { flatSlides } from '../store/serviceUtils'
import { getVersePassage } from '../providers/bible/LocalBibleProvider'
import { createBibleSlides } from '../utils/slides'
import { webOutputProvider } from '../providers/output/WebOutputProvider'

beforeEach(() => { vi.spyOn(webOutputProvider, 'audienceConnected').mockReturnValue(true) })

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} unobserve() {} })
})

afterEach(() => { cleanup(); useAppStore.getState().endLive(); vi.restoreAllMocks() })

describe('Bible Mode live state', () => {
  it('does not claim the verse is on screen without confirmation from an output', async () => {
    vi.mocked(webOutputProvider.audienceConnected).mockReturnValue(false)
    const state = useAppStore.getState()
    const service = state.services.find((item) => flatSlides(item).length && item.status !== 'archived')!
    state.startLive(service.id, flatSlides(service)[0].slide.id)
    state.showScriptureLive(createBibleSlides({ primary: getVersePassage('blivre', 'john', 3, 16)!, bilingual: false })[0])
    const { container } = render(<BibleModeScreen />)
    await screen.findByRole('button', { name: /(verse|versículo) 16$/i })
    expect(container.querySelector('.bm-on-screen')).toBeNull()
    expect(container.querySelector('.bm-preview-frame')).not.toHaveClass('is-on-screen')
  })

  it('waits for a connected output before starting live and preserves off-air state on failure', async () => {
    vi.mocked(webOutputProvider.audienceConnected).mockReturnValue(false)
    const prepare = vi.spyOn(webOutputProvider, 'prepareAudience').mockResolvedValue('unreachable')
    render(<BibleModeScreen />)
    const chapter = await screen.findByRole('button', { name: /^(chapter|capítulo) 3$/i })
    await waitFor(() => expect(chapter).toBeEnabled())
    fireEvent.click(chapter)
    fireEvent.click(await screen.findByRole('button', { name: /^(verse|versículo) 16$/i }))
    fireEvent.click(screen.getByRole('button', { name: /^(present|apresentar)$/i }))
    await waitFor(() => expect(prepare).toHaveBeenCalledOnce())
    expect(useAppStore.getState().live).toBeNull()
  })
  it('restores the audience verse after reopening and lets Enter activate a focused control', async () => {
    const state = useAppStore.getState()
    const service = state.services.find((item) => flatSlides(item).length && item.status !== 'archived')!
    state.startLive(service.id, flatSlides(service)[0].slide.id)
    const passage = getVersePassage('blivre', 'john', 3, 16)!
    useAppStore.getState().showScriptureLive(createBibleSlides({ primary: passage, bilingual: false })[0])
    render(<BibleModeScreen />)
    const verse = await screen.findByRole('button', { name: /(verse|versículo) 16.*(on screen|na tela|no ecrã)/i })
    expect(verse).toHaveClass('is-on-screen')
    expect(screen.getByRole('button', { name: /(chapter|capítulo) 3.*(on screen|na tela|no ecrã)/i })).toHaveClass('is-on-screen')
    expect(screen.getByRole('button', { name: /^(John|João)$/i })).toHaveClass('is-on-screen')
    const button = screen.getByRole('button', { name: /clear verse|limpar versículo/i })
    const key = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    fireEvent(button, key)
    expect(key.defaultPrevented).toBe(false)
    fireEvent.click(button)
    await waitFor(() => expect(useAppStore.getState().live?.scripture).toBeNull())
  })

  it('keeps the frozen verse marked until the audience output is unfrozen', async () => {
    const state = useAppStore.getState()
    const service = state.services.find((item) => flatSlides(item).length && item.status !== 'archived')!
    state.startLive(service.id, flatSlides(service)[0].slide.id)
    const first = createBibleSlides({ primary: getVersePassage('blivre', 'john', 3, 16)!, bilingual: false })[0]
    const second = createBibleSlides({ primary: getVersePassage('blivre', 'john', 3, 17)!, bilingual: false })[0]
    useAppStore.getState().showScriptureLive(first)
    useAppStore.getState().toggleFreeze()
    useAppStore.getState().showScriptureLive(second)
    render(<BibleModeScreen />)
    expect(await screen.findByRole('button', { name: /(verse|versículo) 16.*(on screen|na tela|no ecrã)/i })).toHaveClass('is-on-screen')
    act(() => useAppStore.getState().toggleFreeze())
    expect(await screen.findByRole('button', { name: /(verse|versículo) 17.*(on screen|na tela|no ecrã)/i })).toHaveClass('is-on-screen')
  })

  it('shows the audience alert on the live preview and removes it when hidden', async () => {
    const state = useAppStore.getState()
    const service = state.services.find((item) => flatSlides(item).length && item.status !== 'archived')!
    state.startLive(service.id, flatSlides(service)[0].slide.id)
    const verse = createBibleSlides({ primary: getVersePassage('blivre', 'john', 3, 16)!, bilingual: false })[0]
    useAppStore.getState().showScriptureLive(verse)
    useAppStore.getState().setAudienceMessage('Test alert')
    const { container } = render(<BibleModeScreen />)
    await waitFor(() => expect(container.querySelector('.bm-preview-frame .slide-message')).toHaveTextContent('Test alert'))
    act(() => useAppStore.getState().clearAudienceMessage())
    expect(container.querySelector('.bm-preview-frame .slide-message')).toBeNull()
  })

  it('keeps the live verse in the preview while browsing another book', async () => {
    const state = useAppStore.getState()
    const service = state.services.find((item) => flatSlides(item).length && item.status !== 'archived')!
    state.startLive(service.id, flatSlides(service)[0].slide.id)
    const verse = createBibleSlides({ primary: getVersePassage('blivre', 'john', 3, 16)!, bilingual: false })[0]
    state.showScriptureLive(verse)
    const { container } = render(<BibleModeScreen />)
    const book = await screen.findByRole('button', { name: /^(Romans|Romanos)$/i })
    await waitFor(() => expect(book).toBeEnabled())
    fireEvent.click(book)
    const frame = container.querySelector('.bm-preview-frame')!
    expect(frame).toHaveClass('is-on-screen')
    expect(frame).toHaveTextContent(verse.bible!.primary.text)
    expect(frame).not.toHaveTextContent(/choose a chapter|escolha um capítulo/i)
    expect(container.querySelector('.bm-reference-chapter')).toHaveTextContent('3')
    expect(container.querySelector('.bm-reference-verse')).toHaveTextContent('16')
  })
})
