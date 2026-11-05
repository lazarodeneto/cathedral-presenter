import { reloadAfterAdd } from './appReload'
import { useAppStore } from './useAppStore'

/** Browser-stored layout choices: panel widths and inspector groups. */
const LAYOUT_KEYS = [
  'church-presenter:inspector-width',
  'church-presenter:inspector-groups',
  'church-presenter:inspector-order',
]

/**
 * Puts the screen layout back to how the app ships: left menu follows the
 * window width, inspector width, groups unfolded in their usual order, grid
 * off and snapping on. Services, songs, Bibles and settings stay as they are.
 */
export async function resetLayoutToDefault(message: string): Promise<void> {
  for (const key of LAYOUT_KEYS) {
    try {
      localStorage.removeItem(key)
    } catch {
      // Storage may be unavailable; the reload still resets what it can.
    }
  }
  useAppStore.getState().updateSettings({ sidebarCollapsed: undefined, showGrid: false, snapToObjects: true })
  await reloadAfterAdd(message, 'success')
}
