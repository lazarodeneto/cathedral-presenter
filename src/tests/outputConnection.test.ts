import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WebOutputProvider } from '../providers/output/WebOutputProvider'
import { buildOutputSnapshot } from '../store/outputState'
import { useAppStore } from '../store/useAppStore'
import type { DesktopDisplays, PhysicalDisplay } from '../providers/output/desktop'

class Bus {
  static channels = new Set<Bus>()
  onmessage: ((event: { data: unknown }) => void) | null = null
  constructor() { Bus.channels.add(this) }
  postMessage(data: unknown) { for (const channel of Bus.channels) if (channel !== this) channel.onmessage?.({ data }) }
  close() { Bus.channels.delete(this) }
  static deliver(data: unknown) { for (const channel of Bus.channels) channel.onmessage?.({ data }) }
}
const state = useAppStore.getState()
const snapshot = () => buildOutputSnapshot({ service: null, live: null, monitors: [], branding: state.branding, testMonitorId: null })
const display = (id: string, operator: boolean, role: PhysicalDisplay['role'] = 'disabled'): PhysicalDisplay => ({ id, name: id, operator, role, primary: operator, open: false, width: 1920, height: 1080, scaleFactor: 1, bounds: { x: operator ? 0 : 1920, y: 0, width: 1920, height: 1080 } })
const providers: WebOutputProvider[] = []
const make = () => { const provider = new WebOutputProvider(); providers.push(provider); return provider }
beforeEach(() => { vi.stubGlobal('BroadcastChannel', Bus); vi.stubGlobal('EventSource', undefined); delete window.cathedralDesktop })
afterEach(() => { for (const provider of providers.splice(0)) provider.dispose(); Bus.channels.clear(); delete window.cathedralDesktop; vi.unstubAllGlobals() })

describe('output connection lifecycle', () => {
  it('assigns a single external TV and waits for its mounted renderer before allowing live', async () => {
    const operator = make(), output = make()
    operator.publish(snapshot())
    let displays = [display('operator', true), display('tv', false)]
    const assign = vi.fn(async (id, role) => { displays = displays.map((item) => item.id === id ? { ...item, role } : item); return displays })
    window.cathedralDesktop = {
      platform: 'win32', listDisplays: async () => displays, setDisplayRole: assign,
      openRole: vi.fn(async () => { output.subscribe((next) => output.acknowledge(next, 'audience', 'tv')); return true }),
    } as unknown as DesktopDisplays
    expect(await operator.prepareAudience()).toBe('ready')
    expect(assign).toHaveBeenCalledWith('tv', 'audience')
    expect(operator.audienceConnected(['tv'])).toBe(true)
    expect(operator.audienceConnected(['another-tv'])).toBe(false)
  })
  it('never guesses between multiple unassigned screens or changes a confidence screen', async () => {
    window.cathedralDesktop = { listDisplays: async () => [display('op', true), display('tv1', false), display('tv2', false)] } as DesktopDisplays
    expect(await make().prepareAudience()).toBe('chooseDisplays')
    window.cathedralDesktop.listDisplays = async () => [display('op', true), display('stage', false, 'confidence')]
    expect(await make().prepareAudience()).toBe('chooseDisplays')
    window.cathedralDesktop.listDisplays = async () => [display('op', true)]
    expect(await make().prepareAudience()).toBe('noDisplay')
  })
  it('resynchronizes a new output even when local storage cannot hold the snapshot', () => {
    const operator = make(), output = make()
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => { throw new Error('quota') })
    const sent = snapshot()
    operator.publish(sent)
    const received = vi.fn()
    output.subscribe(received)
    expect(received).toHaveBeenCalledWith(expect.objectContaining({ audience: sent.audience }))
    vi.restoreAllMocks()
  })
  it('ignores delayed snapshots and runs relayed keyboard commands only once', () => {
    const operator = make(), received = vi.fn(), command = vi.fn()
    operator.subscribe(received); operator.onCommand(command)
    Bus.deliver({ type: 'snapshot', snapshot: { ...snapshot(), transport: { publisher: 'source', sequence: 2 } } })
    Bus.deliver({ type: 'snapshot', snapshot: { ...snapshot(), transport: { publisher: 'source', sequence: 1 } } })
    expect(received).toHaveBeenCalledTimes(1)
    const message = { type: 'command', actionId: 'live.next', eventId: 'same-shortcut' }
    Bus.deliver(message); Bus.deliver(message)
    expect(command).toHaveBeenCalledTimes(1)
  })
})
