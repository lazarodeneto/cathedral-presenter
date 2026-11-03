import { DEFAULT_BRANDING } from '../utils/branding'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createTimer,
  formatTimer,
  MAX_TIMER_SECONDS,
  pauseTimer,
  resetTimer,
  resumeTimer,
  settleTimer,
  startTimer,
  timerActions,
  timerRemainingMs,
  timerStatusAt,
  validateTimerDuration,
} from '../utils/timer'
import { createTimerItem } from '../utils/slides'
import { buildBackup, parseBackup } from '../security/backup'
import { buildOutputSnapshot } from '../store/outputState'
import { createServiceSkeleton } from '../store/serviceUtils'
import { useAppStore } from '../store/useAppStore'
import type { Branding, Service } from '../types'

describe('timer duration validation', () => {
  it('accepts 0:00 through 60:00', () => {
    expect(validateTimerDuration(0, 0)).toEqual({ ok: true, seconds: 0 })
    expect(validateTimerDuration('5', '30')).toEqual({ ok: true, seconds: 330 })
    expect(validateTimerDuration('60', '00')).toEqual({ ok: true, seconds: MAX_TIMER_SECONDS })
    expect(validateTimerDuration('10', '')).toEqual({ ok: true, seconds: 600 })
  })

  it('rejects negative, fractional, out-of-range and non-numeric values with a reason', () => {
    expect(validateTimerDuration('-1', '0')).toEqual({ ok: false, reason: 'negative' })
    expect(validateTimerDuration('0', '-5')).toEqual({ ok: false, reason: 'negative' })
    expect(validateTimerDuration('1.5', '0')).toEqual({ ok: false, reason: 'not-whole' })
    expect(validateTimerDuration('2', '60')).toEqual({ ok: false, reason: 'seconds-range' })
    expect(validateTimerDuration('60', '01')).toEqual({ ok: false, reason: 'too-long' })
    expect(validateTimerDuration('61', '0')).toEqual({ ok: false, reason: 'too-long' })
    expect(validateTimerDuration('abc', '0')).toEqual({ ok: false, reason: 'not-a-number' })
  })
})

describe('timer state transitions', () => {
  it('starts, pauses, resumes and completes from timestamps', () => {
    const idle = createTimer(90)
    expect(idle).toMatchObject({ status: 'idle', remainingMs: 90_000, endsAt: null })
    expect(timerActions('idle')).toEqual({ canStart: true, canPause: false, canResume: false, canReset: false })

    const running = startTimer(idle, 1_000)
    expect(running).toMatchObject({ status: 'running', endsAt: 91_000 })
    expect(timerRemainingMs(running, 31_000)).toBe(60_000)

    const paused = pauseTimer(running, 31_000)
    expect(paused).toMatchObject({ status: 'paused', remainingMs: 60_000, endsAt: null })
    // A paused timer does not move, however much time passes.
    expect(timerRemainingMs(paused, 500_000)).toBe(60_000)

    const resumed = resumeTimer(paused, 200_000)
    expect(resumed).toMatchObject({ status: 'running', endsAt: 260_000 })
    expect(timerRemainingMs(resumed, 259_500)).toBe(500)

    expect(timerStatusAt(resumed, 260_000)).toBe('completed')
    expect(timerRemainingMs(resumed, 400_000)).toBe(0)
    expect(settleTimer(resumed, 260_000)).toMatchObject({ status: 'completed', remainingMs: 0, endsAt: null })
  })

  it('stops at zero and only allows reset once completed', () => {
    const done = settleTimer(startTimer(createTimer(10), 0), 10_000)
    expect(done.status).toBe('completed')
    expect(startTimer(done, 20_000)).toBe(done)
    expect(pauseTimer(done, 20_000)).toBe(done)
    expect(resumeTimer(done, 20_000)).toBe(done)
    expect(timerActions('completed')).toEqual({ canStart: false, canPause: false, canResume: false, canReset: true })
  })

  it('completes immediately for a 0:00 timer', () => {
    expect(startTimer(createTimer(0), 5_000)).toMatchObject({ status: 'completed', remainingMs: 0 })
  })

  it('ignores actions that do not fit the current state', () => {
    const idle = createTimer(60)
    expect(pauseTimer(idle, 0)).toBe(idle)
    expect(resumeTimer(idle, 0)).toBe(idle)
    const running = startTimer(idle, 0)
    expect(startTimer(running, 1_000)).toBe(running)
    expect(resumeTimer(running, 1_000)).toBe(running)
  })

  it('resets to the configured duration from any state', () => {
    const paused = pauseTimer(startTimer(createTimer(120), 0), 45_000)
    expect(resetTimer(paused)).toEqual(createTimer(120))
    const done = settleTimer(startTimer(createTimer(120), 0), 120_000)
    expect(resetTimer(done)).toEqual(createTimer(120))
  })

  it('formats MM:SS, rounding up so 00:00 appears only at the end', () => {
    expect(formatTimer(0)).toBe('00:00')
    expect(formatTimer(1)).toBe('00:01')
    expect(formatTimer(59_001)).toBe('01:00')
    expect(formatTimer(330_000)).toBe('05:30')
    expect(formatTimer(MAX_TIMER_SECONDS * 1000)).toBe('60:00')
  })
})

