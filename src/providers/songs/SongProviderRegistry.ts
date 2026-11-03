import type { SongProvider } from './SongProvider'
import { localSongProvider } from './LocalSongProvider'

const providers: SongProvider[] = [localSongProvider]

export function listSongProviders(): SongProvider[] {
  return providers
}

export function defaultSongProvider(): SongProvider {
  return providers[0]
}
