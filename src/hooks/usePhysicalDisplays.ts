import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { reconcilePhysicalDisplays, type PhysicalDisplay } from '../providers/output/desktop'

export function usePhysicalDisplays(enabled: boolean) {
  useEffect(() => {
    const desktop = window.cathedralDesktop
    if (!enabled || !desktop) return
    let active = true
    const sync = (displays: PhysicalDisplay[]) => {
      if (active)
        useAppStore.setState((state) => ({
          monitors: reconcilePhysicalDisplays(state.monitors, displays),
        }))
    }
    const unsubscribe = desktop.onDisplaysChanged(sync)
    void desktop
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
    return () => {
      active = false
      unsubscribe()
    }
  }, [enabled])
}
