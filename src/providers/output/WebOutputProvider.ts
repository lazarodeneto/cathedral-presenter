import type { MonitorRole } from '../../types'
import { ASPECT_RATIO, outputFormat } from '../../utils/outputFormats'
import type { OutputProvider, OutputSnapshot } from './OutputProvider'

const CHANNEL = 'church-presenter-output-v1'
const STORAGE_KEY = 'church-presenter:output-snapshot:v1'
const WINDOW_NAMES: Record<Exclude<MonitorRole, 'disabled'>, string> = {
  audience: 'church-presenter-audience',
  confidence: 'church-presenter-confidence',
  broadcast: 'church-presenter-broadcast',
}

type ChannelMessage =
  | { type: 'snapshot'; snapshot: OutputSnapshot }
  | { type: 'hello' }
  /** A shortcut pressed in an output window, run by the operator window. */
  | { type: 'command'; actionId: string }

class WebOutputProvider implements OutputProvider {
  readonly id = 'web-output'
  readonly label = 'Simulated display output · browser prototype'
  private channel: BroadcastChannel | null = null
  private listeners = new Set<(snapshot: OutputSnapshot) => void>()
  private commandListeners = new Set<(actionId: string) => void>()
  private windows = new Map<string, Window | null>()

  private getChannel(): BroadcastChannel | null {
    if (typeof BroadcastChannel === 'undefined') return null
    if (!this.channel) {
      this.channel = new BroadcastChannel(CHANNEL)
      this.channel.onmessage = (event: MessageEvent<ChannelMessage>) => {
        if (event.data?.type === 'snapshot') {
          for (const listener of this.listeners) listener(event.data.snapshot)
        }
        if (event.data?.type === 'command' && typeof event.data.actionId === 'string') {
          for (const listener of this.commandListeners) listener(event.data.actionId)
        }
      }
    }
    return this.channel
  }

  async listMonitors(): Promise<never[]> {
    // Display enumeration belongs in the desktop shell. The web adapter uses
    // simulated monitors from local settings instead of pretending to detect
    // physical displays.
    return []
  }

  openOutput(role: Exclude<MonitorRole, 'disabled'>): boolean {
    if (typeof window === 'undefined') return false
    const existing = this.windows.get(role)
    if (existing && !existing.closed) {
      existing.focus()
      return true
    }
    const base = `${window.location.origin}${window.location.pathname}`
    const url = `${base}#/output/${role}`
    // Open the window in the projection proportion, so the preview has no black bars.
    const snapshot = this.readSnapshot()
    const ratio = ASPECT_RATIO[outputFormat(role === 'broadcast' ? snapshot?.broadcast?.format : snapshot?.audience.format).aspect]
    const width = 1280
    const height = Math.round(width / ratio)
    const opened = window.open(
      url,
      WINDOW_NAMES[role],
      `popup=yes,width=${width},height=${height},menubar=no,toolbar=no,location=no,status=no`,
    )
    this.windows.set(role, opened)
    return Boolean(opened)
  }

  closeOutput(role: Exclude<MonitorRole, 'disabled'>): void {
    const existing = this.windows.get(role)
    if (existing && !existing.closed) existing.close()
    this.windows.delete(role)
  }

  publish(snapshot: OutputSnapshot): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
    } catch {
      // Large inline media can exceed the storage quota. BroadcastChannel is
      // still used below and the output window re-syncs on the next heartbeat.
    }
    const channel = this.getChannel()
    channel?.postMessage({ type: 'snapshot', snapshot } satisfies ChannelMessage)
  }

  /** Relay a shortcut pressed in an output window to the operator window. */
  sendCommand(actionId: string): void {
    this.getChannel()?.postMessage({ type: 'command', actionId } satisfies ChannelMessage)
  }

  onCommand(listener: (actionId: string) => void): () => void {
    this.commandListeners.add(listener)
    this.getChannel()
    return () => {
      this.commandListeners.delete(listener)
    }
  }

  readSnapshot(): OutputSnapshot | null {
    if (typeof localStorage === 'undefined') return null
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as OutputSnapshot) : null
    } catch {
      return null
    }
  }

  subscribe(listener: (snapshot: OutputSnapshot) => void): () => void {
    this.listeners.add(listener)
    this.getChannel()

    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return
      try {
        listener(JSON.parse(event.newValue) as OutputSnapshot)
      } catch {
        // Ignore malformed local snapshots.
      }
    }
    window.addEventListener('storage', onStorage)

    return () => {
      this.listeners.delete(listener)
      window.removeEventListener('storage', onStorage)
    }
  }

  async requestFullscreen(): Promise<boolean> {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
        return true
      }
      await document.exitFullscreen()
      return false
    } catch {
      return false
    }
  }
}

export const webOutputProvider = new WebOutputProvider()
