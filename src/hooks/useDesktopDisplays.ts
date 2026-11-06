import { useSyncExternalStore } from 'react'
import { webOutputProvider } from '../providers/output/WebOutputProvider'

export function useDesktopDisplays() {
  return useSyncExternalStore(webOutputProvider.onConnectionsChanged, webOutputProvider.getDesktop)
}
