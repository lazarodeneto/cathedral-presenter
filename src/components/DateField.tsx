import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react'
import { CalendarDays } from 'lucide-react'
import { useT } from '../i18n/useT'
import { formatNumericDate, parseDayMonthYear } from '../utils/dates'

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
 * Date input that always reads and writes DD/MM/YYYY, whatever the browser's
 * own locale. The native date input follows the browser UI language (so an
 * English browser shows mm/dd/yyyy) and cannot be changed, so it is kept only
 * behind the calendar button, for its picker.
 */
export function DateField({ value, onChange, className, disabled, ...inputProps }: DateFieldProps) {
  const t = useT()
  const [text, setText] = useState(() => display(value))
  const picker = useRef<HTMLInputElement>(null)

  // Follow changes made elsewhere (a reset filter, a loaded service).
  useEffect(() => {
    setText((current) => (parseDayMonthYear(current) === value ? current : display(value)))
  }, [value])

  const commit = (next: string) => {
    if (next !== value) onChange(next)
  }

  const openPicker = () => {
    const input = picker.current
    if (!input) return
    try {
      input.showPicker()
    } catch {
      input.focus()
      input.click()
    }
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
        type="button"
        className="date-field-button"
        onClick={openPicker}
        disabled={disabled}
        aria-label={t('common.openCalendar')}
        title={t('common.openCalendar')}
      >
        <CalendarDays size={15} />
      </button>
      <input
        ref={picker}
        className="date-field-picker"
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={value}
        onChange={(event) => {
          setText(display(event.target.value))
          commit(event.target.value)
        }}
      />
    </span>
  )
}
