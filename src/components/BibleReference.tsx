import { useLayoutEffect, useRef } from 'react'

/** Keep the full reference and its action on one line at every panel width. */
export function BibleReference({
  book,
  chapter,
  verse,
  verseLabel,
}: {
  book: string
  chapter: number | null
  verse: number | null
  verseLabel: string
}) {
  const outer = useRef<HTMLElement>(null)
  const line = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const container = outer.current
    const text = line.current
    const row = container?.parentElement
    if (!container || !text || !row) return
    let cancelled = false
    let measuredWidth = 0
    let measuredReferenceWidth = 0
    const fit = () => {
      if (!row.clientWidth) return
      measuredWidth = row.clientWidth
      row.classList.remove('reference-compact')
      text.style.fontSize = '14px'
      if (text.scrollWidth > container.clientWidth) {
        text.style.fontSize = `${Math.max(11, (14 * container.clientWidth) / text.scrollWidth)}px`
      }
      if (text.scrollWidth > container.clientWidth + 1) {
        row.classList.add('reference-compact')
        text.style.fontSize = '14px'
        if (text.scrollWidth > container.clientWidth) {
          text.style.fontSize = `${(14 * container.clientWidth) / text.scrollWidth}px`
        }
      }
      measuredReferenceWidth = container.clientWidth
    }
    fit()
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            if (row.clientWidth !== measuredWidth || container.clientWidth !== measuredReferenceWidth) fit()
          })
    observer?.observe(row)
    observer?.observe(container)
    window.addEventListener('resize', fit)
    void document.fonts?.ready.then(() => {
      if (!cancelled) fit()
    })
    return () => {
      cancelled = true
      observer?.disconnect()
      window.removeEventListener('resize', fit)
    }
  }, [book, chapter, verse, verseLabel])
  return (
    <strong className="bm-reference" ref={outer}>
      <span className="bm-reference-line" ref={line}>
        {book}
        {chapter !== null && (
          <>
            {' '}
            <span className="bm-reference-chapter">{chapter}</span>
          </>
        )}
        {verse !== null && (
          <>
            {' '}
            {verseLabel} <span className="bm-reference-verse">{verse}</span>
          </>
        )}
      </span>
    </strong>
  )
}
