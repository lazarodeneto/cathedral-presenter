import { DEFAULT_MONITORS } from '../data/seed'
import { DEFAULT_OUTPUT_FORMAT_ID, isOutputFormatId } from '../utils/outputFormats'
import type { StateStorage } from 'zustand/middleware'
import type { Branding, LibrarySong, MediaAsset, Monitor } from '../types'
import { LOCALES } from '../types'
import { BIBLE_TRANSLATIONS } from '../data/bible'
import { normalizeMediaTags } from '../utils/mediaTags'

const bundledIds = new Set(BIBLE_TRANSLATIONS.map((t) => t.id))

function sanitizeHiddenBibleIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((id): id is string => typeof id === 'string' && bundledIds.has(id))
}
import { sanitizeCustomBibleTranslations } from '../providers/bible/customBibles'
import { isBibleTextStored } from './bibleTextStore'
import { DEFAULT_BRANDING, normalizeBranding } from '../utils/branding'
import { upgradeService } from '../utils/cultoNormalize'
import { normalizeOverrides } from '../shortcuts/bindings'
import { isBlobUrl, sanitizeServicesForStorage } from './blob'
import type { AppState, RecentPassage } from './useAppStore'

const bundledTranslationIds = new Set(BIBLE_TRANSLATIONS.map((translation) => translation.id))

function translationIdsFor(customBibles: { translation: { id: string } }[]): Set<string> {
  return new Set([...bundledTranslationIds, ...customBibles.map((entry) => entry.translation.id)])
}

export function isValidTranslationId(
  value: unknown,
  fallback: string,
  ids: Set<string> = bundledTranslationIds,
): string {
  return typeof value === 'string' && ids.has(value) ? value : fallback
}

function validTranslationId(
  value: unknown,
  fallback: string,
  ids: Set<string> = bundledTranslationIds,
): string {
  return isValidTranslationId(value, fallback, ids)
}

function validHighlightWeekday(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 6
    ? value
    : null
}

function now(): string {
  return new Date().toISOString()
}

function sanitizeMonitors(value: unknown, fallback: Monitor[]): Monitor[] {
  if (!Array.isArray(value)) return fallback
  const monitors = value.filter((monitor): monitor is Monitor => {
    if (!monitor || typeof monitor !== 'object') return false
    const entry = monitor as Partial<Monitor>
    return (
      typeof entry.id === 'string' &&
      typeof entry.name === 'string' &&
      (entry.role === 'audience' ||
        entry.role === 'confidence' ||
        entry.role === 'broadcast' ||
        entry.role === 'disabled')
    )
  })
  return ensureOutputMonitors(monitors.length > 0 ? monitors : fallback)
}

/**
 * Every workspace has the two outputs the app offers: the church
 * presentation (audience) and the broadcast window. Older saves marked the
 * broadcast output unsupported; it works now.
 */
export function ensureOutputMonitors(monitors: Monitor[]): Monitor[] {
  const next = monitors.map((monitor) =>
    monitor.role === 'broadcast' && monitor.status === 'unsupported' ? { ...monitor, status: 'ready' as const } : monitor,
  )
  for (const role of ['audience', 'broadcast'] as const) {
    if (next.some((monitor) => monitor.role === role)) continue
    const fallback = DEFAULT_MONITORS.find((monitor) => monitor.role === role)
    if (fallback && !next.some((monitor) => monitor.id === fallback.id)) next.push({ ...fallback, status: 'ready' })
  }
  return next
}

function sanitizeMediaLibrary(value: unknown, fallback: MediaAsset[]): MediaAsset[] {
  if (!Array.isArray(value)) return fallback
  return value
    .filter((asset): asset is MediaAsset => {
      if (!asset || typeof asset !== 'object') return false
      const entry = asset as Partial<MediaAsset>
      return (
        typeof entry.id === 'string' &&
        typeof entry.name === 'string' &&
        typeof entry.source === 'string' &&
        typeof entry.kind === 'string' &&
        typeof entry.provider === 'string'
      )
    })
    .map((asset) =>
      isBlobUrl(asset.source) || asset.localOnly
        ? { ...asset, tags: normalizeMediaTags(asset.tags, 30), source: '', status: 'missing' as const }
        : { ...asset, tags: normalizeMediaTags(asset.tags, 30) },
    )
    .slice(0, 200)
}

function sanitizeRecentPassages(
  value: unknown,
  fallback: RecentPassage[],
  ids: Set<string>,
): RecentPassage[] {
  if (!Array.isArray(value)) return fallback
  return value
    .filter((entry): entry is RecentPassage => {
      if (!entry || typeof entry !== 'object') return false
      const passage = entry as Partial<RecentPassage>
      return (
        typeof passage.reference === 'string' &&
        typeof passage.translationId === 'string' &&
        ids.has(passage.translationId)
      )
    })
    .slice(0, 8)
}

function sanitizeRecentSongs(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback
  return value.filter((id): id is string => typeof id === 'string').slice(0, 8)
}

function sanitizeLibrarySongs(value: unknown, fallback: LibrarySong[]): LibrarySong[] {
  if (!Array.isArray(value)) return fallback
  return value.filter((song): song is LibrarySong => {
    if (!song || typeof song !== 'object') return false
    const entry = song as Partial<LibrarySong>
    return (
      typeof entry.id === 'string' &&
      typeof entry.title === 'string' &&
      typeof entry.lyrics === 'string'
    )
  })
}

let storageWriteFailed = false

export const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name)
    } catch {
      return null
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value)
      storageWriteFailed = false
    } catch {
      if (storageWriteFailed) return
      storageWriteFailed = true
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('church-presenter:storage-error'))
      }
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name)
    } catch {
      return
    }
  },
}

