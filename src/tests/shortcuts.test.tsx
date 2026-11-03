import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { comboFromEvent, comboParts, comboProblem, formatCombo, normalizeCombo, speakCombo } from '../shortcuts/keys'
import {
  assignShortcut,
  disableShortcut,
  findConflict,
  normalizeOverrides,
  resetShortcut,
  resolveBindings,
  shortcutStatus,
} from '../shortcuts/bindings'
import { ACTION_BY_ID } from '../shortcuts/actions'
import {
  dispatchShortcut,
  installShortcutListener,
  registeredLayerCount,
  registerShortcutHandlers,
  runShortcutAction,
  useShortcutHandlers,
} from '../shortcuts/registry'
import { ShortcutSettings } from '../components/settings/ShortcutSettings'
import { useAppStore, DEFAULT_SETTINGS } from '../store/useAppStore'
import { clearHistory, redo, startHistory, undo } from '../store/history'
import { buildBackup, parseBackup } from '../security/backup'
import { createServiceSkeleton } from '../store/serviceUtils'
import { DEFAULT_BRANDING } from '../utils/branding'

const key = (key: string, mods: Partial<{ meta: boolean; ctrl: boolean; alt: boolean; shift: boolean }> = {}, code?: string) => ({
  key,
  code,
  metaKey: Boolean(mods.meta),
  ctrlKey: Boolean(mods.ctrl),
  altKey: Boolean(mods.alt),
  shiftKey: Boolean(mods.shift),
})

afterEach(cleanup)

describe('key combination parsing and display', () => {
  it('maps ⌘ on macOS and Ctrl elsewhere to the same Mod combination', () => {
    expect(comboFromEvent(key('k', { meta: true }), 'mac')).toBe('Mod+K')
    expect(comboFromEvent(key('k', { ctrl: true }), 'other')).toBe('Mod+K')
    expect(comboFromEvent(key('k', { ctrl: true }), 'mac')).toBe('Ctrl+K')
    expect(comboFromEvent(key('k', { meta: true }), 'other')).toBe('Meta+K')
  })

  it('normalizes keys, modifier order and layout-changed characters', () => {
    expect(comboFromEvent(key('S', { shift: true, meta: true, alt: true }, 'KeyS'), 'mac')).toBe('Mod+Alt+Shift+S')
    // ⌥S types ß on macOS; the physical key is used instead.
    expect(comboFromEvent(key('ß', { alt: true }, 'KeyS'), 'mac')).toBe('Alt+S')
    // Shift+1 types "!"; the digit is used.
    expect(comboFromEvent(key('!', { shift: true }, 'Digit1'), 'other')).toBe('Shift+1')
    expect(comboFromEvent(key(' ', {}, 'Space'), 'mac')).toBe('Space')
    expect(comboFromEvent(key('ArrowRight'), 'mac')).toBe('ArrowRight')
    expect(comboFromEvent(key('Shift', { shift: true }), 'mac')).toBeNull()
    expect(normalizeCombo('shift+mod+k')).toBe('Mod+Shift+K')
    expect(normalizeCombo('Mod+Mod+K')).toBeNull()
    expect(normalizeCombo('Hyper+K')).toBeNull()
  })

  it('formats for each platform', () => {
    expect(formatCombo('Mod+Shift+K', 'mac')).toBe('⇧⌘K')
    expect(formatCombo('Mod+Shift+K', 'other')).toBe('Ctrl+Shift+K')
    expect(comboParts('Alt+ArrowLeft', 'other')).toEqual(['Alt', '←'])
    expect(speakCombo('Mod+K', 'mac')).toBe('Command K')
  })

  it('refuses browser, system and text-editing combinations', () => {
    expect(comboProblem('Mod+W')).toBe('reserved')
    expect(comboProblem('Alt+F4')).toBe('reserved')
    expect(comboProblem('Tab')).toBe('reserved')
    expect(comboProblem('Mod+C')).toBe('text-editing')
    expect(comboProblem('Mod+Shift+L')).toBeNull()
  })
})