const timerSlide = (services: Service[], slideId: string) =>
  services.flatMap((service) => service.items.flatMap((item) => item.slides)).find((slide) => slide.id === slideId)

function serviceWithTimer(seconds: number): { service: Service; slideId: string; itemId: string } {
  const base = createServiceSkeleton({ title: 'Sunday', date: '2026-11-01', time: '10:00', locale: 'en' })
  const item = createTimerItem('Welcome countdown', seconds)
  const service: Service = {
    ...base,
    sections: base.sections.map((section, index) =>
      index === 0 ? { ...section, itemIds: [...section.itemIds, item.id] } : section,
    ),
    items: [...base.items, item],
  }
  return { service, slideId: item.slides[0].id, itemId: item.id }
}

describe('timer slide in the store', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-01T10:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('drives start, pause, resume, reset and completion for a slide', () => {
    const { service, slideId } = serviceWithTimer(120)
    useAppStore.setState({ services: [service], timers: {} })
    const { timerCommand } = useAppStore.getState()
    const timer = () => useAppStore.getState().timers[slideId]

    timerCommand(slideId, 'start')
    expect(timer().status).toBe('running')
    vi.advanceTimersByTime(30_000)
    timerCommand(slideId, 'pause')
    expect(timer()).toMatchObject({ status: 'paused', remainingMs: 90_000 })
    vi.advanceTimersByTime(60_000)
    timerCommand(slideId, 'resume')
    vi.advanceTimersByTime(90_000)
    expect(timerStatusAt(timer(), Date.now())).toBe('completed')
    timerCommand(slideId, 'reset')
    expect(timer()).toEqual(createTimer(120))
  })

  it('restarts a timer from the new value when its duration changes', () => {
    const { service, slideId, itemId } = serviceWithTimer(120)
    useAppStore.setState({ services: [service], timers: {} })
    const state = useAppStore.getState()
    state.timerCommand(slideId, 'start')
    state.updateSlide(service.id, itemId, slideId, { timer: { durationSeconds: 45 } })
    const after = useAppStore.getState()
    expect(after.timers[slideId]).toBeUndefined()
    expect(timerSlide(after.services, slideId)?.timer).toEqual({ durationSeconds: 45 })
  })

  it('clamps an out-of-range duration written to the slide', () => {
    const { service, slideId, itemId } = serviceWithTimer(120)
    useAppStore.setState({ services: [service], timers: {} })
    useAppStore.getState().updateSlide(service.id, itemId, slideId, { timer: { durationSeconds: 99_999 } })
    expect(timerSlide(useAppStore.getState().services, slideId)?.timer).toEqual({ durationSeconds: MAX_TIMER_SECONDS })
  })

  it('saves the configured duration but not the live countdown', () => {
    const { service, slideId } = serviceWithTimer(75)
    useAppStore.setState({ services: [service], timers: {} })
    useAppStore.getState().timerCommand(slideId, 'start')
    useAppStore.getState().saveNow()
    const saved = JSON.parse(localStorage.getItem('church-presenter:workspace:v1') ?? '{}')
    expect(saved.state.timers).toBeUndefined()
    const savedSlide = timerSlide(saved.state.services, slideId)
    expect(savedSlide).toMatchObject({ kind: 'timer', timer: { durationSeconds: 75 } })
  })
})

describe('timer persistence and output', () => {
  const branding: Branding = { ...DEFAULT_BRANDING, name: 'Grace' }

  it('keeps the duration through a backup round trip and clamps bad values', () => {
    const { service, slideId } = serviceWithTimer(600)
    const raw = buildBackup({
      services: [service],
      settings: useAppStore.getState().settings,
      branding,
      monitors: [],
      media: [],
    })
    const parsed = parseBackup(JSON.stringify(raw))
    expect(timerSlide(parsed.services, slideId)).toMatchObject({ kind: 'timer', timer: { durationSeconds: 600 } })

    const tampered = JSON.parse(JSON.stringify(raw))
    const rawSlide = timerSlide(tampered.services, slideId)!
    rawSlide.timer!.durationSeconds = -40
    expect(timerSlide(parseBackup(JSON.stringify(tampered)).services, slideId)?.timer).toEqual({ durationSeconds: 0 })
    rawSlide.timer!.durationSeconds = 10_000
    expect(timerSlide(parseBackup(JSON.stringify(tampered)).services, slideId)?.timer).toEqual({
      durationSeconds: MAX_TIMER_SECONDS,
    })
  })

  it('sends the countdown for the live timer slide to output windows', () => {
    const { service, slideId } = serviceWithTimer(300)
    const running = startTimer(createTimer(300), 1_000)
    const snapshot = buildOutputSnapshot({
      service,
      live: {
        isLive: true,
        serviceId: service.id,
        currentSlideId: slideId,
        history: [slideId],
        startedAt: '2026-11-01T10:00:00.000Z',
        blank: false,
        frozen: false,
        frozenSlideId: null,
        message: null,
        messageVisible: false,
      },
      monitors: [],
      branding,
      testMonitorId: null,
      timers: { [slideId]: running, other_slide: createTimer(10) },
    })
    expect(snapshot.timers).toEqual({ [slideId]: running })
    expect(snapshot.audience.slide?.kind).toBe('timer')
  })
})
