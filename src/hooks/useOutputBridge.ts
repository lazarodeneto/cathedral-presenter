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
      })
      webOutputProvider.publish(snapshot)
    }, 80)
    return () => window.clearTimeout(handle)
  }, [service, live, monitors, branding, testMonitorId, timers, enabled])
}