describe('bindings, conflicts and reset', () => {
  it('detects conflicts where both actions are active, and allows them across separate contexts', () => {
    expect(findConflict('live.blank', 'F', {})?.id).toBe('live.freeze')
    // Editor and presentation are never active together: sharing is fine.
    expect(findConflict('editor.present', 'J', {})).toBeNull()
    // A global action conflicts with every context.
    expect(findConflict('app.songs', 'B', {})?.id).toBe('live.blank')
  })

  it('refuses a conflicting assignment unless reassignment is confirmed', () => {
    expect(assignShortcut({}, 'live.blank', 'F')).toMatchObject({ ok: false, reason: 'conflict', conflict: { id: 'live.freeze' } })
    const result = assignShortcut({}, 'live.blank', 'F', { reassign: true })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(resolveBindings(result.overrides)['live.blank']).toEqual(['F'])
      expect(resolveBindings(result.overrides)['live.freeze']).toEqual([])
    }
  })

  it('refuses fixed actions and reserved keys', () => {
    expect(assignShortcut({}, 'app.undo', 'U')).toMatchObject({ ok: false, reason: 'fixed' })
    expect(assignShortcut({}, 'live.blank', 'Mod+W')).toMatchObject({ ok: false, reason: 'reserved' })
    expect(assignShortcut({}, 'live.blank', 'nonsense+')).toMatchObject({ ok: false, reason: 'invalid' })
  })

  it('disables, resets one, and reports status', () => {
    const custom = assignShortcut({}, 'live.blank', 'K')
    expect(custom.ok && shortcutStatus(ACTION_BY_ID.get('live.blank')!, custom.overrides)).toBe('custom')
    const off = disableShortcut({}, 'live.blank')
    expect(shortcutStatus(ACTION_BY_ID.get('live.blank')!, off)).toBe('disabled')
    expect(resolveBindings(off)['live.blank']).toEqual([])
    expect(resetShortcut(off, 'live.blank')).toEqual({ ok: true, overrides: {} })
    expect(shortcutStatus(ACTION_BY_ID.get('app.redo')!, {})).toBe('fixed')
  })

  it('will not reset to a default that another action has taken', () => {
    const moved = assignShortcut({}, 'live.freeze', 'B', { reassign: true })
    expect(moved.ok).toBe(true)
    if (moved.ok) expect(resetShortcut(moved.overrides, 'live.blank')).toMatchObject({ ok: false, conflict: { id: 'live.freeze' } })
  })

  it('repairs saved data: drops unknown, fixed, invalid and clashing entries, keeps valid ones', () => {
    expect(normalizeOverrides(null)).toEqual({})
    expect(normalizeOverrides('nope')).toEqual({})
    expect(
      normalizeOverrides({
        'live.blank': ['k'],
        'live.next': ['ArrowRight'],
        'removed.action': ['X'],
        'app.undo': ['U'],
        'live.jump': ['Mod+W'],
        'live.freeze': ['K'],
        'live.message': [],
      }),
    ).toEqual({ 'live.blank': ['K'], 'live.next': ['ArrowRight'], 'live.message': [] })
  })
})

