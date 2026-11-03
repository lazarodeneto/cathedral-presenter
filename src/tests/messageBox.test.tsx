import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import {
  clampMessageBox,
  DEFAULT_MESSAGE_STYLE,
  makeMessageElement,
  matchingPosition,
  messageBoxCss,
  messageContrast,
  minimumReadableOpacity,
  normalizeMessageStyle,
  positionFor,
  requiredContrast,
  tryUpdateMessageStyle,
  validateMessageStyle,
} from '../utils/messageBox'
import { SlideRenderer } from '../components/SlideRenderer'
import { MessageBoxInspector } from '../components/editor/MessageBoxInspector'
import { useAppStore } from '../store/useAppStore'
import { createServiceSkeleton } from '../store/serviceUtils'
import { buildBackup, parseBackup } from '../security/backup'
import { buildOutputSnapshot } from '../store/outputState'
import { createBlankItem, makeSlide } from '../utils/slides'
import { DEFAULT_BRANDING } from '../utils/branding'
import type { Service, SlideElement } from '../types'

afterEach(cleanup)

describe('message box geometry', () => {
  it('keeps the box fully inside the slide and within size limits', () => {
    expect(clampMessageBox({ x: 90, y: -20, width: 40, height: 30 })).toEqual({ x: 60, y: 0, width: 40, height: 30 })
    expect(clampMessageBox({ x: -5, y: 95, width: 300, height: 2 })).toEqual({ x: 0, y: 92, width: 100, height: 8 })
    expect(clampMessageBox({ x: Number.NaN, y: 10, width: 50, height: 20 }).x).toBe(0)
  })

  it('places presets inside the edge margin and recognizes them', () => {
    expect(positionFor('top-left', { width: 40, height: 20 })).toEqual({ x: 5, y: 5, width: 40, height: 20 })
    expect(positionFor('bottom-right', { width: 40, height: 20 })).toEqual({ x: 55, y: 75, width: 40, height: 20 })
    expect(positionFor('center', { width: 40, height: 20 })).toEqual({ x: 30, y: 40, width: 40, height: 20 })
    expect(positionFor('bottom', { width: 70, height: 22 })).toEqual({ x: 15, y: 73, width: 70, height: 22 })
    expect(matchingPosition({ x: 30, y: 40, width: 40, height: 20 })).toBe('center')
    expect(matchingPosition({ x: 12, y: 40, width: 40, height: 20 })).toBeNull()
  })
})

describe('message box style validation', () => {
  it('has a readable default', () => {
    expect(validateMessageStyle(DEFAULT_MESSAGE_STYLE)).toEqual({})
    expect(messageContrast(DEFAULT_MESSAGE_STYLE)).toBeGreaterThan(requiredContrast(DEFAULT_MESSAGE_STYLE))
  })

  it('rejects invalid colours and out-of-range numbers', () => {
    const errors = validateMessageStyle({
      ...DEFAULT_MESSAGE_STYLE,
      textColor: 'white',
      borderColor: '#12',
      fontSize: 500,
      borderWidth: -2,
      lineHeight: 4,
    })
    expect(errors).toMatchObject({
      textColor: 'invalid-color',
      borderColor: 'invalid-color',
      fontSize: 'out-of-range',
      borderWidth: 'out-of-range',
      lineHeight: 'out-of-range',
    })
  })

  it('refuses text that would be unreadable over a light or dark slide', () => {
    // Grey text on a mostly transparent box fails over both white and black areas.
    const result = tryUpdateMessageStyle(DEFAULT_MESSAGE_STYLE, { backgroundOpacity: 0.1 })
    expect(result).toMatchObject({ ok: false, field: 'backgroundOpacity', error: 'low-contrast' })
    const dark = tryUpdateMessageStyle(DEFAULT_MESSAGE_STYLE, { textColor: '#222222' })
    expect(dark).toMatchObject({ ok: false, field: 'textColor', error: 'low-contrast' })
    // Small text needs 4.5:1, large text 3:1.
    expect(requiredContrast({ fontSize: 18, fontWeight: 400 })).toBe(4.5)
    expect(requiredContrast({ fontSize: 34, fontWeight: 400 })).toBe(3)
    expect(minimumReadableOpacity(DEFAULT_MESSAGE_STYLE)).toBeGreaterThan(0.4)
  })

  it('accepts a valid change and normalizes colours', () => {
    const result = tryUpdateMessageStyle(DEFAULT_MESSAGE_STYLE, { textColor: '#FFF', backgroundColor: '#123' })
    expect(result).toMatchObject({ ok: true, style: { textColor: '#ffffff', backgroundColor: '#112233' } })
  })

  it('repairs older or tampered data with safe defaults', () => {
    expect(normalizeMessageStyle(undefined)).toEqual(DEFAULT_MESSAGE_STYLE)
    const repaired = normalizeMessageStyle({
      textColor: '#000000',
      backgroundColor: '#000000',
      backgroundOpacity: 1,
      borderStyle: 'groove',
      fontSize: 9999,
      fontFamily: 'Comic Sans',
    })
    expect(repaired.borderStyle).toBe('solid')
    expect(repaired.fontSize).toBe(140)
    expect(repaired.fontFamily).toBe('sans')
    expect(repaired.textColor).toBe(DEFAULT_MESSAGE_STYLE.textColor)
  })

  it('turns the style into size-independent CSS', () => {
    const css = messageBoxCss({ ...DEFAULT_MESSAGE_STYLE, borderStyle: 'dashed', borderWidth: 4, borderRadius: 32 })
    expect(css.border).toBe('0.313cqw dashed #e5a44f')
    expect(css.borderRadius).toBe('2.500cqw')
    expect(css.backgroundColor).toBe('rgb(16 13 10 / 0.84)')
    expect(messageBoxCss({ ...DEFAULT_MESSAGE_STYLE, borderEnabled: false }).border).toBe('none')
    expect(messageBoxCss({ ...DEFAULT_MESSAGE_STYLE, borderStyle: 'none' }).border).toBe('none')
  })
})

