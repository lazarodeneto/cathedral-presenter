import {
  ArrowDown,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  Locate,
  type LucideIcon,
} from 'lucide-react'
import { useT } from '../../i18n/useT'
import type { TextAlign } from '../../types'

export type VerticalAlign = 'top' | 'middle' | 'bottom'

const ROWS: VerticalAlign[] = ['top', 'middle', 'bottom']
const COLUMNS: TextAlign[] = ['left', 'center', 'right']

const ICONS: Record<`${VerticalAlign}-${TextAlign}`, LucideIcon> = {
  'top-left': ArrowUpLeft,
  'top-center': ArrowUp,
  'top-right': ArrowUpRight,
  'middle-left': ArrowLeft,
  'middle-center': Locate,
  'middle-right': ArrowRight,
  'bottom-left': ArrowDownLeft,
  'bottom-center': ArrowDown,
  'bottom-right': ArrowDownRight,
}

/**
 * Where the slide text, or a selected box, sits, as one 3×3 choice: the same grid as the message
 * box position, so a single click sets both the horizontal alignment and the
 * vertical position.
 */
export function TextPositionGrid({
  align,
  vertical,
  onChange,
  label,
}: {
  /** Null when the current position matches no cell (e.g. a box dragged freely). */
  align: TextAlign | null
  vertical: VerticalAlign | null
  onChange: (align: TextAlign, vertical: VerticalAlign) => void
  label: string
}) {
  const t = useT()
  return (
    <div className="position-grid text-position-grid" role="radiogroup" aria-label={label}>
      {ROWS.flatMap((row) =>
        COLUMNS.map((column) => {
          const Icon = ICONS[`${row}-${column}`]
          const active = align === column && vertical === row
          const name = row === 'middle' && column === 'center'
            ? t('editor.center')
            : `${t(`editor.${row}`)} · ${t(`editor.${column}`)}`
          return (
            <button
              key={`${row}-${column}`}
              type="button"
              role="radio"
              aria-checked={active}
              className={`icon-toggle ${active ? 'is-active' : ''}`}
              aria-label={name}
              title={name}
              onClick={() => onChange(column, row)}
            >
              <Icon size={15} />
            </button>
          )
        }),
      )}
    </div>
  )
}
