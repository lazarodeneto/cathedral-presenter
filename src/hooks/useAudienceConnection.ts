import { useEffect, useState, useSyncExternalStore } from 'react'
import { webOutputProvider } from '../providers/output/WebOutputProvider'
import { useAppStore } from '../store/useAppStore'

/** Green means the audience renderer has confirmed this slide. */
export function useAudienceConnection(slideId?: string) {
  const monitors = useAppStore((state) => state.monitors)
  const [, tick] = useState(0)
  useEffect(() => {
    const interval = window.setInterval(() => tick((value) => value + 1), 1000)
    return () => window.clearInterval(interval)
  }, [])
  const targets = window.cathedralDesktop
    ? monitors.filter((monitor) => !monitor.isOperator && monitor.role === 'audience' && monitor.status !== 'disconnected' && monitor.outputOpen).map((monitor) => monitor.displayId!)
    : undefined
  return useSyncExternalStore(
    webOutputProvider.onConnectionsChanged,
    () => webOutputProvider.audienceConnected(targets, slideId),
  )
}
