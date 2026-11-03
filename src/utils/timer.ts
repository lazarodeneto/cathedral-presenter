import type { TimerRuntime, TimerStatus } from '../types'

export const MAX_TIMER_SECONDS = 60 * 60
export const DEFAULT_TIMER_SECONDS = 5 * 60

export type TimerDurationError = 'not-a-number' | 'not-whole' | 'negative' | 'seconds-range' | 'too-long'

export type TimerDurationResult =
  | { ok: true; seconds: number }
  | { ok: false; reason: TimerDurationError }

/**
 * Validate a minutes + seconds entry. Both fields must be whole, non-negative
 * numbers, seconds must be 0–59, and the total may not exceed 60:00.
 * Empty fields count as 0 so a user can type "5" minutes without seconds.
 */
export function validateTimerDuration(minutes: string | number, seconds: string | number): TimerDurationResult {
  const parse = (value: string | number) => {
    if (typeof value === 'number') return value
    const trimmed = value.trim()
    return trimmed === '' ? 0 : Number(trimmed)
  }
  const m = parse(minutes)
  const s = parse(seconds)
  if (!Number.isFinite(m) || !Number.isFinite(s)) return { ok: false, reason: 'not-a-number' }
  if (m < 0 || s < 0) return { ok: false, reason: 'negative' }
  if (!Number.isInteger(m) || !Number.isInteger(s)) return { ok: false, reason: 'not-whole' }
  if (s > 59) return { ok: false, reason: 'seconds-range' }
  const total = m * 60 + s
  if (total > MAX_TIMER_SECONDS) return { ok: false, reason: 'too-long' }
  return { ok: true, seconds: total }
}

/** Clamp an untrusted stored value (backup, old data) into the valid range. */
export function clampTimerSeconds(value: unknown, fallback = DEFAULT_TIMER_SECONDS): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : fallback
  return Math.min(MAX_TIMER_SECONDS, Math.max(0, n))
}

export function splitTimerSeconds(total: number): { minutes: number; seconds: number } {
  const safe = clampTimerSeconds(total)
  return { minutes: Math.floor(safe / 60), seconds: safe % 60 }
}

export function createTimer(durationSeconds: number): TimerRuntime {
  const durationMs = clampTimerSeconds(durationSeconds) * 1000
  return { status: 'idle', durationMs, remainingMs: durationMs, endsAt: null }
}

/** Remaining time at `now`, read straight from the stored timestamps. */
export function timerRemainingMs(timer: TimerRuntime, now: number): number {
  if (timer.status === 'running' && timer.endsAt !== null) return Math.max(0, timer.endsAt - now)
  return Math.max(0, timer.remainingMs)
}

/** Status at `now`: a running timer whose end time has passed reads as completed. */
export function timerStatusAt(timer: TimerRuntime, now: number): TimerStatus {
  if (timer.status === 'running' && timerRemainingMs(timer, now) === 0) return 'completed'
  return timer.status
}

/** Fold a passed end time into a stored completed state. */
export function settleTimer(timer: TimerRuntime, now: number): TimerRuntime {
  return timerStatusAt(timer, now) === 'completed' && timer.status === 'running'
    ? { ...timer, status: 'completed', remainingMs: 0, endsAt: null }
    : timer
}

export function startTimer(timer: TimerRuntime, now: number): TimerRuntime {
  const settled = settleTimer(timer, now)
  if (settled.status !== 'idle') return settled
  if (settled.durationMs === 0) return { ...settled, status: 'completed', remainingMs: 0, endsAt: null }
  return { ...settled, status: 'running', remainingMs: settled.durationMs, endsAt: now + settled.durationMs }
}

export function pauseTimer(timer: TimerRuntime, now: number): TimerRuntime {
  const settled = settleTimer(timer, now)
  if (settled.status !== 'running') return settled
  return { ...settled, status: 'paused', remainingMs: timerRemainingMs(settled, now), endsAt: null }
}

export function resumeTimer(timer: TimerRuntime, now: number): TimerRuntime {
  if (timer.status !== 'paused') return timer
  if (timer.remainingMs <= 0) return { ...timer, status: 'completed', remainingMs: 0, endsAt: null }
  return { ...timer, status: 'running', endsAt: now + timer.remainingMs }
}

export function resetTimer(timer: TimerRuntime): TimerRuntime {
  return createTimer(timer.durationMs / 1000)
}

/** Which controls make sense in each state; the UI disables the rest. */
export function timerActions(status: TimerStatus) {
  return {
    canStart: status === 'idle',
    canPause: status === 'running',
    canResume: status === 'paused',
    canReset: status !== 'idle',
  }
}

/**
 * MM:SS, rounding up to the next whole second so the display reads 00:00 only
 * when the countdown has really finished. 60:00 is the largest value.
 */
export function formatTimer(ms: number): string {
  const totalSeconds = Math.min(MAX_TIMER_SECONDS, Math.max(0, Math.ceil(ms / 1000)))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
