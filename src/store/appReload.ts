import type { Toast } from '../types'
import { useAppStore, whenBibleTextsSaved } from './useAppStore'

const FLASH_KEY = 'church-presenter:after-reload'

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
export async function reloadAfterAdd(message: string, tone: Toast['tone'] = 'success'): Promise<void> {
  useAppStore.getState().saveNow()
  await whenBibleTextsSaved()
  try {
    sessionStorage.setItem(FLASH_KEY, JSON.stringify({ message, tone } satisfies Flash))
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
