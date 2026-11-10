import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import type { Locale } from '../types'
import { LOCALE_OPTIONS } from '../i18n/dictionary'
import { LocaleFlag } from './LocaleFlag'

/**
 * Language menu with round SVG flags (native <select> options cannot show
 * images). Keyboard: Enter/Space/ArrowDown opens, arrows move, Enter picks,
 * Escape closes and returns focus. `compact` shows only the flag and code.
 */
export function LanguagePicker({
  value,
  onChange,
  label,
  compact = false,
  className = '',
}: {
  value: Locale
  onChange: (locale: Locale) => void
  label: string
  compact?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const items = useRef<(HTMLButtonElement | null)[]>([])
  const menuId = useId()
  const current = LOCALE_OPTIONS.find((option) => option.value === value) ?? LOCALE_OPTIONS[0]

  useEffect(() => {
    if (!open) return
    const index = Math.max(0, LOCALE_OPTIONS.findIndex((option) => option.value === value))
    items.current[index]?.focus()
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open, value])

  const choose = (locale: Locale) => {
    onChange(locale)
    setOpen(false)
    trigger.current?.focus()
  }

  const onMenuKey = (event: React.KeyboardEvent, index: number) => {
    const last = LOCALE_OPTIONS.length - 1
    const move = (to: number) => {
      event.preventDefault()
      items.current[to]?.focus()
    }
    if (event.key === 'ArrowDown') move(index === last ? 0 : index + 1)
    else if (event.key === 'ArrowUp') move(index === 0 ? last : index - 1)
    else if (event.key === 'Home') move(0)
    else if (event.key === 'End') move(last)
    else if (event.key === 'Escape' || event.key === 'Tab') {
      if (event.key === 'Escape') event.preventDefault()
      setOpen(false)
      trigger.current?.focus()
    }
  }

  return (
    <div ref={root} className={`language-picker ${compact ? 'is-compact' : ''} ${className}`}>
      <button
        ref={trigger}
        type="button"
        className="language-picker-trigger"
        aria-label={`${label}: ${current.label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((state) => !state)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setOpen(true)
          }
        }}
      >
        <LocaleFlag locale={current.value} />
        <span className="language-picker-label">{compact ? current.short : current.label}</span>
        <ChevronDown size={14} strokeWidth={2.4} className="language-picker-chevron" />
      </button>
      {open && (
        <div className="language-picker-menu" role="menu" id={menuId} aria-label={label}>
          {LOCALE_OPTIONS.map((option, index) => (
            <button
              key={option.value}
              ref={(element) => {
                items.current[index] = element
              }}
              type="button"
              role="menuitemradio"
              aria-checked={option.value === value}
              className={`language-picker-option ${option.value === value ? 'is-active' : ''}`}
              onClick={() => choose(option.value)}
              onKeyDown={(event) => onMenuKey(event, index)}
            >
              <LocaleFlag locale={option.value} size={20} />
              <span>{option.label}</span>
              <span className="language-picker-code">{option.short}</span>
              {option.value === value && <Check size={14} strokeWidth={2.6} className="language-picker-check" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
