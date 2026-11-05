import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useLocale, useT } from '../i18n/useT'
import { formatNumericDate, parseDayMonthYear, parseISODate, isoDate, intlLocale } from '../utils/dates'

type DateFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  /** ISO date (YYYY-MM-DD) or '' when empty. */
  value: string
  onChange: (value: string) => void
}

function display(value: string): string {
  return value ? formatNumericDate(value) : ''
}

/** Inserts the slashes while typing so "08112026" reads "08/11/2026". */
function mask(text: string): string {
  if (/[^\d]/.test(text)) return text.slice(0, 10)
  const digits = text.slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

/**
 * Day-first text input with a localized calendar in the browser's top layer.
 */
export function DateField({ value, onChange, className, disabled, ...inputProps }: DateFieldProps) {
  const t = useT()
  const locale = useLocale()
  const [text, setText] = useState(() => display(value))
  const picker = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const [month, setMonth] = useState(() => value ? parseISODate(value) : new Date())
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const choose = (date: Date) => {
    const next = isoDate(date)
    setText(display(next))
    onChange(next)
    picker.current?.hidePopover()
    trigger.current?.focus()
  }

  // Follow changes made elsewhere (a reset filter, a loaded service).
  useEffect(() => {
    setText((current) => (parseDayMonthYear(current) === value ? current : display(value)))
  }, [value])

  const commit = (next: string) => {
    if (next !== value) onChange(next)
  }

  const openPicker = () => {
    const rect = trigger.current?.getBoundingClientRect()
    if (!rect) return
    setMonth(value ? parseISODate(value) : new Date())
    setPosition({ left: Math.max(8, Math.min(rect.right - 304, window.innerWidth - 312)), top: Math.max(8, Math.min(rect.bottom + 8, window.innerHeight - 370)) })
    picker.current?.showPopover()
    requestAnimationFrame(() => (picker.current?.querySelector<HTMLButtonElement>('[data-day][aria-pressed="true"]') ?? picker.current?.querySelector<HTMLButtonElement>('[data-day][aria-current="date"]:not(:disabled)') ?? picker.current?.querySelector<HTMLButtonElement>('[data-day]:not(:disabled)'))?.focus())
  }

  return (
    <span className={`date-field ${className ?? ''}`}>
      <input
        {...inputProps}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={t('common.datePlaceholder')}
        disabled={disabled}
        value={text}
        onChange={(event) => {
          const next = mask(event.target.value)
          setText(next)
          if (!next.trim()) commit('')
          else {
            const iso = parseDayMonthYear(next)
            if (iso) commit(iso)
          }
        }}
        onBlur={(event) => {
          // An unfinished or impossible date falls back to the last valid one.
          if (text.trim() && !parseDayMonthYear(text)) setText(display(value))
          inputProps.onBlur?.(event)
        }}
      />
      <button
        ref={trigger}
        type="button"
        className="date-field-button"
        onClick={openPicker}
        disabled={disabled}
        aria-label={t('common.openCalendar')}
        title={t('common.openCalendar')}
      >
        <CalendarDays size={15} />
      </button>
      <div
        ref={picker}
        popover="auto"
        role="dialog"
        aria-label={t('common.openCalendar')}
        className="glass-calendar"
        style={position}
        onKeyDown={(event) => {
          if (event.key === 'Escape') { event.stopPropagation(); picker.current?.hidePopover(); trigger.current?.focus() }
          const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
          const day = (event.target as HTMLElement).dataset.day
          if (day && event.key in steps) {
            event.preventDefault()
            const next = parseISODate(day)
            next.setDate(next.getDate() + steps[event.key])
            setMonth(next)
            requestAnimationFrame(() => picker.current?.querySelector<HTMLButtonElement>(`[data-day="${isoDate(next)}"]`)?.focus())
          }
        }}
      >
        <div className="glass-calendar-header">
          <strong aria-live="polite">{new Intl.DateTimeFormat(intlLocale(locale), { month: 'long', year: 'numeric' }).format(month)}</strong>
          <button type="button" aria-label={t('common.previous')} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={16} /></button>
          <button type="button" aria-label={t('common.next')} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={16} /></button>
        </div>
        <div className="glass-calendar-grid">
          {Array.from({ length: 7 }, (_, index) => <span key={index}>{new Intl.DateTimeFormat(intlLocale(locale), { weekday: 'short' }).format(new Date(2026, 10, 2 + index))}</span>)}
          {Array.from({ length: 42 }, (_, index) => {
            const first = new Date(month.getFullYear(), month.getMonth(), 1)
            const day = new Date(month.getFullYear(), month.getMonth(), index - (first.getDay() + 6) % 7 + 1)
            const iso = isoDate(day)
            const unavailable = Boolean(inputProps.min && iso < String(inputProps.min) || inputProps.max && iso > String(inputProps.max))
            return <button type="button" key={iso} data-day={iso} aria-label={new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: 'full' }).format(day)} aria-pressed={iso === value} aria-current={iso === isoDate(new Date()) ? 'date' : undefined} disabled={unavailable} className={day.getMonth() !== month.getMonth() ? 'is-outside' : ''} onClick={() => choose(day)}>{day.getDate()}</button>
          })}
        </div>
        <div className="glass-calendar-footer"><button type="button" onClick={() => choose(new Date())} disabled={Boolean(inputProps.min && isoDate(new Date()) < String(inputProps.min) || inputProps.max && isoDate(new Date()) > String(inputProps.max))}>{t('common.today')}</button></div>
      </div>
    </span>
  )
}
