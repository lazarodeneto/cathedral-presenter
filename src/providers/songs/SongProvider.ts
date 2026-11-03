import type {
  ProviderSecurityProfile,
  Song,
  SongFacets,
  SongSearchFilters,
  SongSearchResult,
} from '../../types'

/**
 * Provider boundary for licensed song services such as CCLI/SongSelect or
 * JEM. Credentials stay outside the frontend; a desktop bridge should use
 * least-privilege OAuth, the OS credential store, and provider-permitted
 * caching. Never scrape or bypass entitlement checks.
 */
export interface SongProvider {
  readonly id: string
  readonly label: string
  readonly security: ProviderSecurityProfile
  listFacets(): SongFacets
  search(filters: SongSearchFilters): Promise<SongSearchResult>
  getSong(id: string): Promise<Song | null>
  isOfflineAvailable(songId: string): boolean
}