export function partializeWorkspace(state: AppState) {
  return {
    services: sanitizeServicesForStorage(state.services),
    activeServiceId: state.activeServiceId,
    selectedItemId: state.selectedItemId,
    selectedSlideId: state.selectedSlideId,
    selectedElementId: state.selectedElementId,
    branding: state.branding,
    churchId: state.churchId,
    otherChurchServices: sanitizeServicesForStorage(state.otherChurchServices),
    brandingProfiles: state.brandingProfiles,
    settings: state.settings,
    monitors: state.monitors,
    mediaLibrary: state.mediaLibrary.map((asset) =>
      asset.source.startsWith('blob:') || asset.localOnly
        ? { ...asset, source: '', status: 'missing' as const }
        : asset,
    ),
    mediaTags: state.mediaTags,
    recentPassages: state.recentPassages,
    recentSongs: state.recentSongs,
    librarySongs: state.librarySongs,
    customBibles: state.customBibles.map((entry) =>
      isBibleTextStored(entry.translation.id, entry.books) ? { ...entry, books: {} } : entry,
    ),
    hiddenBibleIds: state.hiddenBibleIds,
    archivedBibleIds: state.archivedBibleIds,
    deletedBibleIds: state.deletedBibleIds,
    lastSavedAt: state.lastSavedAt,
  }
}

export function mergeWorkspace(persisted: unknown, current: AppState): AppState {
  const value = persisted as Partial<AppState> | undefined
  if (!value || !Array.isArray(value.services)) return current
  const customBibles = sanitizeCustomBibleTranslations(value.customBibles, { textStoredElsewhere: true })
  const translationIds = translationIdsFor(customBibles)
  const settings = { ...current.settings, ...(value.settings ?? {}) }
  const churchId =
    typeof value.churchId === 'string' && value.churchId ? value.churchId : current.churchId
  const storedProfiles =
    value.brandingProfiles && typeof value.brandingProfiles === 'object' ? value.brandingProfiles : {}
  const brandingProfiles: Record<string, Branding> = {}
  for (const [id, profile] of Object.entries(storedProfiles)) {
    brandingProfiles[id] = normalizeBranding(profile)
  }
  if (!brandingProfiles[churchId]) {
    brandingProfiles[churchId] = normalizeBranding(value.branding ?? DEFAULT_BRANDING)
  }
  const allServices = sanitizeServicesForStorage(
    [...value.services, ...(Array.isArray(value.otherChurchServices) ? value.otherChurchServices : [])].map(
      (service) => upgradeService(service, churchId),
    ),
  )
  const workingServices = allServices.filter((service) => service.churchId === churchId)
  const activeService =
    workingServices.find((service) => service.id === value.activeServiceId) ?? workingServices[0]
  const activeItem =
    activeService?.items.find((item) => item.id === value.selectedItemId) ?? activeService?.items[0]
  const activeSlide =
    activeItem?.slides.find((slide) => slide.id === value.selectedSlideId) ?? activeItem?.slides[0]
  const selectedElementId =
    activeSlide?.elements.some((element) => element.id === value.selectedElementId)
      ? value.selectedElementId ?? null
      : null
  return {
    ...current,
    ...value,
    churchId,
    services: workingServices,
    otherChurchServices: allServices.filter((service) => service.churchId !== churchId),
    activeServiceId: activeService?.id ?? null,
    selectedItemId: activeItem?.id ?? null,
    selectedSlideId: activeSlide?.id ?? null,
    selectedElementId,
    brandingProfiles,
    branding: brandingProfiles[churchId],
    settings: {
      ...settings,
      locale: LOCALES.includes(settings.locale) ? settings.locale : current.settings.locale,
      shortcutOverrides: normalizeOverrides(settings.shortcutOverrides),
      defaultTranslationId: validTranslationId(settings.defaultTranslationId, 'web', translationIds),
      secondaryTranslationId: validTranslationId(
        settings.secondaryTranslationId,
        'blivre',
        translationIds,
      ),
      highlightWeekday: validHighlightWeekday(settings.highlightWeekday),
      outputFormat: isOutputFormatId(settings.outputFormat) ? settings.outputFormat : DEFAULT_OUTPUT_FORMAT_ID,
      broadcastFormat: isOutputFormatId(settings.broadcastFormat) ? settings.broadcastFormat : DEFAULT_OUTPUT_FORMAT_ID,
      sidebarCollapsed: typeof settings.sidebarCollapsed === 'boolean' ? settings.sidebarCollapsed : undefined,
    },
    monitors: sanitizeMonitors(value.monitors, current.monitors),
    mediaLibrary: sanitizeMediaLibrary(value.mediaLibrary, current.mediaLibrary),
    mediaTags: Array.isArray(value.mediaTags) ? normalizeMediaTags(value.mediaTags) : current.mediaTags,
    recentPassages: sanitizeRecentPassages(value.recentPassages, current.recentPassages, translationIds),
    recentSongs: sanitizeRecentSongs(value.recentSongs, current.recentSongs),
    librarySongs: sanitizeLibrarySongs(value.librarySongs, current.librarySongs),
    customBibles,
    hiddenBibleIds: sanitizeHiddenBibleIds(value.hiddenBibleIds),
    archivedBibleIds: sanitizeHiddenBibleIds(value.archivedBibleIds),
    deletedBibleIds: sanitizeHiddenBibleIds(value.deletedBibleIds),
    live: null,
    testMonitorId: null,
    timers: {},
    lastSavedAt: value.lastSavedAt ?? now(),
  }
}
