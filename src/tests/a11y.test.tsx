import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { Modal } from '../components/Modal'
import { SlideRenderer } from '../components/SlideRenderer'
import { DEFAULT_BRANDING } from '../store/useAppStore'
import { makeSlide, makeTextElement } from '../utils/slides'

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
