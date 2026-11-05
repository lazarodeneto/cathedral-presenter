import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { OUTPUT_FORMATS, outputFormat, resolutionLabel, type OutputFormatId } from '../utils/outputFormats'

/**
 * Dropdown of the projection formats: name, resolution, proportion and a
 * small outline in that shape, grouped by proportion. Used by the editor and
 * by Settings → Outputs. `trigger` renders the button content; it defaults
 * to the selected format in full.
 */
export function OutputFormatPicker({
  value,
  onChange,
  label,
  className = '',
  buttonClassName = 'btn btn-secondary btn-sm',
  trigger,
}: {
  value: OutputFormatId | undefined
  onChange: (id: OutputFormatId) => void
  label: string
  className?: string
  buttonClassName?: string
  trigger?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const current = outputFormat(value)

  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', close)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', close)
    }
  }, [open])

  return (
    <div className={`workspace-aspect-picker ${className}`} ref={rootRef}>
      <button
        type="button"
        className={buttonClassName}
        onClick={() => setOpen((next) => !next)}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {trigger ?? (
          <>
            <span className={`aspect-glyph is-${current.aspect}`} aria-hidden="true" />
            <span className="workspace-aspect-copy">
              <strong>{current.name}</strong>
              <small>
                {resolutionLabel(current)} · {current.ratio}
              </small>
            </span>
          </>
        )}
        <ChevronDown size={13} />
      </button>
      {open && (
        <div className="workspace-aspect-menu" role="menu" aria-label={label}>
          {OUTPUT_FORMATS.map((format, index) => (
            <button
              key={format.id}
              type="button"
              className={`workspace-aspect-option ${current.id === format.id ? 'is-active' : ''} ${
                index > 0 && OUTPUT_FORMATS[index - 1].ratio !== format.ratio ? 'starts-group' : ''
              }`}
              role="menuitemradio"
              aria-checked={current.id === format.id}
              onClick={() => {
                onChange(format.id)
                setOpen(false)
              }}
            >
              <span className={`aspect-glyph is-${format.aspect}`} aria-hidden="true" />
              <span className="workspace-aspect-copy">
                <strong>{format.name}</strong>
                <small>
                  {resolutionLabel(format)} · {format.ratio}
                </small>
              </span>
              {current.id === format.id && <Check size={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
