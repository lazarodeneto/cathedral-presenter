import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Globe } from 'lucide-react'
import { LOCALE_OPTIONS } from '../i18n/dictionary'
import type { Locale } from '../types'
import { LocaleFlag } from './LocaleFlag'

/**
 * Language filter with the same round flags and "Português BR" labels as the
 * top-bar language switcher. `''` is the "all languages" choice.
 */
export function LanguageFilterSelect({
  value,
  languages,
  allLabel,
  label,
  onChange,
}: {
  value: Locale | ''
  /** Languages to offer, e.g. the ones present in the library. */
  languages: Locale[]
  allLabel: string
  label: string
  onChange: (value: Locale | '') => void
}) {
  const options: (Locale | '')[] = ['', ...LOCALE_OPTIONS.map((option) => option.value).filter((code) => languages.includes(code))]
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const listId = `language-filter-${label.replace(/\W+/g, '-').toLowerCase()}`

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
    setActive(Math.max(0, options.indexOf(value)))
    setOpen(true)
  }
  const close = (focusButton = true) => {
    setOpen(false)
    if (focusButton) buttonRef.current?.focus()
  }
  const choose = (next: Locale | '') => {
    if (next !== value) onChange(next)
    close()
  }

  const name = (code: Locale | '') => {
    if (!code) return <span className="topbar-language-name">{allLabel}</span>
    const option = LOCALE_OPTIONS.find((entry) => entry.value === code)!
    return (
      <span className="topbar-language-name">
        {option.label.slice(0, -option.short.length).trimEnd()} <span className="topbar-language-region">{option.short}</span>
      </span>
    )
  }
  const icon = (code: Locale | '', size: number) =>
    code ? <LocaleFlag locale={code} size={size} /> : <Globe size={size - 2} className="language-filter-globe" aria-hidden="true" />

  return (
    <div className="language-filter" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`language-filter-trigger ${open ? 'is-open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={label}
        onClick={() => (open ? close() : show())}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            show()
          }
        }}
      >
        {icon(value, 16)}
        {name(value)}
        <ChevronDown size={13} aria-hidden="true" />
      </button>
      {open && (
        <ul
          ref={listRef}
          id={listId}
          className="topbar-language-menu language-filter-menu"
          role="listbox"
          tabIndex={-1}
          aria-label={label}
          aria-activedescendant={`${listId}-${options[active] || 'all'}`}
          onKeyDown={(event) => {
            const last = options.length - 1
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
              choose(options[active])
            } else if (event.key === 'Escape') {
              event.preventDefault()
              event.stopPropagation()
              close()
            } else if (event.key === 'Tab') {
              close(false)
            }
          }}
        >
          {options.map((code, index) => (
            <li
              key={code || 'all'}
              id={`${listId}-${code || 'all'}`}
              role="option"
              aria-selected={code === value}
              className={`topbar-language-option ${index === active ? 'is-active' : ''}`}
              onPointerEnter={() => setActive(index)}
              onClick={() => choose(code)}
            >
              {icon(code, 20)}
              {name(code)}
              <Check size={14} strokeWidth={2.4} className="topbar-language-check" aria-hidden="true" />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
