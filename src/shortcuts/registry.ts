import { useEffect, useRef } from 'react'
import { ACTION_BY_ID, SHORTCUT_ACTIONS, type ShortcutContext, type ShortcutOverrides } from './actions'
import { resolveBindings } from './bindings'
import { comboFromEvent, detectPlatform, isBareKey, type KeyLike, type Platform } from './keys'

/** Return false to let the key through (for example when the action does not apply right now). */
export type ShortcutHandler = () => void | boolean

interface Layer {
  context: ShortcutContext
  handlers: Partial<Record<string, ShortcutHandler>>
}

const layers: Layer[] = []

/** Register handlers for actions a screen owns. Returns the unregister function. */
export function registerShortcutHandlers(
  context: ShortcutContext,
  handlers: Partial<Record<string, ShortcutHandler>>,
): () => void {
  const layer: Layer = { context, handlers }
  layers.push(layer)
  return () => {
    const index = layers.indexOf(layer)
    if (index >= 0) layers.splice(index, 1)
  }
}

export function registeredLayerCount(): number {
  return layers.length
}

/** Specific contexts beat global ones; among equals, the most recently mounted screen wins. */
const PRIORITY: Record<ShortcutContext, number> = { presentation: 2, editor: 2, global: 1 }

/** Run an action by id in the active screens (used by output windows relaying keys). */
export function runShortcutAction(actionId: string): boolean {
  const action = ACTION_BY_ID.get(actionId)
  if (!action) return false
  const candidates = layers
    .map((layer, index) => ({ layer, index }))
    .filter(({ layer }) => action.contexts.includes(layer.context) && layer.handlers[actionId])
    .sort((a, b) => PRIORITY[b.layer.context] - PRIORITY[a.layer.context] || b.index - a.index)
  for (const { layer } of candidates) {
    if (layer.handlers[actionId]!() !== false) return true
  }
  return false
}

export interface DispatchConfig {
  overrides: ShortcutOverrides
  enabled: boolean
  platform?: Platform
}

const TEXT_INPUT_TYPES = new Set(['text', 'search', 'email', 'url', 'tel', 'password', 'number', 'date', 'time', 'datetime-local', 'month', 'week', 'range', 'color'])

/** Typing targets keep their keys: text fields, selects, editable content. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true
  if (target instanceof HTMLInputElement) return TEXT_INPUT_TYPES.has(target.type || 'text')
  return false
}

/** Space and Enter on a focused button or link activate it; shortcuts must not also fire. */
function activatesFocusedControl(target: EventTarget | null, combo: string): boolean {
  if (combo !== 'Space' && combo !== 'Enter') return false
  return target instanceof HTMLElement && Boolean(target.closest('button, a[href], [role="button"], [role="switch"], input[type="checkbox"], input[type="radio"]'))
}

/**
 * Decide whether a key event runs a shortcut, and run it. Returns the action
 * id that ran, or null. Rules, in order:
 * 1. Keys already handled by a control (defaultPrevented) or pressed inside a
 *    dialog are left alone; dialogs own their keys.
 * 2. While typing, only actions marked allowInInputs run, and never for bare keys.
 * 3. Space/Enter on a focused button activate the button instead.
 * 4. Among matching actions with a handler on screen, the most specific
 *    context wins (presentation/editor before global).
 */
export function dispatchShortcut(event: KeyboardEvent | (KeyLike & { target?: EventTarget | null; repeat?: boolean; defaultPrevented?: boolean; preventDefault?: () => void }), config: DispatchConfig): string | null {
  if (!config.enabled || event.defaultPrevented) return null
  const target = event.target ?? null
  if (target instanceof HTMLElement && target.closest('[role="dialog"]')) return null
  const combo = comboFromEvent(event, config.platform ?? detectPlatform())
  if (!combo) return null
  if (activatesFocusedControl(target, combo)) return null
  const typing = isTypingTarget(target)
  const bindings = resolveBindings(config.overrides)

  const candidates: { actionId: string; layer: Layer; index: number }[] = []
  for (const action of SHORTCUT_ACTIONS) {
    if (!bindings[action.id].includes(combo)) continue
    if (typing && !(action.allowInInputs && !isBareKey(combo))) continue
    if (event.repeat && !action.repeat) continue
    layers.forEach((layer, index) => {
      if (action.contexts.includes(layer.context) && layer.handlers[action.id]) candidates.push({ actionId: action.id, layer, index })
    })
  }
  candidates.sort((a, b) => PRIORITY[b.layer.context] - PRIORITY[a.layer.context] || b.index - a.index)
  for (const { actionId, layer } of candidates) {
    if (layer.handlers[actionId]!() === false) continue
    event.preventDefault?.()
    return actionId
  }
  return null
}

/**
 * The one global keyboard listener. It reads the current settings on each key
 * press, so changing a shortcut needs no re-registration. Returns cleanup.
 */
export function installShortcutListener(getConfig: () => DispatchConfig, target: Window = window): () => void {
  const onKey = (event: KeyboardEvent) => {
    dispatchShortcut(event, getConfig())
  }
  target.addEventListener('keydown', onKey)
  return () => target.removeEventListener('keydown', onKey)
}

/**
 * Register this screen's handlers while it is mounted. Handlers may change on
 * every render; the latest ones always run, and registration happens once.
 */
export function useShortcutHandlers(
  context: ShortcutContext,
  handlers: Partial<Record<string, ShortcutHandler>>,
  active = true,
): void {
  const latest = useRef(handlers)
  latest.current = handlers
  const ids = Object.keys(handlers).sort().join('|')
  useEffect(() => {
    if (!active) return
    const proxies: Partial<Record<string, ShortcutHandler>> = {}
    for (const id of ids.split('|').filter(Boolean)) proxies[id] = () => latest.current[id]?.()
    return registerShortcutHandlers(context, proxies)
  }, [context, ids, active])
}
