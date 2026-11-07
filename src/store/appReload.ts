import type { Toast } from '../types'
import { useAppStore, whenBibleTextsSaved } from './useAppStore'
import { flushSharedWorkspace, workspaceStatus } from './sharedWorkspace'
import { useToasts } from './useToasts'
import { translate } from '../i18n/dictionary'

const FLASH_KEY = 'church-presenter:after-reload'
const FOCUS_KEY = 'church-presenter:after-reload-focus'

/** What a screen should show first after the reload, e.g. the song just added. */
export interface ReloadFocus {
  kind: 'song'
  id: string
}

interface Flash {
  message: string
  tone: Toast['tone']
}

/**
 * Reloads the app after something new was added to a library (Bible, song,
 * media link), so every screen starts again from the saved data.
 * Waits until the workspace and imported Bible text are saved first, and
 * carries the confirmation message across the reload.
 * Files that exist only in this tab (uploaded videos and large images) would
 * be lost by a reload, so callers must not use this for them.
 */
export async function reloadAfterAdd(
  message: string,
  tone: Toast['tone'] = 'success',
  focus?: ReloadFocus,
): Promise<void> {
  useAppStore.getState().saveNow()
  await whenBibleTextsSaved()
  if (!await flushSharedWorkspace()) {
    const key = workspaceStatus() === 'conflict' ? 'workspace.conflict' : 'workspace.offline'
    useToasts.getState().push(translate(useAppStore.getState().settings.locale, key), 'error')
    return
  }
  try {
    sessionStorage.setItem(FLASH_KEY, JSON.stringify({ message, tone } satisfies Flash))
    if (focus) sessionStorage.setItem(FOCUS_KEY, JSON.stringify(focus))
  } catch {
    // The message is a courtesy; reload anyway.
  }
  window.location.reload()
}

/** The message saved by `reloadAfterAdd`, read once after the reload. */
export function takeReloadMessage(): Flash | null {
  try {
    const raw = sessionStorage.getItem(FLASH_KEY)
    sessionStorage.removeItem(FLASH_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<Flash>
    if (typeof value.message !== 'string' || !value.message) return null
    const tone = value.tone === 'error' || value.tone === 'info' ? value.tone : 'success'
    return { message: value.message.slice(0, 300), tone }
  } catch {
    return null
  }
}

/**
 * The item to show first after `reloadAfterAdd`. Reading does not clear it
 * (React may run an initializer twice); call `clearReloadFocus` once used.
 */
export function peekReloadFocus(kind: ReloadFocus['kind']): string | null {
  try {
    const raw = sessionStorage.getItem(FOCUS_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<ReloadFocus>
    return value.kind === kind && typeof value.id === 'string' ? value.id : null
  } catch {
    return null
  }
}

export function clearReloadFocus(): void {
  try {
    sessionStorage.removeItem(FOCUS_KEY)
  } catch {
    // Nothing to clear.
  }
}
