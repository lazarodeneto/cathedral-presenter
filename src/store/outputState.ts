import type { Branding, LiveSession, Monitor, Service, TimerRuntime } from '../types'
import type { OutputSnapshot } from '../providers/output/OutputProvider'
import { flatSlides, slideContext } from './serviceUtils'
import { DEFAULT_TRANSITION } from '../utils/culto'

export function buildOutputSnapshot(input: {
  service: Service | null
  live: LiveSession | null
  monitors: Monitor[]
  branding: Branding
  testMonitorId: string | null
  timers?: Record<string, TimerRuntime>
}): OutputSnapshot {
  const { service, live, monitors, branding, testMonitorId, timers = {} } = input
  const now = new Date().toISOString()
  const audienceMonitor = monitors.find((monitor) => monitor.role === 'audience')
  const confidenceMonitor = monitors.find((monitor) => monitor.role === 'confidence')
  const testMonitor = monitors.find((monitor) => monitor.id === testMonitorId)
  const testRole = testMonitor?.role
  const slides = service ? flatSlides(service) : []
  const currentContext = live && service ? slideContext(service, live.currentSlideId) : null
  const frozenContext =
    live?.frozen && live.frozenSlideId && service
      ? slideContext(service, live.frozenSlideId)
      : null
  const effectiveContext = frozenContext ?? currentContext
  const currentIndex = currentContext?.index ?? -1
  const next = currentIndex >= 0 ? slides[currentIndex + 1] ?? null : slides[0] ?? null
  const position =
    currentContext && slides.length
      ? `${currentContext.index + 1} / ${slides.length}`
      : null

  const audienceMode: OutputSnapshot['audience']['mode'] =
    testMonitor && testRole === 'audience'
      ? 'test'
      : !live
        ? 'idle'
        : live.blank
          ? 'blank'
          : 'live'

  const confidenceMode: OutputSnapshot['confidence']['mode'] =
    testMonitor && testRole === 'confidence'
      ? 'test'
      : !live
        ? 'idle'
        : 'live'

  // Only timers for slides on an output travel with the snapshot.
  const shownTimers: Record<string, TimerRuntime> = {}
  for (const slide of [effectiveContext?.slide, currentContext?.slide, next?.slide]) {
    if (slide?.kind === 'timer' && timers[slide.id]) shownTimers[slide.id] = timers[slide.id]
  }

  return {
    timers: shownTimers,
    audience: {
      mode: audienceMode,
      slide: audienceMode === 'test' ? null : effectiveContext?.slide ?? null,
      message: live?.message ?? null,
      messageVisible: Boolean(live?.messageVisible && live.message),
      branding,
      monitorName: audienceMonitor?.name ?? 'Audience',
      testMonitorName: audienceMode === 'test' ? testMonitor?.name : undefined,
      isFrozen: Boolean(live?.frozen && audienceMode === 'live'),
      transition: effectiveContext?.slide.transition ?? service?.transition ?? DEFAULT_TRANSITION,
      updatedAt: now,
    },
    confidence: {
      mode: confidenceMode,
      current: confidenceMode === 'test' ? null : currentContext?.slide ?? null,
      next: confidenceMode === 'test' ? null : next?.slide ?? null,
      notes: currentContext?.slide.notes ?? null,
      itemTitle: currentContext?.item.title ?? null,
      sectionTitle: currentContext?.section.title ?? null,
      position,
      branding,
      startedAt: live?.startedAt ?? null,
      monitorName: confidenceMonitor?.name ?? 'Confidence',
      testMonitorName: confidenceMode === 'test' ? testMonitor?.name : undefined,
      updatedAt: now,
    },
  }
}