describe('dispatch and contexts', () => {
  const ev = (combo: Parameters<typeof key>, target?: EventTarget, extra: Record<string, unknown> = {}) => ({
    ...key(...combo),
    target: target ?? document.body,
    preventDefault: vi.fn(),
    ...extra,
  })
  const config = { overrides: {}, enabled: true, platform: 'mac' as const }
  let cleanups: (() => void)[] = []
  afterEach(() => {
    cleanups.forEach((fn) => fn())
    cleanups = []
  })

  it('runs the handler of the active context and prevents the browser default', () => {
    const next = vi.fn()
    cleanups.push(registerShortcutHandlers('presentation', { 'live.next': next }))
    const event = ev(['ArrowRight'])
    expect(dispatchShortcut(event, config)).toBe('live.next')
    expect(next).toHaveBeenCalledOnce()
    expect(event.preventDefault).toHaveBeenCalled()
    // Without the presentation screen on screen, nothing happens.
    cleanups.pop()!()
    expect(dispatchShortcut(ev(['ArrowRight']), config)).toBeNull()
  })

  it('does not interrupt typing, dialogs or focused buttons', () => {
    const blank = vi.fn()
    const save = vi.fn()
    cleanups.push(registerShortcutHandlers('presentation', { 'live.blank': blank, 'live.next': vi.fn() }))
    cleanups.push(registerShortcutHandlers('global', { 'app.save': save }))
    const input = document.createElement('input')
    expect(dispatchShortcut(ev(['b'], input), config)).toBeNull()
    expect(blank).not.toHaveBeenCalled()
    // Save is allowed while typing because it uses a modifier.
    expect(dispatchShortcut(ev(['s', { meta: true }], input), config)).toBe('app.save')
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    const inside = document.createElement('button')
    dialog.append(inside)
    expect(dispatchShortcut(ev(['b'], inside), config)).toBeNull()
    expect(dispatchShortcut(ev([' ', {}, 'Space'], document.createElement('button')), config)).toBeNull()
    expect(dispatchShortcut(ev(['b'], document.body, { defaultPrevented: true }), config)).toBeNull()
    expect(dispatchShortcut(ev(['b']), { ...config, enabled: false })).toBeNull()
  })

  it('prefers the specific context over global when both match', () => {
    const fullscreenGlobal = vi.fn()
    const fullscreenOutput = vi.fn()
    cleanups.push(registerShortcutHandlers('global', { 'app.fullscreen': fullscreenGlobal }))
    cleanups.push(registerShortcutHandlers('presentation', { 'app.fullscreen': fullscreenOutput }))
    expect(dispatchShortcut(ev(['F', { shift: true }]), config)).toBe('app.fullscreen')
    expect(fullscreenOutput).toHaveBeenCalled()
    expect(fullscreenGlobal).not.toHaveBeenCalled()
  })

  it('lets a handler decline so the key passes through, and skips held keys for non-repeating actions', () => {
    const start = vi.fn(() => false as const)
    const blank = vi.fn()
    cleanups.push(registerShortcutHandlers('editor', { 'timer.start': start }))
    cleanups.push(registerShortcutHandlers('presentation', { 'live.blank': blank }))
    const event = ev(['t'])
    expect(dispatchShortcut(event, config)).toBeNull()
    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(dispatchShortcut(ev(['b'], document.body, { repeat: true }), config)).toBeNull()
  })

  it('uses customized keys', () => {
    const blank = vi.fn()
    cleanups.push(registerShortcutHandlers('presentation', { 'live.blank': blank }))
    const custom = { ...config, overrides: { 'live.blank': ['K'] } }
    expect(dispatchShortcut(ev(['b']), custom)).toBeNull()
    expect(dispatchShortcut(ev(['k']), custom)).toBe('live.blank')
  })

  it('runs relayed actions from output windows', () => {
    const next = vi.fn()
    cleanups.push(registerShortcutHandlers('presentation', { 'live.next': next }))
    expect(runShortcutAction('live.next')).toBe(true)
    expect(next).toHaveBeenCalled()
  })

  it('registers and removes its listener and handlers cleanly', () => {
    const add = vi.spyOn(window, 'addEventListener')
    const remove = vi.spyOn(window, 'removeEventListener')
    const uninstall = installShortcutListener(() => config)
    const handler = add.mock.calls.find(([type]) => type === 'keydown')![1]
    uninstall()
    expect(remove).toHaveBeenCalledWith('keydown', handler)
    add.mockRestore()
    remove.mockRestore()

    const before = registeredLayerCount()
    function Screen() {
      useShortcutHandlers('editor', { 'editor.present': () => undefined })
      return null
    }
    const view = render(<Screen />)
    expect(registeredLayerCount()).toBe(before + 1)
    view.unmount()
    expect(registeredLayerCount()).toBe(before)
  })
})

describe('persistence', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({ settings: { ...DEFAULT_SETTINGS } })
  })

  it('restores customized shortcuts after reload and falls back for invalid data', async () => {
    useAppStore.getState().updateSettings({ shortcutOverrides: { 'live.blank': ['K'] } })
    const stored = JSON.parse(localStorage.getItem('church-presenter:workspace:v1')!)
    stored.state.settings.shortcutOverrides['live.freeze'] = ['Mod+Q']
    stored.state.settings.shortcutOverrides['old.removed'] = ['X']
    useAppStore.setState({ settings: { ...DEFAULT_SETTINGS } })
    localStorage.setItem('church-presenter:workspace:v1', JSON.stringify(stored))
    await useAppStore.persist.rehydrate()
    expect(useAppStore.getState().settings.shortcutOverrides).toEqual({ 'live.blank': ['K'] })
  })

  it('keeps shortcuts through backups', () => {
    const backup = buildBackup({
      services: [createServiceSkeleton({ title: 'S', date: '2026-11-01', time: '10:00', locale: 'en' })],
      settings: { ...DEFAULT_SETTINGS, shortcutOverrides: { 'live.blank': ['K'] } },
      branding: DEFAULT_BRANDING,
      monitors: [],
      media: [],
    })
    expect(parseBackup(JSON.stringify(backup)).settings?.shortcutOverrides).toEqual({ 'live.blank': ['K'] })
  })
})

