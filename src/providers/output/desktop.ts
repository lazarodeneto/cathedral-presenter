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
  reportReady?(): void
  openMediaBrowser?(): Promise<void>
  readonly platform: 'darwin' | 'win32' | 'linux'
  listDisplays(): Promise<PhysicalDisplay[]>
  setDisplayRole(id: string, role: MonitorRole): Promise<PhysicalDisplay[]>
  openDisplay(id: string): Promise<boolean>
  closeDisplay(id: string): Promise<PhysicalDisplay[]>
  openRole(role: Exclude<MonitorRole, 'disabled'>): Promise<boolean>
  closeRole(role: Exclude<MonitorRole, 'disabled'>): Promise<void>
  onDisplaysChanged(listener: (displays: PhysicalDisplay[]) => void): () => void
  checkForUpdate?(): Promise<UpdateResult>
  downloadUpdate?(): Promise<UpdateResult>
  installUpdate?(): Promise<UpdateResult>
  onUpdateStatus?(listener: (status: UpdateStatus) => void): () => void
}
export type UpdateState = 'idle' | 'checking' | 'current' | 'available' | 'downloading' | 'downloaded' | 'installing' | 'unsupported' | 'error'
export interface UpdateStatus { state: UpdateState; version?: string; percent?: number; message?: string }
export interface UpdateResult extends UpdateStatus {}
declare global {
  interface Window {
    cathedralDesktop?: DesktopDisplays
  }
}

/** Current OS ids stay independent; historical reconnects are grouped by device label. */
export function reconcilePhysicalDisplays(
  previous: Monitor[],
  displays: PhysicalDisplay[],
): Monitor[] {
  const current = [...new Map(displays.map((display) => [display.id, display])).values()].map((display): Monitor => ({
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
  const label = (name: string) => name.normalize('NFKC').trim().toLocaleLowerCase().replace(/\s+/g, ' ')
  const activeNames = new Set(current.map((monitor) => label(monitor.name)))
  const history = new Map<string, Monitor>()
  for (const monitor of previous) {
    const key = label(monitor.name)
    if (monitor.simulated || connected.has(monitor.id) || activeNames.has(key) || history.has(key)) continue
    // Resolution and AirPlay session ids can change for one TV. They do not
    // create additional history entries. Active same-model TVs are kept above.
    history.set(key, { ...monitor, status: 'disconnected', outputOpen: false })
  }
  return [
    ...current,
    ...history.values(),
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
