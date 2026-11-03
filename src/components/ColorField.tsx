import { useId } from 'react'
import { normalizeHex } from '../utils/branding'

/**
 * Colour picker plus a typed #RRGGBB entry. The parent decides what is valid
 * and passes either an error or a note (for example a contrast reading).
 */
export function ColorField({
  label,
  hint,
  value,
  error,
  note,
  onChange,
}: {
  label: string
  /** Short purpose, read with the swatch button. */
  hint: string
  value: string
  error?: string
  note?: string
  onChange: (value: string) => void
}) {
  const id = useId()
  const normalized = normalizeHex(value)
  return (
    <div className="color-field">
      <label className="color-field-label" htmlFor={id}>
        {label}
      </label>
      <div className="color-field-row">
        <input
          type="color"
          className="color-swatch"
          value={normalized ?? '#000000'}
          aria-label={`${label} · ${hint}`}
          onChange={(event) => onChange(event.target.value)}
        />
        <input
          id={id}
          className="color-hex"
          value={value}
          spellCheck={false}
          maxLength={7}
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-note`}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      <p id={`${id}-note`} className={error ? 'field-error' : 'field-hint'} role={error ? 'alert' : undefined}>
        {error ?? note ?? hint}
      </p>
    </div>
  )
}
