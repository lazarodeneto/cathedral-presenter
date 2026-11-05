import { useEffect } from 'react'
import { webOutputProvider } from '../providers/output/WebOutputProvider'
import { useAppStore } from '../store/useAppStore'
import { buildOutputSnapshot } from '../store/outputState'

export function useOutputBridge(enabled = true) {
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

  useEffect(() => {
    if (!enabled) return
    const handle = window.setTimeout(() => {
      const snapshot = buildOutputSnapshot({
        service,
        live,
        monitors,
        branding,
        testMonitorId,
        timers,
        defaultTransition: { type: transitionType, durationMs: Math.round(Math.min(3, Math.max(0, transitionSeconds)) * 1000) },
      })
      webOutputProvider.publish(snapshot)
    }, 80)
    return () => window.clearTimeout(handle)
  }, [service, live, monitors, branding, testMonitorId, timers, transitionType, transitionSeconds, enabled])
}
