import {
  ACTION_BY_ID,
  SHORTCUT_ACTIONS,
  type ShortcutAction,
  type ShortcutContext,
  type ShortcutOverrides,
} from './actions'
import { comboProblem, normalizeCombo, type ComboProblem } from './keys'

/** Current combinations per action: the user's override if any (an empty list means disabled), else the defaults. */
export function resolveBindings(overrides: ShortcutOverrides): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  for (const action of SHORTCUT_ACTIONS) {
    result[action.id] = action.customizable && overrides[action.id] ? overrides[action.id] : action.defaults
  }
  return result
}

export type ShortcutStatus = 'default' | 'custom' | 'disabled' | 'fixed'

export function shortcutStatus(action: ShortcutAction, overrides: ShortcutOverrides): ShortcutStatus {
  if (!action.customizable) return 'fixed'
  const override = overrides[action.id]
  if (!override) return 'default'
  if (override.length === 0) return 'disabled'
  return 'custom'
}

/** Two actions can share a key only if they are never active at the same time. */
export function contextsOverlap(a: ShortcutContext[], b: ShortcutContext[]): boolean {
  if (a.includes('global') || b.includes('global')) return true
  return a.some((context) => b.includes(context))
}

/** The action that already uses this combination where it would also be active, if any. */
export function findConflict(
  actionId: string,
  combo: string,
  overrides: ShortcutOverrides,
): ShortcutAction | null {
  const action = ACTION_BY_ID.get(actionId)
  if (!action) return null
  const bindings = resolveBindings(overrides)
  for (const other of SHORTCUT_ACTIONS) {
    if (other.id === actionId) continue
    if (!bindings[other.id].includes(combo)) continue
    // Sharing a key with a global action would silently hide it in that context, so it counts too.
    if (contextsOverlap(action.contexts, other.contexts)) return other
  }
  return null
}

export type AssignResult =
  | { ok: true; overrides: ShortcutOverrides }
  | { ok: false; reason: 'invalid' | 'fixed' | ComboProblem }
  | { ok: false; reason: 'conflict'; conflict: ShortcutAction }

/**
 * Assign one combination to an action. A conflict is refused unless
 * `reassign` is set (the user confirmed): then the combination is removed
 * from the other action, which keeps any other combinations it had.
 */
export function assignShortcut(
  overrides: ShortcutOverrides,
  actionId: string,
  rawCombo: string,
  options: { reassign?: boolean } = {},
): AssignResult {
  const action = ACTION_BY_ID.get(actionId)
  const combo = normalizeCombo(rawCombo)
  if (!action || !combo) return { ok: false, reason: 'invalid' }
  if (!action.customizable) return { ok: false, reason: 'fixed' }
  const problem = comboProblem(combo)
  // Restoring a default that is normally reserved (e.g. none today) is still allowed.
  if (problem && !action.defaults.includes(combo)) return { ok: false, reason: problem }
  const conflict = findConflict(actionId, combo, overrides)
  if (conflict && (!options.reassign || !conflict.customizable)) return { ok: false, reason: 'conflict', conflict }
  const next: ShortcutOverrides = { ...overrides, [actionId]: [combo] }
  if (conflict) {
    const remaining = resolveBindings(overrides)[conflict.id].filter((entry) => entry !== combo)
    next[conflict.id] = remaining
  }
  return { ok: true, overrides: tidy(next) }
}

/** Turn a shortcut off. */
export function disableShortcut(overrides: ShortcutOverrides, actionId: string): ShortcutOverrides {
  const action = ACTION_BY_ID.get(actionId)
  if (!action?.customizable) return overrides
  return tidy({ ...overrides, [actionId]: [] })
}

/**
 * Back to the default. If the default is now used by another action (the
 * user reassigned it), the reset is refused with that conflict.
 */
export function resetShortcut(
  overrides: ShortcutOverrides,
  actionId: string,
): { ok: true; overrides: ShortcutOverrides } | { ok: false; conflict: ShortcutAction } {
  const action = ACTION_BY_ID.get(actionId)
  if (!action) return { ok: true, overrides }
  const without = { ...overrides }
  delete without[actionId]
  for (const combo of action.defaults) {
    const conflict = findConflict(actionId, combo, without)
    if (conflict) return { ok: false, conflict }
  }
  return { ok: true, overrides: without }
}

/** Drop overrides that equal the defaults, so later default changes still reach the user. */
function tidy(overrides: ShortcutOverrides): ShortcutOverrides {
  const result: ShortcutOverrides = {}
  for (const [id, combos] of Object.entries(overrides)) {
    const action = ACTION_BY_ID.get(id)
    if (!action) continue
    const same = combos.length === action.defaults.length && combos.every((combo, index) => combo === action.defaults[index])
    if (!same) result[id] = combos
  }
  return result
}

/**
 * Repair saved overrides (old versions, hand-edited data, backups). Unknown
 * actions, fixed actions, invalid or reserved combinations are dropped; an
 * override that would clash with another binding falls back to the default.
 * Valid custom shortcuts survive app updates.
 */
export function normalizeOverrides(value: unknown): ShortcutOverrides {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const accepted: ShortcutOverrides = {}
  for (const [id, raw] of Object.entries(value as Record<string, unknown>)) {
    const action = ACTION_BY_ID.get(id)
    if (!action?.customizable || !Array.isArray(raw)) continue
    const combos = [...new Set(raw.map(normalizeCombo).filter((combo): combo is string => Boolean(combo)))]
      .filter((combo) => !comboProblem(combo) || action.defaults.includes(combo))
      .slice(0, 3)
    if (raw.length > 0 && combos.length === 0) continue
    accepted[id] = combos
  }
  // Remove overrides that now conflict with something, keeping the earliest-listed action's binding.
  const result: ShortcutOverrides = {}
  for (const action of SHORTCUT_ACTIONS) {
    if (!accepted[action.id]) continue
    const clash = accepted[action.id].some((combo) => findConflict(action.id, combo, { ...result, [action.id]: accepted[action.id] }))
    if (!clash) result[action.id] = accepted[action.id]
  }
  return tidy(result)
}
