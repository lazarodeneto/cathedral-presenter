import type { Service } from '../types'
import { useAppStore } from './useAppStore'

/**
 * Undo/redo for service content (rundown, slides, elements). It records the
 * services list before each change; edits arriving within COALESCE_MS of each
 * other (typing, dragging) count as one step. Session-only, like the live
 * state: a reload starts with an empty history.
 */
const LIMIT = 60
const COALESCE_MS = 700

const past: Service[][] = []
const future: Service[][] = []
let applying = false
let lastChange = 0

export function startHistory(): () => void {
  return useAppStore.subscribe((state, previous) => {
    if (applying || state.services === previous.services) return
    const now = Date.now()
    if (now - lastChange > COALESCE_MS || past.length === 0) {
      past.push(previous.services)
      if (past.length > LIMIT) past.shift()
    }
    lastChange = now
    future.length = 0
  })
}

function apply(services: Service[]) {
  applying = true
  try {
    const state = useAppStore.getState()
    const service = services.find((entry) => entry.id === state.activeServiceId)
    const item = service?.items.find((entry) => entry.id === state.selectedItemId)
    const slide = item?.slides.find((entry) => entry.id === state.selectedSlideId)
    // Keep the selection valid if the undone change created or removed it.
    useAppStore.setState({
      services,
      selectedItemId: item ? state.selectedItemId : service?.items[0]?.id ?? null,
      selectedSlideId: slide ? state.selectedSlideId : (item ?? service?.items[0])?.slides[0]?.id ?? null,
      selectedElementId: slide?.elements.some((element) => element.id === state.selectedElementId)
        ? state.selectedElementId
        : null,
    })
  } finally {
    applying = false
    lastChange = 0
  }
}

export function undo(): boolean {
  const previous = past.pop()
  if (!previous) return false
  future.push(useAppStore.getState().services)
  apply(previous)
  return true
}

export function redo(): boolean {
  const next = future.pop()
  if (!next) return false
  past.push(useAppStore.getState().services)
  apply(next)
  return true
}

export const canUndo = () => past.length > 0
export const canRedo = () => future.length > 0

/** For tests and data resets. */
export function clearHistory() {
  past.length = 0
  future.length = 0
  lastChange = 0
}
