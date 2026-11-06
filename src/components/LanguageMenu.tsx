import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import type { Locale } from '../types'
import { LOCALE_OPTIONS } from '../i18n/localeOptions'
import { LocaleFlag } from './LocaleFlag'

/** Language picker: the active language's flag and code, opening a list of all of them. */
export function LanguageMenu({
  locale,
  onChange,
  label,
}: {
  locale: Locale
  onChange: (locale: Locale) => void
  label: string
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const current = LOCALE_OPTIONS.find((option) => option.value === locale) ?? LOCALE_OPTIONS[0]
  const listId = useId()

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    listRef.current?.focus()
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open])

  const show = () => {
    setActive(
      Math.max(
        0,
        LOCALE_OPTIONS.findIndex((option) => option.value === locale),
      ),
    )
    setOpen(true)
  }

  const close = (focusButton = true) => {
    setOpen(false)
    if (focusButton) buttonRef.current?.focus()
  }

  const choose = (value: Locale) => {
    if (value !== locale) onChange(value)
    close()
  }

  const onListKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
    const last = LOCALE_OPTIONS.length - 1
    const moves: Record<string, number> = {
      ArrowDown: Math.min(last, active + 1),
      ArrowUp: Math.max(0, active - 1),
      Home: 0,
      End: last,
    }
    if (event.key in moves) {
      event.preventDefault()
      setActive(moves[event.key])
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      choose(LOCALE_OPTIONS[active].value)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close()
    } else if (event.key === 'Tab') {
      close(false)
    }
  }

  return (
    <div className="topbar-language" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`topbar-language-trigger ${open ? 'is-open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`${label}: ${current.label}`}
        title={label}
        onClick={() => (open ? close() : show())}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            show()
          }
        }}
      >
        <LocaleFlag locale={current.value} size={18} />
        <span className="topbar-language-code">{current.short}</span>
        <ChevronDown size={13} className="topbar-language-chevron" aria-hidden="true" />
      </button>
      {open && (
        <ul
          ref={listRef}
          id={listId}
          className="topbar-language-menu"
          role="listbox"
          tabIndex={-1}
          aria-label={label}
          aria-activedescendant={`${listId}-${LOCALE_OPTIONS[active].value}`}
          onKeyDown={onListKeyDown}
        >
          {LOCALE_OPTIONS.map((option, index) => (
            <li
              key={option.value}
              id={`${listId}-${option.value}`}
              role="option"
              aria-selected={option.value === locale}
              className={`topbar-language-option ${index === active ? 'is-active' : ''}`}
              onPointerEnter={() => setActive(index)}
              onClick={() => choose(option.value)}
            >
              <LocaleFlag locale={option.value} size={20} />
              <span className="topbar-language-name">
                {option.label.slice(0, -option.short.length).trimEnd()}{' '}
                <span className="topbar-language-region">{option.short}</span>
              </span>
              <Check
                size={14}
                strokeWidth={2.4}
                className="topbar-language-check"
                aria-hidden="true"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