describe('undo and redo', () => {
  it('undoes and redoes service edits, coalescing quick changes', () => {
    vi.useFakeTimers()
    const service = createServiceSkeleton({ title: 'Before', date: '2026-11-01', time: '10:00', locale: 'en' })
    useAppStore.setState({ services: [service], activeServiceId: service.id })
    clearHistory()
    const stop = startHistory()
    useAppStore.getState().updateServiceMeta(service.id, { title: 'After' })
    vi.advanceTimersByTime(100)
    useAppStore.getState().updateServiceMeta(service.id, { title: 'After again' })
    expect(undo()).toBe(true)
    expect(useAppStore.getState().services[0].title).toBe('Before')
    expect(redo()).toBe(true)
    expect(useAppStore.getState().services[0].title).toBe('After again')
    expect(redo()).toBe(false)
    stop()
    vi.useRealTimers()
  })
})

describe('shortcut settings screen', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({ settings: { ...DEFAULT_SETTINGS, locale: 'en' } })
  })

  const row = (name: string) => screen.getByText(name, { selector: 'strong' }).closest('li')!

  it('records a new key, saves it, and resets it', () => {
    render(<ShortcutSettings />)
    const blank = row('Blank screen')
    fireEvent.click(blank.querySelector('button')!)
    expect(blank).toHaveTextContent('Press keys…')
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', code: 'KeyK', bubbles: true }))
    })
    expect(useAppStore.getState().settings.shortcutOverrides).toEqual({ 'live.blank': ['K'] })
    expect(row('Blank screen')).toHaveTextContent('Custom')
    fireEvent.click(screen.getByRole('button', { name: 'Reset: Blank screen' }))
    expect(useAppStore.getState().settings.shortcutOverrides).toEqual({})
  })

  it('cancels recording with Escape without changing anything', () => {
    render(<ShortcutSettings />)
    fireEvent.click(row('Blank screen').querySelector('button')!)
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(useAppStore.getState().settings.shortcutOverrides).toEqual({})
    expect(row('Blank screen')).not.toHaveTextContent('Press keys…')
  })

  it('names the conflicting action and reassigns only after confirmation', () => {
    render(<ShortcutSettings />)
    fireEvent.click(row('Blank screen').querySelector('button')!)
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', code: 'KeyF', bubbles: true }))
    })
    expect(screen.getByRole('alert')).toHaveTextContent('is already used by “Freeze screen”')
    expect(useAppStore.getState().settings.shortcutOverrides).toEqual({})
    fireEvent.click(screen.getByRole('button', { name: 'Use it for Blank screen instead' }))
    expect(useAppStore.getState().settings.shortcutOverrides).toEqual({ 'live.blank': ['F'], 'live.freeze': [] })
  })

  it('rejects reserved keys with an explanation, and Tab leaves recording', () => {
    render(<ShortcutSettings />)
    fireEvent.click(row('Blank screen').querySelector('button')!)
    act(() => {
      // jsdom reports a non-Mac platform, so Ctrl is the Mod key: Ctrl+W closes tabs.
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', code: 'KeyW', ctrlKey: true, bubbles: true }))
    })
    expect(screen.getByRole('alert')).toHaveTextContent('handled by the browser or operating system')
    expect(useAppStore.getState().settings.shortcutOverrides).toEqual({})

    fireEvent.click(row('Blank screen').querySelector('button')!)
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    })
    expect(row('Blank screen')).not.toHaveTextContent('Press keys…')
  })

  it('filters by name and resets everything after confirmation', () => {
    useAppStore.getState().updateSettings({ shortcutOverrides: { 'live.blank': ['K'] } })
    render(<ShortcutSettings />)
    fireEvent.change(screen.getByLabelText('Search shortcuts'), { target: { value: 'timer' } })
    expect(screen.queryByText('Blank screen')).toBeNull()
    expect(screen.getByText('Pause timer')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Search shortcuts'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /Reset all/ }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Reset all' }).at(-1)!)
    expect(useAppStore.getState().settings.shortcutOverrides).toEqual({})
  })
})
