import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useResizablePane } from '../hooks/useResizablePane'

describe('pane resize interruptions', () => {
  for (const interruption of ['pointercancel', 'lostpointercapture', 'blur', 'unmount']) {
    it(`cleans up on ${interruption}`, () => {
      const { result, unmount } = renderHook(() => useResizablePane(`test:${interruption}`, { initial: 288, min: 260, max: 420 }))
      const grip = document.createElement('div')
      grip.setPointerCapture = vi.fn()
      grip.hasPointerCapture = vi.fn(() => true)
      grip.releasePointerCapture = vi.fn()
      const start = (pointerId: number) => result.current.gripProps.onPointerDown({
        button: 0, clientX: 100, pointerId, currentTarget: grip, preventDefault: vi.fn(),
      } as unknown as ReactPointerEvent<HTMLElement>)
      act(() => start(1))
      act(() => start(2))
      expect(grip.setPointerCapture).toHaveBeenCalledTimes(1)
      expect(document.body).toHaveClass('is-resizing-pane')
      if (interruption === 'unmount') unmount()
      else act(() => (interruption === 'blur' ? window : grip).dispatchEvent(new Event(interruption)))
      expect(document.body).not.toHaveClass('is-resizing-pane')
      expect(grip.releasePointerCapture).toHaveBeenCalledWith(1)
      if (interruption !== 'unmount') {
        act(() => start(3))
        expect(grip.setPointerCapture).toHaveBeenLastCalledWith(3)
        unmount()
      }
    })
  }
})
