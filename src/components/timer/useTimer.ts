import { createContext, useContext, useEffect, useState } from 'react'
import type { Slide, TimerRuntime, TimerStatus } from '../../types'
import { useAppStore } from '../../store/useAppStore'
import { createTimer, timerRemainingMs, timerStatusAt } from '../../utils/timer'

/**
 * Where a view reads timer state from. The operator window reads the store;
 * output windows (audience, confidence) have no live store, so OutputScreen
 * provides the timers from the published snapshot instead.
 */
export const TimerSourceContext = createContext<Record<string, TimerRuntime> | null>(null)

/**
 * Current wall-clock time, refreshed until `until` (an epoch ms) has passed.
 * Pass null to stop. Only the calling component re-renders.
 */
export function useNow(until: number | null, intervalMs = 200): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    setNow(Date.now())
    if (until === null || Date.now() >= until) return
    const id = window.setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= until) window.clearInterval(id)
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [until, intervalMs])
  return now
}

/** Stored runtime for a timer slide, or a fresh idle timer at its configured duration. */
export function useTimerRuntime(slide: Slide): TimerRuntime {
  const external = useContext(TimerSourceContext)
  const stored = useAppStore((state) => state.timers[slide.id])
  const runtime = external ? external[slide.id] : stored
  const configuredMs = (slide.timer?.durationSeconds ?? 0) * 1000
  if (!runtime || (runtime.status === 'idle' && runtime.durationMs !== configuredMs)) {
    return createTimer(slide.timer?.durationSeconds ?? 0)
  }
  return runtime
}

export interface TimerReading {
  runtime: TimerRuntime
  status: TimerStatus
  remainingMs: number
  /** 0–1 share of the duration already elapsed. */
  progress: number
}

/**
 * Live reading of a timer slide. Remaining time is computed from timestamps on
 * every tick, so a slow or hidden view never drifts; ticking only happens while
 * the countdown is running.
 */
export function useTimerReading(slide: Slide, smooth = true): TimerReading {
  const runtime = useTimerRuntime(slide)
  // Thumbnails refresh once a second; full-size views refresh 5× a second so the
  // seconds digit and progress bar change on time.
  const now = useNow(runtime.status === 'running' ? runtime.endsAt : null, smooth ? 200 : 1000)
  const remainingMs = timerRemainingMs(runtime, now)
  const status = timerStatusAt(runtime, now)
  const progress = runtime.durationMs > 0 ? 1 - remainingMs / runtime.durationMs : 1
  return { runtime, status, remainingMs, progress: Math.min(1, Math.max(0, progress)) }
}
