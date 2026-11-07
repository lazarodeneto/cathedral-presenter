import { useLayoutEffect, useRef } from 'react'
/** Fit the full product name within its available width, including after fonts load. */
export function AppName({
  children = 'Cathedral Presenter',
  maxSize = 18,
}: {
  children?: string
  maxSize?: number
}) {
  const ref = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    let active = true
    const fit = () => {
      if (!active || !element.clientWidth) return
      element.style.fontSize = `${maxSize}px`
      if (element.scrollWidth > element.clientWidth) {
        const next = Math.max(
          8,
          Math.floor(((maxSize * (element.clientWidth - 2)) / element.scrollWidth) * 2) / 2,
        )
        element.style.fontSize = `${next}px`
      }
    }
    fit()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fit)
    if (element.parentElement) observer?.observe(element.parentElement)
    window.addEventListener('resize', fit)
    void document.fonts?.ready.then(fit)
    document.fonts?.addEventListener('loadingdone', fit)
    return () => {
      active = false
      observer?.disconnect()
      window.removeEventListener('resize', fit)
      document.fonts?.removeEventListener('loadingdone', fit)
    }
  }, [children, maxSize])
  return (
    <strong ref={ref} className="app-name-fit" title={children}>
      {children}
    </strong>
  )
}
