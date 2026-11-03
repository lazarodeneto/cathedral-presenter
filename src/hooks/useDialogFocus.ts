import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function focusableIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => !element.closest('[inert]') && element.getClientRects().length > 0,
  )
}

/**
 * Modal focus contract: move focus in on open, keep Tab inside, close on Escape,
 * and hand focus back to the opener on close. Keys pressed inside the dialog do
 * not reach window-level shortcuts (live Next/Blank/etc.).
 */
export function useDialogFocus<T extends HTMLElement>(
  onClose: () => void,
): { ref: RefObject<T | null>; onKeyDown: (event: ReactKeyboardEvent<T>) => void } {
  const ref = useRef<T | null>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  // Read during the first render: children with autoFocus take focus at commit,
  // before any effect runs, so an effect would record the dialog's own input.
  const [opener] = useState(() =>
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  )

  useEffect(() => {
    const container = ref.current
    if (container && !container.contains(document.activeElement)) {
      const preferred =
        container.querySelector<HTMLElement>('[autofocus], [data-autofocus]') ??
        focusableIn(container).find((element) => element.matches('input, select, textarea')) ??
        null
      ;(preferred ?? container).focus({ preventScroll: true })
    }
    return () => {
      if (opener && opener.isConnected) opener.focus({ preventScroll: true })
    }
  }, [opener])

  const onKeyDown = (event: ReactKeyboardEvent<T>) => {
    event.nativeEvent.stopPropagation()
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      closeRef.current()
      return
    }
    if (event.key !== 'Tab' || !ref.current) return
    const items = focusableIn(ref.current)
    if (!items.length) {
      event.preventDefault()
      return
    }
    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement
    if (event.shiftKey && (active === first || active === ref.current)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return { ref, onKeyDown }
}
