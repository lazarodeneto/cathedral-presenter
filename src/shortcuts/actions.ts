/**
 * Every keyboard shortcut the app supports. Handlers are not defined here:
 * each screen registers the actions it already owns (see registry.ts), so a
 * shortcut always runs the same code as the matching button.
 *
 * Contexts
 * - global: every screen of the operator window (not output windows).
 * - editor: the service editor.
 * - presentation: the live console, and output windows (keys are relayed).
 *
 * When one key matches actions in several active contexts, the more specific
 * context wins: presentation or editor before global.
 */

export type ShortcutContext = 'global' | 'editor' | 'presentation'
export type ShortcutCategory = 'presentation' | 'timer' | 'editing' | 'navigation'

export interface ShortcutAction {
  id: string
  category: ShortcutCategory
  /** Contexts where the shortcut is active. */
  contexts: ShortcutContext[]
  defaults: string[]
  /** Fixed shortcuts follow platform convention and cannot be changed. */
  customizable: boolean
  /** Also fires while typing in a text field (only for combos with Mod/Ctrl/Alt). */
  allowInInputs?: boolean
  /** Fires repeatedly while the key is held. */
  repeat?: boolean
}

export const SHORTCUT_ACTIONS: ShortcutAction[] = [
  { id: 'live.next', category: 'presentation', contexts: ['presentation'], defaults: ['ArrowRight', 'Space'], customizable: true, repeat: true },
  { id: 'live.prev', category: 'presentation', contexts: ['presentation'], defaults: ['ArrowLeft'], customizable: true, repeat: true },
  { id: 'live.first', category: 'presentation', contexts: ['presentation'], defaults: ['Home'], customizable: true },
  { id: 'live.last', category: 'presentation', contexts: ['presentation'], defaults: ['End'], customizable: true },
  { id: 'live.blank', category: 'presentation', contexts: ['presentation'], defaults: ['B'], customizable: true },
  { id: 'live.freeze', category: 'presentation', contexts: ['presentation'], defaults: ['F'], customizable: true },
  { id: 'live.message', category: 'presentation', contexts: ['presentation'], defaults: ['M'], customizable: true },
  { id: 'live.jump', category: 'presentation', contexts: ['presentation'], defaults: ['J'], customizable: true },
  { id: 'live.exit', category: 'presentation', contexts: ['presentation'], defaults: ['Escape'], customizable: true },
  { id: 'editor.present', category: 'presentation', contexts: ['editor'], defaults: ['Mod+Enter'], customizable: true },

  { id: 'timer.start', category: 'timer', contexts: ['editor', 'presentation'], defaults: ['T'], customizable: true },
  { id: 'timer.pause', category: 'timer', contexts: ['editor', 'presentation'], defaults: ['Shift+T'], customizable: true },
  { id: 'timer.reset', category: 'timer', contexts: ['editor', 'presentation'], defaults: ['Alt+T'], customizable: true },

  { id: 'app.save', category: 'editing', contexts: ['global'], defaults: ['Mod+S'], customizable: true, allowInInputs: true },
  { id: 'app.undo', category: 'editing', contexts: ['editor'], defaults: ['Mod+Z'], customizable: false },
  { id: 'app.redo', category: 'editing', contexts: ['editor'], defaults: ['Mod+Shift+Z'], customizable: false },

  { id: 'app.search', category: 'navigation', contexts: ['global'], defaults: ['Mod+K'], customizable: true, allowInInputs: true },
  { id: 'app.songs', category: 'navigation', contexts: ['global'], defaults: ['Alt+S'], customizable: true },
  { id: 'app.fullscreen', category: 'navigation', contexts: ['global', 'presentation'], defaults: ['Shift+F'], customizable: true },
]

export const SHORTCUT_CATEGORIES: ShortcutCategory[] = ['presentation', 'timer', 'editing', 'navigation']

export const ACTION_BY_ID = new Map(SHORTCUT_ACTIONS.map((action) => [action.id, action]))

export type ShortcutOverrides = Record<string, string[]>
