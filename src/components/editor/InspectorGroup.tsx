import { Children, createContext, isValidElement, useContext, useState, type ReactElement, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, GripVertical, type LucideIcon } from 'lucide-react'

const CLOSED_KEY = 'church-presenter:inspector-groups'
const ORDER_KEY = 'church-presenter:inspector-order'

function readList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key)
    const ids = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

function writeList(key: string, ids: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(ids))
  } catch {
    // Folding and order are conveniences; ignore storage errors.
  }
}

interface DragContext {
  dragging: string | null
  drop: { id: string; side: 'before' | 'after' } | null
  start: (id: string) => void
  over: (id: string, side: 'before' | 'after') => void
  finish: (id: string) => void
  cancel: () => void
  /** Keyboard and touch twin of dragging: one step up or down. */
  move: (id: string, direction: -1 | 1) => void
  position: (id: string) => { first: boolean; last: boolean }
  hint: string
  moveUpLabel: string
  moveDownLabel: string
}

const GroupDrag = createContext<DragContext | null>(null)

/**
 * Holds the inspector groups: shows them in the order the operator dragged
 * them into, remembered on this device. Groups missing from the saved order
 * keep their place at the end.
 */
export function InspectorGroupList({
  children,
  dragHint,
  moveUpLabel,
  moveDownLabel,
}: {
  children: ReactNode
  dragHint: string
  moveUpLabel: string
  moveDownLabel: string
}) {
  const [order, setOrder] = useState(() => readList(ORDER_KEY))
  const [dragging, setDragging] = useState<string | null>(null)
  const [drop, setDrop] = useState<DragContext['drop']>(null)

  const groups = Children.toArray(children).filter(
    (child): child is ReactElement<{ id: string }> => isValidElement(child) && typeof (child.props as { id?: unknown }).id === 'string',
  )
  const rank = (id: string) => {
    const at = order.indexOf(id)
    return at < 0 ? order.length + groups.findIndex((group) => group.props.id === id) : at
  }
  const sorted = [...groups].sort((a, b) => rank(a.props.id) - rank(b.props.id))

  const ids = sorted.map((group) => group.props.id)
  const saveOrder = (next: string[]) => {
    setOrder(next)
    writeList(ORDER_KEY, next)
  }
  const context: DragContext = {
    dragging,
    drop,
    hint: dragHint,
    moveUpLabel,
    moveDownLabel,
    position: (id) => ({ first: ids[0] === id, last: ids[ids.length - 1] === id }),
    move: (id, direction) => {
      const at = ids.indexOf(id)
      const to = at + direction
      if (at < 0 || to < 0 || to >= ids.length) return
      const next = [...ids]
      ;[next[at], next[to]] = [next[to], next[at]]
      saveOrder(next)
    },
    start: (id) => setDragging(id),
    over: (id, side) => {
      if (drop?.id !== id || drop.side !== side) setDrop({ id, side })
    },
    finish: (target) => {
      if (dragging && drop && dragging !== target) {
        const next = ids.filter((id) => id !== dragging)
        const at = next.indexOf(target)
        next.splice(drop.side === 'after' ? at + 1 : at, 0, dragging)
        saveOrder(next)
      }
      setDragging(null)
      setDrop(null)
    },
    cancel: () => {
      setDragging(null)
      setDrop(null)
    },
  }

  return <GroupDrag.Provider value={context}>{sorted}</GroupDrag.Provider>
}

/**
 * A foldable inspector section, like the sections of the service sequence.
 * Folded groups are remembered on this device; inside an InspectorGroupList
 * the header can be dragged to reorder.
 */
export function InspectorGroup({
  id,
  icon: Icon,
  title,
  meta,
  children,
}: {
  id: string
  icon: LucideIcon
  title: string
  /** Short value shown on the right of the header, e.g. the current background. */
  meta?: ReactNode
  children: ReactNode
}) {
  const drag = useContext(GroupDrag)
  const [open, setOpen] = useState(() => !readList(CLOSED_KEY).includes(id))
  const toggle = () => {
    const closed = new Set(readList(CLOSED_KEY))
    if (open) closed.add(id)
    else closed.delete(id)
    writeList(CLOSED_KEY, [...closed])
    setOpen(!open)
  }
  const bodyId = `inspector-group-${id}`
  const dropClass = drag?.drop?.id === id ? `drop-${drag.drop.side}` : ''
  return (
    <section
      className={`inspector-group ${open ? 'is-open' : 'is-closed'} ${drag?.dragging === id ? 'is-dragging' : ''} ${dropClass}`}
      onDragOver={(event) => {
        if (!drag?.dragging || drag.dragging === id) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        const rect = event.currentTarget.getBoundingClientRect()
        drag.over(id, event.clientY < rect.top + rect.height / 2 ? 'before' : 'after')
      }}
      onDrop={(event) => {
        if (!drag?.dragging) return
        event.preventDefault()
        drag.finish(id)
      }}
    >
      <div
        className="inspector-group-head"
        draggable={Boolean(drag)}
        onDragStart={(event) => {
          if (!drag) return
          event.dataTransfer.effectAllowed = 'move'
          event.dataTransfer.setData('text/plain', id)
          drag.start(id)
        }}
        onDragEnd={() => drag?.cancel()}
      >
        {drag ? (
          <span className="inspector-group-grip" title={drag.hint} aria-hidden="true">
            <GripVertical size={13} />
          </span>
        ) : null}
        <button
          type="button"
          className="inspector-group-toggle"
          aria-expanded={open}
          aria-controls={bodyId}
          aria-keyshortcuts={drag ? 'Alt+ArrowUp Alt+ArrowDown' : undefined}
          onClick={toggle}
          onKeyDown={(event) => {
            if (!drag || !event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return
            event.preventDefault()
            drag.move(id, event.key === 'ArrowUp' ? -1 : 1)
            // Keep focus on this header after it moves.
            const button = event.currentTarget
            requestAnimationFrame(() => button.focus())
          }}
        >
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Icon size={14} className="inspector-group-icon" />
          <span className="inspector-group-title">{title}</span>
          {meta ? <span className="inspector-group-meta">{meta}</span> : null}
        </button>
        {drag ? (
          <span className="inspector-group-move">
            <button
              type="button"
              className="icon-btn icon-btn-xs"
              disabled={drag.position(id).first}
              onClick={() => drag.move(id, -1)}
              aria-label={`${drag.moveUpLabel}: ${title}`}
              title={drag.moveUpLabel}
            >
              <ArrowUp size={12} />
            </button>
            <button
              type="button"
              className="icon-btn icon-btn-xs"
              disabled={drag.position(id).last}
              onClick={() => drag.move(id, 1)}
              aria-label={`${drag.moveDownLabel}: ${title}`}
              title={drag.moveDownLabel}
            >
              <ArrowDown size={12} />
            </button>
          </span>
        ) : null}
      </div>
      {open ? (
        <div className="inspector-group-body" id={bodyId}>
          {children}
        </div>
      ) : null}
    </section>
  )
}