function serviceWithMessage(): { service: Service; itemId: string; slideId: string; element: SlideElement } {
  const base = createServiceSkeleton({ title: 'Sunday', date: '2026-11-01', time: '10:00', locale: 'en' })
  const item = createBlankItem('Notices')
  const element = makeMessageElement('Line one\nLine two')
  item.slides[0].elements = [element]
  const service = {
    ...base,
    sections: base.sections.map((section, index) =>
      index === 0 ? { ...section, itemIds: [...section.itemIds, item.id] } : section,
    ),
    items: [...base.items, item],
  }
  return { service, itemId: item.id, slideId: item.slides[0].id, element }
}

describe('message boxes in the store and on disk', () => {
  beforeEach(() => localStorage.clear())

  it('clamps moves and resizes so the box never leaves the slide', () => {
    const { service, itemId, slideId, element } = serviceWithMessage()
    useAppStore.setState({ services: [service] })
    const store = useAppStore.getState()
    store.updateElement(service.id, itemId, slideId, element.id, { x: 120, y: -30, width: 80 })
    const saved = useAppStore.getState().services[0].items.at(-1)!.slides[0].elements[0]
    expect(saved).toMatchObject({ x: 20, y: 0, width: 80 })
  })

  it('only changes the targeted box, not boxes on other slides', () => {
    const one = serviceWithMessage()
    const two = serviceWithMessage()
    useAppStore.setState({ services: [one.service, two.service] })
    useAppStore.getState().updateElement(one.service.id, one.itemId, one.slideId, one.element.id, { text: 'Changed' })
    const services = useAppStore.getState().services
    expect(services[0].items.at(-1)!.slides[0].elements[0].text).toBe('Changed')
    expect(services[1].items.at(-1)!.slides[0].elements[0].text).toBe('Line one\nLine two')
  })

  it('persists text, style, position, size and visibility and restores them after reload', async () => {
    const { service, itemId, slideId, element } = serviceWithMessage()
    useAppStore.setState({ services: [service] })
    const style = { ...DEFAULT_MESSAGE_STYLE, borderStyle: 'dotted' as const, fontFamily: 'serif' as const, align: 'left' as const }
    useAppStore.getState().updateElement(service.id, itemId, slideId, element.id, {
      ...positionFor('top-right', { width: 40, height: 25 }),
      visible: false,
      opacity: 0.9,
      settings: { message: style },
    })
    const stored = localStorage.getItem('church-presenter:workspace:v1')!
    useAppStore.setState({ services: [] })
    localStorage.setItem('church-presenter:workspace:v1', stored)
    await useAppStore.persist.rehydrate()
    const restored = useAppStore.getState().services[0].items.at(-1)!.slides[0].elements[0]
    expect(restored).toMatchObject({ x: 55, y: 5, width: 40, height: 25, visible: false, opacity: 0.9, text: 'Line one\nLine two' })
    expect(restored.settings?.message).toEqual(style)
  })

  it('round-trips through backups and keeps tampered boxes inside the slide', () => {
    const { service } = serviceWithMessage()
    const backup = JSON.parse(
      JSON.stringify(
        buildBackup({ services: [service], settings: useAppStore.getState().settings, branding: DEFAULT_BRANDING, monitors: [], media: [] }),
      ),
    )
    const parsed = parseBackup(JSON.stringify(backup)).services[0].items.at(-1)!.slides[0].elements[0]
    expect(parsed).toMatchObject({ type: 'message', text: 'Line one\nLine two' })
    expect(parsed.settings?.message).toEqual(DEFAULT_MESSAGE_STYLE)

    const raw = backup.services[0].items.at(-1).slides[0].elements[0]
    raw.x = 140
    raw.width = 90
    raw.settings.message.borderWidth = 999
    const repaired = parseBackup(JSON.stringify(backup)).services[0].items.at(-1)!.slides[0].elements[0]
    expect(repaired.x + repaired.width).toBeLessThanOrEqual(100)
    expect(repaired.settings?.message?.borderWidth).toBe(16)
  })

  it('leaves slides without message boxes untouched', () => {
    const slide = makeSlide({ text: 'Plain slide' })
    render(<SlideRenderer slide={slide} branding={DEFAULT_BRANDING} />)
    expect(document.querySelector('.slide-message-box')).toBeNull()
    expect(screen.getByText('Plain slide')).toBeInTheDocument()
  })
})

