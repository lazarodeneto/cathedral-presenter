import { createRequire } from 'node:module'
import { describe, expect, it, vi } from 'vitest'
import {
  operatingSystem,
  reconcilePhysicalDisplays,
  type PhysicalDisplay,
} from '../providers/output/desktop'
import { buildOutputSnapshot } from '../store/outputState'
import { DEFAULT_BRANDING, useAppStore } from '../store/useAppStore'
const { createDisplayManager } = createRequire(import.meta.url)('../../desktop/display-manager.cjs')

function fixture() {
  let connected = Array.from({ length: 5 }, (_, id) => ({
    id: id + 1,
    label: `Screen ${id + 1}`,
    scaleFactor: 1,
    size: { width: 1920, height: 1080 },
    bounds: { x: (id - 1) * 1920, y: 0, width: 1920, height: 1080 },
  }))
  const made: Array<{
    id: string
    role: string
    bounds: { x: number }
    close: ReturnType<typeof vi.fn>
    setBounds: ReturnType<typeof vi.fn>
  }> = []
  const notify = vi.fn()
  const roles: Record<string, string> = {
    2: 'audience',
    3: 'audience',
    4: 'confidence',
    5: 'broadcast',
  }
  const manager = createDisplayManager({
    screen: { getAllDisplays: () => connected, getPrimaryDisplay: () => connected[0] },
    getOperatorDisplayId: () => 1,
    roles,
    saveRoles: vi.fn(),
    notify,
    createWindow: (options: { id: string; role: string; bounds: { x: number } }) => {
      const item = {
        ...options,
        close: vi.fn(),
        setBounds: vi.fn(),
        isDestroyed: () => false,
        on: vi.fn(),
      }
      made.push(item)
      return item
    },
  })
  return {
    manager,
    made,
    roles,
    notify,
    mirror: () => {
      connected[1].bounds = { ...connected[0].bounds }
    },
    remove: (id: number) => {
      connected = connected.filter((display) => display.id !== id)
    },
  }
}

describe('physical display routing', () => {
  it('detects five screens and creates four independent output windows without covering the operator', () => {
    const { manager, made } = fixture()
    expect(manager.list()).toHaveLength(5)
    expect(manager.open('1')).toBe(false)
    for (const id of ['2', '3', '4', '5']) expect(manager.open(id)).toBe(true)
    expect(made.map((output) => output.id)).toEqual(['2', '3', '4', '5'])
    expect(made.map((output) => output.role)).toEqual([
      'audience',
      'audience',
      'confidence',
      'broadcast',
    ])
    expect(manager.open('2')).toBe(true)
    expect(made).toHaveLength(4)
  })
  it('opens all screens for a role and rejects operator or invalid assignments', () => {
    const { manager, made } = fixture()
    expect(manager.openRole('audience')).toBe(true)
    expect(made.map((output) => output.id)).toEqual(['2', '3'])
    expect(() => manager.setRole('1', 'audience')).toThrow('Operator display is reserved')
    expect(() => manager.setRole('2', 'shell')).toThrow('Invalid display assignment')
    expect(manager.open('999')).toBe(false)
  })
  it('closes a disconnected output without moving it to another screen', () => {
    const { manager, made, remove } = fixture()
    manager.openRole('audience')
    remove(2)
    manager.refresh()
    expect(made[0].close).toHaveBeenCalledOnce()
    expect(made[0].setBounds).not.toHaveBeenCalled()
    expect(made[1].close).not.toHaveBeenCalled()
  })
  it('refuses mirrored outputs that overlap the operator display', () => {
    const { manager, made, mirror } = fixture()
    mirror()
    expect(manager.list()[1].operator).toBe(true)
    expect(manager.open('2')).toBe(false)
    expect(() => manager.setRole('2', 'audience')).toThrow('Operator display is reserved')
    expect(made).toHaveLength(0)
  })
  it('can route the audience feed to four TVs at once', () => {
    const { manager, made } = fixture()
    for (const id of ['2', '3', '4', '5']) manager.setRole(id, 'audience')
    expect(manager.openRole('audience')).toBe(true)
    expect(made.map((output) => output.id)).toEqual(['2', '3', '4', '5'])
  })
  it('preserves disconnected assignments and labels the operator as unavailable for output', () => {
    const displays: PhysicalDisplay[] = [
      {
        id: '1',
        name: 'Laptop',
        width: 2560,
        height: 1600,
        bounds: { x: -1280, y: 0, width: 1280, height: 800 },
        scaleFactor: 2,
        primary: true,
        operator: true,
        role: 'audience',
        open: false,
      },
    ]
    const previous = [
      {
        id: 'display-2',
        displayId: '2',
        name: 'TV',
        displayName: 'TV',
        role: 'audience' as const,
        status: 'ready' as const,
        width: 1920,
        height: 1080,
        simulated: false,
        fullscreen: true,
      },
    ]
    const next = reconcilePhysicalDisplays(previous, displays)
    expect(next[0]).toMatchObject({ role: 'disabled', isOperator: true, simulated: false })
    expect(next[1]).toMatchObject({ status: 'disconnected', role: 'audience' })
  })
  it('isolates a test pattern to the selected physical display', () => {
    const monitors = ['2', '3'].map((id) => ({
      id: `display-${id}`,
      displayId: id,
      name: `TV ${id}`,
      displayName: `TV ${id}`,
      role: 'audience' as const,
      status: 'ready' as const,
      width: 1920,
      height: 1080,
      fullscreen: true,
      simulated: false,
    }))
    const snapshot = buildOutputSnapshot({
      service: null,
      live: null,
      monitors,
      branding: DEFAULT_BRANDING,
      testMonitorId: 'display-2',
    })
    expect(snapshot.displays?.['2'].test).toBe(true)
    expect(snapshot.displays?.['3'].test).toBe(false)
    expect(snapshot.audience.mode).toBe('idle')
  })
  it('allows more than one physical audience output in the workspace', () => {
    const original = useAppStore.getState().monitors
    const monitors = reconcilePhysicalDisplays([], fixture().manager.list())
    useAppStore.setState({ monitors })
    useAppStore.getState().assignMonitorRole('display-2', 'audience')
    useAppStore.getState().assignMonitorRole('display-3', 'audience')
    expect(
      useAppStore.getState().monitors.filter((monitor) => monitor.role === 'audience'),
    ).toHaveLength(2)
    useAppStore.setState({ monitors: original })
  })
})

it('detects Windows and macOS from the native runtime', () => {
  const previous = window.cathedralDesktop
  try {
    window.cathedralDesktop = { platform: 'win32' } as NonNullable<Window['cathedralDesktop']>
    expect(operatingSystem()).toBe('Windows')
    window.cathedralDesktop = { platform: 'darwin' } as NonNullable<Window['cathedralDesktop']>
    expect(operatingSystem()).toBe('macOS')
  } finally {
    window.cathedralDesktop = previous
  }
})
