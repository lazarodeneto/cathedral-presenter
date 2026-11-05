import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronDown } from 'lucide-react'

export function SortSelect<T extends string>({ value, options, label, onChange, selectedLabel, leading }: {
  value: T
  options: { value: T; label: string }[]
  label: string
  onChange: (value: T) => void
  selectedLabel?: string
  leading?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const id = useId()
  useEffect(() => {
    if (!open) return
    menu.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus()
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [open])
  return (
    <div className="sort-select" ref={root} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
    }}>
      <span id={`${id}-label`} className="sort-select-label">{label}</span>
      <button ref={trigger} type="button" className="sort-select-trigger" title={options.find((option) => option.value === value)?.label}
        aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            setOpen(true)
          }
        }}>
        {leading}
        <span id={`${id}-value`}>{selectedLabel ?? options.find((option) => option.value === value)?.label}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && <div id={id} ref={menu} role="menu" aria-labelledby={`${id}-label`} className="sort-select-menu"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            setOpen(false)
            trigger.current?.focus()
          }
          const items = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])
          const index = items.indexOf(document.activeElement as HTMLButtonElement)
          const next = event.key === 'ArrowDown' ? (index + 1) % items.length
            : event.key === 'ArrowUp' ? (index - 1 + items.length) % items.length
            : event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : -1
          if (next >= 0) { event.preventDefault(); items[next]?.focus() }
        }}>
        {options.map((option) => <button key={option.value} type="button" role="menuitemradio"
          aria-checked={option.value === value} tabIndex={option.value === value ? 0 : -1}
          onClick={() => { onChange(option.value); setOpen(false); trigger.current?.focus() }}>
          <span>{option.label}</span>
          {option.value === value && <Check size={16} aria-hidden="true" />}
        </button>)}
      </div>}
    </div>
  )
}
