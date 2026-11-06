import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { reconcilePhysicalDisplays, type PhysicalDisplay } from '../providers/output/desktop'
import { useDesktopDisplays } from './useDesktopDisplays'
import { webOutputProvider } from '../providers/output/WebOutputProvider'

export function usePhysicalDisplays(enabled: boolean) {
  const desktop = useDesktopDisplays()
  useEffect(() => {
    if (!enabled) return
    if (!desktop) {
      void webOutputProvider.discoverDesktop()
      const discovery = window.setInterval(() => void webOutputProvider.discoverDesktop(), 3000)
      return () => window.clearInterval(discovery)
    }
    let active = true
    let fingerprint = ''
    const sync = (displays: PhysicalDisplay[]) => {
      const next = JSON.stringify(displays)
      if (active && next !== fingerprint) {
        fingerprint = next
        useAppStore.setState((state) => ({
          monitors: reconcilePhysicalDisplays(state.monitors, displays),
        }))
      }
    }
    const unsubscribe = desktop.onDisplaysChanged(sync)
    const refresh = () => void desktop
      .listDisplays()
      .then(sync)
      .catch(() => {
        // Native errors leave outputs unavailable instead of claiming simulation is hardware.
        if (active)
          useAppStore.setState((state) => ({
            monitors: state.monitors
              .filter((monitor) => !monitor.simulated)
              .map((monitor) => ({ ...monitor, status: 'disconnected' as const })),
          }))
      })
    refresh()
    const poll = window.setInterval(refresh, 2000)
    window.addEventListener('focus', refresh)
    return () => {
      active = false
      unsubscribe()
      window.clearInterval(poll)
      window.removeEventListener('focus', refresh)
    }
  }, [enabled, desktop])
}
