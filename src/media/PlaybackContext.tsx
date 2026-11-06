import { createContext } from 'react'
import type { MediaSession } from './playback'

/** Only the selected audience output may emit audio; every preview stays silent. */
export const PlaybackContext = createContext<{ session?: MediaSession; output?: boolean; audible?: boolean; frozen?: boolean; deviceId?: string }>({})
