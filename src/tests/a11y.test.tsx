import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { Modal } from '../components/Modal'
import { SlideRenderer } from '../components/SlideRenderer'
import { DEFAULT_BRANDING } from '../store/useAppStore'
import { makeElement, makeSlide, makeTextElement } from '../utils/slides'

function ModalHarness({ onWindowKey }: { onWindowKey: () => void }) {
  const [open, setOpen] = useState(false)
  window.onkeydown = onWindowKey
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      {open && (
        <Modal title="Dialog" onClose={() => setOpen(false)}>
          <input aria-label="Name" autoFocus />
        </Modal>
      )}
    </>
  )
}

describe('modal focus contract', () => {
  it('moves focus in, closes on Escape, restores focus, and keeps keys from window shortcuts', () => {
    const onWindowKey = vi.fn()
    render(<ModalHarness onWindowKey={onWindowKey} />)
    const opener = screen.getByRole('button', { name: 'Open' })
    opener.focus()
    fireEvent.click(opener)

    const dialog = screen.getByRole('dialog', { name: 'Dialog' })
    expect(dialog.contains(document.activeElement)).toBe(true)

    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' })
    expect(onWindowKey).not.toHaveBeenCalled()

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(opener)
    window.onkeydown = null
  })
})

describe('canvas keyboard editing', () => {
  const element = makeTextElement('Welcome', { x: 20, y: 30, width: 40, height: 20 })
  const slide = makeSlide({ elements: [element] })

  it('selects on focus, moves with arrows, resizes with Alt+arrows, and clamps', () => {
    const onSelect = vi.fn()
    const onMove = vi.fn()
    const onResize = vi.fn()
    render(
      <SlideRenderer
        slide={slide}
        branding={DEFAULT_BRANDING}
        interactive
        onSelectElement={onSelect}
        onMoveElement={onMove}
        onResizeElement={onResize}
      />,
    )
    const target = screen.getByRole('group', { name: /Welcome/ })
    fireEvent.focus(target)
    expect(onSelect).toHaveBeenCalledWith(element.id)

    fireEvent.keyDown(target, { key: 'ArrowRight' })
    expect(onMove).toHaveBeenLastCalledWith(element.id, 21, 30)
    fireEvent.keyDown(target, { key: 'ArrowUp', shiftKey: true })
    expect(onMove).toHaveBeenLastCalledWith(element.id, 20, 25)

    fireEvent.keyDown(target, { key: 'ArrowLeft', altKey: true })
    expect(onResize).toHaveBeenLastCalledWith(element.id, { x: 20, y: 30, width: 39, height: 20 })
  })

  it('never shrinks an element below the pointer minimum', () => {
    const tiny = makeTextElement('Tiny', { x: 0, y: 0, width: 4, height: 4 })
    const onResize = vi.fn()
    render(
      <SlideRenderer
        slide={makeSlide({ elements: [tiny] })}
        branding={DEFAULT_BRANDING}
        interactive
        onResizeElement={onResize}
      />,
    )
    fireEvent.keyDown(screen.getByRole('group', { name: /Tiny/ }), { key: 'ArrowLeft', altKey: true, shiftKey: true })
    expect(onResize).toHaveBeenLastCalledWith(tiny.id, { x: 0, y: 0, width: 4, height: 4 })
  })
})

describe('canvas pointer resizing', () => {
  it('locks to a perfect square while Shift or Ctrl is held', () => {
    const box = makeTextElement('Box', { x: 10, y: 10, width: 20, height: 20 })
    const onResize = vi.fn()
    // 1000×500 canvas: a 200px square is 20% wide and 40% tall.
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 1000, bottom: 500, width: 1000, height: 500, toJSON: () => ({}) })
    const captureSpy = vi.fn()
    HTMLElement.prototype.setPointerCapture = captureSpy
    render(
      <SlideRenderer
        slide={makeSlide({ elements: [box] })}
        branding={DEFAULT_BRANDING}
        interactive
        selectedElementId={box.id}
        onResizeElement={onResize}
      />,
    )
    const group = screen.getByRole('group', { name: /Box/ })
    const handle = group.querySelector('[data-resize="se"]')!
    fireEvent.pointerDown(handle, { clientX: 300, clientY: 150, pointerId: 1 })
    fireEvent.pointerMove(group, { clientX: 400, clientY: 160, pointerId: 1 })
    expect(onResize).toHaveBeenLastCalledWith(box.id, { x: 10, y: 10, width: 30, height: 22 })
    fireEvent.pointerMove(group, { clientX: 400, clientY: 160, pointerId: 1, shiftKey: true })
    expect(onResize).toHaveBeenLastCalledWith(box.id, { x: 10, y: 10, width: 30, height: 60 })

    // From the top-left handle the bottom-right corner stays put.
    fireEvent.pointerUp(group, { pointerId: 1 })
    fireEvent.pointerDown(group.querySelector('[data-resize="nw"]')!, { clientX: 100, clientY: 50, pointerId: 1 })
    fireEvent.pointerMove(group, { clientX: 50, clientY: 50, pointerId: 1, ctrlKey: true })
    expect(onResize).toHaveBeenLastCalledWith(box.id, { x: 5, y: -20, width: 25, height: 50 })
    rectSpy.mockRestore()
  })
})

describe('canvas pointer selection', () => {
  it('picks elements under the slide text, and Alt+click reaches the one below', () => {
    const back = makeElement('shape', { x: 20, y: 20, width: 40, height: 40, zIndex: 1 })
    const front = makeElement('shape', { x: 30, y: 30, width: 40, height: 40, zIndex: 1 })
    const slide = makeSlide({ kind: 'title', text: 'Welcome', contentZ: 5, elements: [back, front] })
    const onSelect = vi.fn()
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 1000, bottom: 500, width: 1000, height: 500, toJSON: () => ({}) })
    HTMLElement.prototype.setPointerCapture = vi.fn()
    const { container, rerender } = render(
      <SlideRenderer slide={slide} branding={DEFAULT_BRANDING} interactive onSelectElement={onSelect} onMoveElement={vi.fn()} />,
    )
    const textLayer = container.querySelector('.slide-title-layout')!

    // (400, 200) = 40% / 40%: inside both shapes; the later one is on top.
    fireEvent.pointerDown(textLayer, { clientX: 400, clientY: 200, pointerId: 1 })
    expect(onSelect).toHaveBeenLastCalledWith(front.id)

    rerender(
      <SlideRenderer slide={slide} branding={DEFAULT_BRANDING} interactive selectedElementId={front.id} onSelectElement={onSelect} onMoveElement={vi.fn()} />,
    )
    fireEvent.pointerDown(textLayer, { clientX: 400, clientY: 200, pointerId: 1, altKey: true })
    expect(onSelect).toHaveBeenLastCalledWith(back.id)

    // Empty spot: clears the selection.
    fireEvent.pointerDown(textLayer, { clientX: 950, clientY: 480, pointerId: 1 })
    expect(onSelect).toHaveBeenLastCalledWith(null)
    rectSpy.mockRestore()
  })
})
