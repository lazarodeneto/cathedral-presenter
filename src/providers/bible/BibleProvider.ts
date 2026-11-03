import type {
  BibleBookCatalogEntry,
  BiblePassage,
  BibleSearchResult,
  BibleTranslation,
  BibleVerse,
  Locale,
  ProviderSecurityProfile,
} from '../../types'

export class BibleProviderError extends Error {
  code: 'not-found' | 'invalid-reference' | 'offline' | 'provider-error' | 'empty'
  constructor(code: BibleProviderError['code'], message: string) {
    super(message)
    this.code = code
  }
}

export interface ParsedReference {
  bookId: string
  chapter: number
  startVerse: number | null
  endVerse: number | null
}

/**
 * Provider boundary for bundled and licensed Scripture sources.
 *
 * Remote implementations are expected to authenticate through a desktop
 * bridge using least-privilege OAuth. Tokens belong in the OS credential
 * store, never in this webview, IndexedDB, exports, or logs. Cache only what
 * the provider license permits and fall back to bundled content when offline.
 */
export interface BibleProvider {
  readonly id: string
  readonly label: string
  readonly security: ProviderSecurityProfile
  listTranslations(): BibleTranslation[]
  supportsTranslation(translationId: string): boolean
  getBookCatalog(translationId: string, locale: Locale): Promise<BibleBookCatalogEntry[]>
  getChapter(translationId: string, bookId: string, chapter: number): Promise<BibleVerse[]>
  search(query: string, translationId: string): Promise<BibleSearchResult>
  getPassage(reference: string, translationId: string): Promise<BiblePassage>
  isOfflineAvailable(translationId: string): boolean
  parseReference(reference: string): ParsedReference | null
}
