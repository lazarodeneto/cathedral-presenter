import type {
  AudienceOutputState,
  ConfidenceOutputState,
  Monitor,
  MonitorRole,
  TimerRuntime,
} from '../../types'

export interface OutputSnapshot {
  audience: AudienceOutputState
  confidence: ConfidenceOutputState
  /** Countdown state for timer slides currently on any output, keyed by slide id. */
  timers?: Record<string, TimerRuntime>
}

/**
 * Output boundary used by the web prototype. A Tauri/Electron adapter can
 * enumerate real displays, create borderless fullscreen windows on the
 * selected monitor, and fail closed when a display disconnects. The UI must
 * never call native APIs directly.
 */
export interface OutputProvider {
  readonly id: string
  readonly label: string
  listMonitors(): Promise<Monitor[]>
  openOutput(role: Exclude<MonitorRole, 'disabled'>): boolean
  closeOutput(role: Exclude<MonitorRole, 'disabled'>): void
  publish(snapshot: OutputSnapshot): void
  readSnapshot(): OutputSnapshot | null
  subscribe(listener: (snapshot: OutputSnapshot) => void): () => void
  requestFullscreen(): Promise<boolean>
}
