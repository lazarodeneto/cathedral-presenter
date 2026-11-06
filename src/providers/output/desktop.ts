import type { Monitor, MonitorRole } from '../../types'

export interface PhysicalDisplay {
  id: string
  name: string
  width: number
  height: number
  bounds: { x: number; y: number; width: number; height: number }
  scaleFactor: number
  primary: boolean
  operator: boolean
  role: MonitorRole
  open: boolean
}
export interface DesktopDisplays {
  readonly platform: 'darwin' | 'win32' | 'linux'
  listDisplays(): Promise<PhysicalDisplay[]>
  setDisplayRole(id: string, role: MonitorRole): Promise<PhysicalDisplay[]>
  openDisplay(id: string): Promise<boolean>
  closeDisplay(id: string): Promise<PhysicalDisplay[]>
  openRole(role: Exclude<MonitorRole, 'disabled'>): Promise<boolean>
  closeRole(role: Exclude<MonitorRole, 'disabled'>): Promise<void>
  onDisplaysChanged(listener: (displays: PhysicalDisplay[]) => void): () => void
}
declare global {
  interface Window {
    cathedralDesktop?: DesktopDisplays
  }
}

/** Preserve disconnected assignments; never replace them with simulated displays. */
export function reconcilePhysicalDisplays(
  previous: Monitor[],
  displays: PhysicalDisplay[],
): Monitor[] {
  const current = displays.map((display): Monitor => ({
    id: `display-${display.id}`,
    displayId: display.id,
    name: display.name,
    displayName: display.name,
    role: display.operator ? 'disabled' : display.role,
    status: 'ready',
    width: display.width,
    height: display.height,
    fullscreen: true,
    simulated: false,
    isOperator: display.operator,
    primary: display.primary,
    outputOpen: display.open,
  }))
  const connected = new Set(current.map((display) => display.id))
  return [
    ...current,
    ...previous
      .filter((monitor) => !monitor.simulated && !connected.has(monitor.id))
      .map((monitor): Monitor => ({ ...monitor, status: 'disconnected', outputOpen: false })),
  ]
}

/** Native platform is authoritative; browser detection is a display-only hint. */
export function operatingSystem(): 'macOS' | 'Windows' | 'Linux' | 'Unknown' {
  const native = window.cathedralDesktop?.platform
  if (native) return native === 'darwin' ? 'macOS' : native === 'win32' ? 'Windows' : 'Linux'
  const platform =
    (navigator as Navigator & { userAgentData?: { platform: string } }).userAgentData?.platform ||
    navigator.platform
  if (/win/i.test(platform)) return 'Windows'
  if (/mac/i.test(platform) && navigator.maxTouchPoints < 2) return 'macOS'
  if (/linux/i.test(platform)) return 'Linux'
  return 'Unknown'
}
