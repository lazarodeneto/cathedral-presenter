import { useAppStore } from '../store/useAppStore'
import { resolveBindings } from './bindings'
import { formatCombo } from './keys'

/** The current key for an action, formatted for this platform, or null if it has none. */
export function useShortcutLabel(actionId: string): string | null {
  const overrides = useAppStore((state) => state.settings.shortcutOverrides)
  const enabled = useAppStore((state) => state.settings.shortcutsEnabled)
  const combo = resolveBindings(overrides ?? {})[actionId]?.[0]
  return enabled && combo ? formatCombo(combo) : null
}