describe('message box rendering', () => {
  it('renders text with line breaks, the chosen border and alignment, and respects visibility', () => {
    const element = makeMessageElement('First line\nSecond line', {
      settings: { message: { ...DEFAULT_MESSAGE_STYLE, borderStyle: 'dashed', align: 'right' } },
    })
    const slide = makeSlide({ text: '', elements: [element] })
    const { rerender } = render(<SlideRenderer slide={slide} branding={DEFAULT_BRANDING} />)
    const box = document.querySelector<HTMLElement>('.slide-message-box')!
    expect(box.querySelector('p')!.textContent).toBe('First line\nSecond line')
    expect(box.style.border).toContain('dashed')
    expect(box.style.textAlign).toBe('right')

    rerender(<SlideRenderer slide={{ ...slide, elements: [{ ...element, visible: false }] }} branding={DEFAULT_BRANDING} />)
    expect(document.querySelector('.slide-message-box')).toBeNull()
  })

  it('sends the same box to the audience output', () => {
    const { service, slideId } = serviceWithMessage()
    const snapshot = buildOutputSnapshot({
      service,
      live: {
        isLive: true,
        serviceId: service.id,
        currentSlideId: slideId,
        history: [slideId],
        startedAt: '2026-11-01T10:00:00.000Z',
        blank: false,
        frozen: false,
        frozenSlideId: null,
        message: null,
        messageVisible: false,
      },
      monitors: [],
      branding: DEFAULT_BRANDING,
      testMonitorId: null,
    })
    const editorMarkup = render(<SlideRenderer slide={snapshot.audience.slide} branding={DEFAULT_BRANDING} />).container
      .querySelector('.slide-message-box')!.outerHTML
    cleanup()
    const slide = service.items.at(-1)!.slides[0]
    const outputMarkup = render(<SlideRenderer slide={slide} branding={DEFAULT_BRANDING} />).container
      .querySelector('.slide-message-box')!.outerHTML
    expect(outputMarkup).toBe(editorMarkup)
  })
})

describe('message box inspector', () => {
  beforeEach(() => {
    useAppStore.setState({ settings: { ...useAppStore.getState().settings, locale: 'en' } })
  })

  function setup(element = makeMessageElement('Hello')) {
    const changes: Partial<SlideElement>[] = []
    function Harness() {
      const [current, setCurrent] = useState(element)
      return (
        <MessageBoxInspector
          element={current}
          fitScale={1}
          onChange={(patch) => {
            changes.push(patch)
            setCurrent((value) => ({ ...value, ...patch }))
          }}
        />
      )
    }
    render(<Harness />)
    return { changes }
  }

  it('moves the box with position presets', () => {
    const state = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Move to top left' }))
    expect(state.changes.at(-1)).toMatchObject({ x: 5, y: 5 })
  })

  it('rejects an unreadable text colour with a clear message and keeps the saved one', () => {
    const state = setup()
    fireEvent.change(screen.getByLabelText('Text colour'), { target: { value: '#222222' } })
    expect(screen.getByText(/Not readable: contrast/)).toBeInTheDocument()
    expect(state.changes).toHaveLength(0)
  })

  it('rejects out-of-range sizes and invalid colours', () => {
    const state = setup()
    fireEvent.change(screen.getByLabelText('Font size'), { target: { value: '400' } })
    expect(screen.getByText('Use a value from 14 to 140.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Border colour'), { target: { value: '#zz' } })
    expect(screen.getByText('Enter a colour as #RRGGBB.')).toBeInTheDocument()
    expect(state.changes).toHaveLength(0)
  })

  it('applies a valid style change and resets to the default style', () => {
    const state = setup()
    fireEvent.change(screen.getByLabelText('Style'), { target: { value: 'dotted' } })
    expect(state.changes.at(-1)?.settings?.message?.borderStyle).toBe('dotted')
    fireEvent.click(screen.getByRole('button', { name: /Reset style/ }))
    expect(state.changes.at(-1)?.settings?.message).toEqual(DEFAULT_MESSAGE_STYLE)
  })
})
