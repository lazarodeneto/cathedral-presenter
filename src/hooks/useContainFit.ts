import { useLayoutEffect, useState, type RefObject } from 'react'

export interface FitSize {
  width: number
  height: number
}

/**
 * Largest box of the given aspect ratio (width / height) that fits inside
 * `available`, like `object-fit: contain`. Sizes are whole pixels so the
 * canvas edge stays crisp.
 */
export function containFit(available: { width: number; height: number }, ratio: number): FitSize | null {
  if (!(available.width > 0) || !(ratio > 0)) return null
  const maxHeight = available.height > 0 ? available.height : Infinity
  const height = Math.floor(Math.min(maxHeight, available.width / ratio))
  if (height <= 0) return null
  // Width follows the whole-pixel height, so rounding skews the ratio by at most half a pixel.
  return { width: Math.min(Math.floor(available.width), Math.round(height * ratio)), height }
}

/**
 * Sizes the editor canvas to fit its area at an exact aspect ratio. On desktop
 * the area has a fixed height, so both width and height limit the canvas. When
 * the page scrolls (tablet and phone) the area grows with its content, so only
 * the width limits it, capped at 62% of the window height to keep the strip and
 * inspector in reach. `reserved` is space beside the canvas, such as its tool rail.
 * `frame` is the frame's own border on each axis (2 for a 1px border): the
 * returned size includes it, so the slide inside keeps the exact ratio.
 */
export function useContainFit(
  areaRef: RefObject<HTMLElement | null>,
  ratio: number,
  reservedRef?: RefObject<HTMLElement | null>,
  frame = 0,
): FitSize | null {
  const [size, setSize] = useState<FitSize | null>(null)

  useLayoutEffect(() => {
    const area = areaRef.current
    if (!area) return
    const measure = () => {
      const reserved = reservedRef?.current
      const row = reserved?.parentElement
      const sideBySide = Boolean(row && getComputedStyle(row).flexDirection === 'row')
      const gap = row ? parseFloat(getComputedStyle(row).columnGap) || 0 : 0
      const width = area.clientWidth - (sideBySide && reserved ? reserved.offsetWidth + gap : 0)
      const fixedHeight = window.matchMedia('(min-width: 981px)').matches
      const height = fixedHeight ? area.clientHeight : window.innerHeight * 0.62
      const inner = containFit({ width: width - frame, height: height - frame }, ratio)
      const next = inner ? { width: inner.width + frame, height: inner.height + frame } : null
      setSize((current) =>
        current && next && current.width === next.width && current.height === next.height ? current : next,
      )
    }
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(area)
    if (reservedRef?.current) observer?.observe(reservedRef.current)
    window.addEventListener('resize', measure)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [areaRef, reservedRef, ratio, frame])

  return size
}
