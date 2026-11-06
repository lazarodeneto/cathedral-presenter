import { useEffect } from 'react'
import { webOutputProvider } from '../providers/output/WebOutputProvider'
import { useAppStore } from '../store/useAppStore'
import { buildOutputSnapshot } from '../store/outputState'

export function useOutputBridge(enabled = true) {
  useEffect(() => {
    if (!enabled) return
    const timer = setInterval(() => {
      if (!webOutputProvider.hasControl()) return
      const state = useAppStore.getState(), live = state.live
      if (!live || live.blank || live.frozen || live.scripture) return
      const slide = state.services.find((s) => s.id === live.serviceId)?.items.flatMap((i) => i.slides).find((s) => s.id === live.currentSlideId)
      if (slide?.autoAdvanceSeconds && Date.now() - (live.slideStartedAt ?? Date.parse(live.startedAt)) >= slide.autoAdvanceSeconds * 1000) state.nextLive()
    }, 200)
    return () => clearInterval(timer)
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    const handled = new Set<string>()
    return webOutputProvider.onConnectionsChanged(() => {
      if (!webOutputProvider.hasControl()) return
      const state = useAppStore.getState(), live = state.live
      if (!live?.media || live.blank || live.frozen) return
      const slide = live.scripture ?? state.services.find((s) => s.id === live.serviceId)?.items.flatMap((i) => i.slides).find((s) => s.id === live.currentSlideId)
      if (!slide) return
      for (const entry of webOutputProvider.getMediaFeedback(slide.id)) {
        const transport = live.media.elements[entry.id]
        const element = slide.elements.find((e) => e.id === entry.id)
        const key = `${slide.id}:${entry.id}:${transport?.startedAt}`
        if (entry.state !== 'ended' || !transport || transport.loop || transport.status !== 'playing' || handled.has(key)) continue
        handled.add(key)
        if (handled.size > 200) handled.delete(handled.values().next().value!)
        if (element?.settings?.endAction === 'next') state.nextLive()
        else if (element?.settings?.endAction === 'black') state.blankForModeTransition()
      }
    })
  }, [enabled])

  const service = useAppStore((state) =>
    state.live ? state.services.find((entry) => entry.id === state.live!.serviceId) ?? null : null,
  )
  const live = useAppStore((state) => state.live)
  const monitors = useAppStore((state) => state.monitors)
  const branding = useAppStore((state) => state.branding)
  const testMonitorId = useAppStore((state) => state.testMonitorId)
  const timers = useAppStore((state) => state.timers)
  const transitionType = useAppStore((state) => state.settings.transition)
  const transitionSeconds = useAppStore((state) => state.settings.transitionDuration)
  const format = useAppStore((state) => state.settings.outputFormat)
  const profiles = useAppStore((state) => state.settings.outputProfiles)
  const services = useAppStore((state) => state.services)
  const broadcastFormat = useAppStore((state) => state.settings.broadcastFormat)

  useEffect(() => {
    if (!enabled) return
    const publish = () => {
      const snapshot = buildOutputSnapshot({
        service, profiles, services,
        live,
        monitors,
        branding,
        testMonitorId,
        timers,
        defaultTransition: { type: transitionType, durationMs: Math.round(Math.min(3, Math.max(0, transitionSeconds)) * 1000) },
        format,
        broadcastFormat,
      })
      webOutputProvider.publish(snapshot)
    }
    // A mode change must reach the TVs even if another slide is chosen immediately.
    if (live?.modeTransitionPending || live?.blank) { publish(); return }
    const handle = window.setTimeout(publish, 80)
    return () => window.clearTimeout(handle)
  }, [service, live, monitors, branding, testMonitorId, timers, transitionType, transitionSeconds, format, broadcastFormat, profiles, services, enabled])
}
