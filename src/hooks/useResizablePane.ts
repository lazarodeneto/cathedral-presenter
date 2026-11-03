import { useCallback, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'

function readWidth(key: string, fallback: number, min: number, max: number): number {
  try {
    const stored = Number(window.localStorage.getItem(key))
    return Number.isFinite(stored) && stored >= min && stored <= max ? stored : fallback
  } catch {
    return fallback
  }
}

/**
 * Width of a pane that sits on the right edge and resizes from its left grip.
 * The width is a per-device convenience, so it lives in localStorage, not the store.
 */
export function useResizablePane(key: string, { initial, min, max }: { initial: number; min: number; max: number }) {
  const [width, setWidth] = useState(() => readWidth(key, initial, min, max))

  const commit = useCallback(
    (next: number) => {
      const clamped = Math.round(Math.min(max, Math.max(min, next)))
      setWidth(clamped)
      try {
        window.localStorage.setItem(key, String(clamped))
      } catch {
        // Storage can be unavailable (private window); the width still applies for this session.
      }
    },
    [key, max, min],
  )

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) return
      event.preventDefault()
      const startX = event.clientX
      const startWidth = width
      const grip = event.currentTarget
      grip.setPointerCapture(event.pointerId)
      document.body.classList.add('is-resizing-pane')
      const onMove = (move: PointerEvent) => commit(startWidth + (startX - move.clientX))
      const onUp = () => {
        document.body.classList.remove('is-resizing-pane')
        grip.removeEventListener('pointermove', onMove)
        grip.removeEventListener('pointerup', onUp)
        grip.removeEventListener('pointercancel', onUp)
      }
      grip.addEventListener('pointermove', onMove)
      grip.addEventListener('pointerup', onUp)
      grip.addEventListener('pointercancel', onUp)
    },
    [commit, width],
  )

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>) => {
      const step = event.shiftKey ? 40 : 12
      if (event.key === 'ArrowLeft') commit(width + step)
      else if (event.key === 'ArrowRight') commit(width - step)
      else if (event.key === 'Home') commit(max)
      else if (event.key === 'End') commit(min)
      else return
      event.preventDefault()
      event.stopPropagation()
    },
    [commit, max, min, width],
  )

  return {
    width,
    gripProps: {
      role: 'separator' as const,
      tabIndex: 0,
      'aria-orientation': 'vertical' as const,
      'aria-valuemin': min,
      'aria-valuemax': max,
      'aria-valuenow': width,
      onPointerDown,
      onKeyDown,
      onDoubleClick: () => commit(initial),
    },
  }
}
