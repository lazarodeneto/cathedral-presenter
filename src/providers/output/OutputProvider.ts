import type { OutputFormatId } from '../../utils/outputFormats'
import type {
  AudienceOutputState,
  ConfidenceOutputState,
  Monitor,
  MonitorRole,
  TimerRuntime,
} from '../../types'

export interface OutputSnapshot {
  frozenAt?: number
  media?: import('../../media/playback').MediaSession
  audioDisplayId?: string
  revision?: string
  transport?: { publisher: string; sequence: number }
  displays?: Record<string, { name: string; role: MonitorRole; test: boolean; width: number; height: number; source?: 'live' | 'slide'; slide?: import('../../types').Slide | null; media?: import('../../media/playback').MediaSession; layout?: import('../../types').OutputProfile['layout']; margin?: number }>

  audience: AudienceOutputState
  confidence: ConfidenceOutputState
  /** Countdown state for timer slides currently on any output, keyed by slide id. */
  timers?: Record<string, TimerRuntime>
  /** The broadcast window (OBS / live stream) mirrors the audience slide in its own format. */
  broadcast?: {
    layout?: import('../../types').OutputProfile['layout']
    mode: 'mirror' | 'test'
    format?: OutputFormatId
    monitorName: string
  }
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
  openOutput(role: Exclude<MonitorRole, 'disabled'>): Promise<boolean>
  closeOutput(role: Exclude<MonitorRole, 'disabled'>): void
  publish(snapshot: OutputSnapshot): void
  readSnapshot(): OutputSnapshot | null
  subscribe(listener: (snapshot: OutputSnapshot) => void): () => void
  requestFullscreen(): Promise<boolean>
}
