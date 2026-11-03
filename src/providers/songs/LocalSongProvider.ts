import type { Locale, Song, SongFacets, SongSearchFilters, SongSearchResult, SongTag } from '../../types'
import type { SongProvider } from './SongProvider'
import { SONGS } from '../../data/songs'

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

export class LocalSongProvider implements SongProvider {
  readonly id = 'local-songs'
  readonly label = 'Local hymn library · offline'
  readonly security = {
    auth: 'none' as const,
    oauthScopes: [] as string[],
    tokenStorage: 'none' as const,
    cachePolicy: 'bundled' as const,
  }

  listFacets(): SongFacets {
    const languages = [...new Set(SONGS.map((song) => song.language))] as Locale[]
    const tags = [...new Set(SONGS.flatMap((song) => song.tags))] as SongTag[]
    return { languages, tags }
  }

  async search({ query, language, tags }: SongSearchFilters): Promise<SongSearchResult> {
    const needle = normalize(query.trim())
    const songs = SONGS.filter((song) => {
      if (language !== 'all' && song.language !== language) return false
      if (tags.length > 0 && !tags.every((tag) => song.tags.includes(tag))) return false
      if (!needle) return true
      const haystack = normalize(
        [song.title, song.author, song.tags.join(' '), song.stanzas.join(' '), song.key].join(' '),
      )
      return haystack.includes(needle)
    })
    return {
      songs,
      messageKey: songs.length === 0 ? 'songs.noResults' : undefined,
    }
  }

  async getSong(id: string): Promise<Song | null> {
    return SONGS.find((song) => song.id === id) ?? null
  }

  isOfflineAvailable(): boolean {
    return true
  }
}

export const localSongProvider = new LocalSongProvider()
