import { useLayoutEffect, useRef } from 'react'
import type { SlideElement } from '../types'
import { messageBoxCss, messageFontSize, messageStyleOf } from '../utils/messageBox'

/** Smallest share of the chosen font size used when text has to shrink to fit. */
export const MIN_FIT_SCALE = 0.35

/**
 * A message box as drawn on the slide. The same component renders in the
 * editor canvas, thumbnails, live console and output windows; all sizes use
 * container units, so it looks identical at every resolution.
 *
 * Text wraps automatically. If it still does not fit, the font shrinks (down
 * to about a third of the chosen size) so text stays inside the box; `onFit`
 * reports the scale so the editor can say so.
 */
export function MessageBoxView({
  element,
  onFit,
}: {
  element: SlideElement
  onFit?: (scale: number) => void
}) {
  const style = messageStyleOf(element)
  const boxRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLParagraphElement>(null)
  const lastScale = useRef(1)

  useLayoutEffect(() => {
    const box = boxRef.current
    const text = textRef.current
    if (!box || !text) return
    const fits = () => box.scrollHeight <= box.clientHeight + 1 && box.scrollWidth <= box.clientWidth + 1
    const fit = () => {
      text.style.fontSize = messageFontSize(style, 1)
      let scale = 1
      if (box.clientHeight > 0 && !fits()) {
        let low = MIN_FIT_SCALE
        let high = 1
        for (let i = 0; i < 7; i += 1) {
          const mid = (low + high) / 2
          text.style.fontSize = messageFontSize(style, mid)
          if (fits()) low = mid
          else high = mid
        }
        scale = low
        text.style.fontSize = messageFontSize(style, scale)
      }
      box.dataset.fitScale = scale.toFixed(2)
      box.classList.toggle('is-overflowing', !fits())
      if (Math.abs(scale - lastScale.current) > 0.005) {
        lastScale.current = scale
        onFit?.(scale)
      }
    }
    fit()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(fit)
    observer.observe(box)
    return () => observer.disconnect()
  })

  return (
    <div ref={boxRef} className="slide-message-box" style={messageBoxCss(style)}>
      <p ref={textRef} style={{ fontSize: messageFontSize(style) }}>
        {element.text ?? ''}
      </p>
    </div>
  )
}
