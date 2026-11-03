import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useT } from '../i18n/useT'

export function Modal({
  children,
  onClose,
  title,
  subtitle,
  wide = false,
  className = '',
}: {
  children: ReactNode
  onClose: () => void
  title: string
  subtitle?: string
  wide?: boolean
  className?: string
}) {
  const t = useT()
  const ref = useRef<HTMLDialogElement | null>(null)
  const titleId = useId()
  // Capture opener at mount time; autoFocus'd children take focus before any effect runs.
  const [opener] = useState(() =>
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  )

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
    // Native showModal() moves focus to the autofocus element automatically.
    // In environments without that behavior (jsdom), do it explicitly.
    if (!dialog.contains(document.activeElement)) {
      const preferred =
        dialog.querySelector<HTMLElement>('[autofocus]') ??
        dialog.querySelector<HTMLElement>(
          'input:not([disabled]),select:not([disabled]),textarea:not([disabled])',
        ) ??
        null
      ;(preferred ?? dialog).focus({ preventScroll: true })
    }
    return () => {
      if (opener && opener.isConnected) opener.focus({ preventScroll: true })
    }
  }, [opener])

  return (
    <dialog
      ref={ref}
      className={`modal${wide ? ' modal-wide' : ''}${className ? ` ${className}` : ''}`}
      aria-labelledby={titleId}
      onClick={(event) => {
        // Clicks on ::backdrop fire with the dialog as the target; close on backdrop click.
        if (event.target === event.currentTarget) onClose()
      }}
      onKeyDown={(event) => {
        // Stop keyboard events from reaching window-level shortcut handlers
        // (live-mode Next / Blank / etc. that listen on window).
        event.nativeEvent.stopPropagation()
        if (event.key === 'Escape') {
          // Prevent the native cancel/close sequence (would fire onClose a second time).
          event.preventDefault()
          onClose()
        }
      }}
    >
      <div className="modal-header">
        <div>
          <h2 id={titleId}>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button className="icon-btn" onClick={onClose} aria-label={t('common.close')}>
          <X size={17} />
        </button>
      </div>
      {children}
    </dialog>
  )
}

export function ConfirmDialog({
  open,
  title,
  copy,
  confirmLabel,
  tone = 'danger',
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  copy: string
  confirmLabel: string
  tone?: 'danger' | 'primary'
  onConfirm: () => void
  onClose: () => void
}) {
  const t = useT()
  if (!open) return null
  return (
    <Modal title={title} onClose={onClose}>
      <p className="modal-copy">{copy}</p>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>
          {t('common.cancel')}
        </button>
        <button
          className={`btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}`}
          onClick={() => {
            onConfirm()
            onClose()
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
