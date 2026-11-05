import type { Branding, LiveSession, Monitor, Service, SlideTransition, TimerRuntime } from '../types'
import type { OutputSnapshot } from '../providers/output/OutputProvider'
import { flatSlides, slideContext } from './serviceUtils'
import { DEFAULT_TRANSITION } from '../utils/culto'
import type { OutputFormatId } from '../utils/outputFormats'

export function buildOutputSnapshot(input: {
  service: Service | null
  live: LiveSession | null
  monitors: Monitor[]
  branding: Branding
  testMonitorId: string | null
  timers?: Record<string, TimerRuntime>
  /** The app-wide default from Settings; used when neither the slide nor the service sets one. */
  defaultTransition?: SlideTransition
  /** Projection format from Settings. */
  format?: OutputFormatId
  /** Broadcast window format from Settings. */
  broadcastFormat?: OutputFormatId
}): OutputSnapshot {
  const { service, live, monitors, branding, testMonitorId, timers = {}, defaultTransition, format, broadcastFormat } = input
  const broadcastMonitor = monitors.find((monitor) => monitor.role === 'broadcast')
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
  // A verse from Bible Mode is on screen instead of the service slide; when frozen, the verse frozen with it.
  const scripture = live?.frozen ? live.frozenScripture ?? null : live?.scripture ?? null
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
    broadcast: {
      mode: testMonitor && testRole === 'broadcast' ? 'test' : 'mirror',
      format: broadcastFormat,
      monitorName: broadcastMonitor?.name ?? 'Broadcast',
    },
    audience: {
      mode: audienceMode,
      slide: audienceMode === 'test' ? null : scripture ?? effectiveContext?.slide ?? null,
      message: live?.message ?? null,
      messageVisible: Boolean(live?.messageVisible && live.message),
      branding,
      monitorName: audienceMonitor?.name ?? 'Audience',
      testMonitorName: audienceMode === 'test' ? testMonitor?.name : undefined,
      isFrozen: Boolean(live?.frozen && audienceMode === 'live'),
      transition: (scripture ? undefined : effectiveContext?.slide.transition) ?? service?.transition ?? defaultTransition ?? DEFAULT_TRANSITION,
      format,
      updatedAt: now,
    },
    confidence: {
      mode: confidenceMode,
      current: confidenceMode === 'test' ? null : scripture ?? currentContext?.slide ?? null,
      next: confidenceMode === 'test' ? null : next?.slide ?? null,
      notes: scripture ? null : currentContext?.slide.notes ?? null,
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
