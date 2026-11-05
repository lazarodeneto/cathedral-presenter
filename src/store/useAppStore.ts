import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type {
  AppSettings,
  Branding,
  CustomBibleTranslation,
  LibrarySong,
  Locale,
  LiveSession,
  MediaAsset,
  Monitor,
  MonitorRole,
  NewServiceInput,
  Service,
  Slide,
  SlideBackground,
  SlideElement,
  SlideItem,
  TimerRuntime,
} from '../types'
import { LOCALES } from '../types'
import { createSeedServices, DEFAULT_MONITORS } from '../data/seed'
import { addItemToSections, cloneService, createServiceSkeleton, flatSlides } from './serviceUtils'
import {
  collectBlobSources,
  isBlobUrl,
  revokeBlobUrl,
  serviceUsesSource,
} from './blob'
import {
  mergeWorkspace,
  partializeWorkspace,
  safeStorage,
} from './workspacePersistence'
import { sanitizeSingleLine, sanitizeText } from '../security/text'
import { validateImageDataUrl } from '../security/media'
import { translate } from '../i18n/dictionary'
import type { ParsedBackup } from '../security/backup'
import { newId } from '../utils/id'
import { DEFAULT_BRANDING, normalizeBranding } from '../utils/branding'
import { DEFAULT_CHURCH_ID } from '../utils/church'
import {
  allBibleTranslations,
  isBundledBibleTranslation,
  MAX_CUSTOM_BIBLES,
  normalizeCustomBible,
  setArchivedBibleIds,
  setCustomBibleTranslations,
  setDeletedBibleIds,
  setHiddenBibleIds,
} from '../providers/bible/customBibles'
import { loadBibleTexts, syncBibleTexts } from './bibleTextStore'
import {
  isValidDate,
  isValidTime,
  normalizeTransition,
  validateCulto,
  type CultoField,
  type CultoError,
  type CultoForm,
} from '../utils/culto'

export type ServiceSaveResult =
  | { ok: true; id: string }
  | { ok: false; reason: 'invalid'; errors: Partial<Record<CultoField, CultoError>> }
  | { ok: false; reason: 'not-found' | 'conflict' | 'live' }
import { reorderSlideLayers } from '../utils/slides'
import { clampMessageBox, MESSAGE_LIMITS, normalizeMessageStyle } from '../utils/messageBox'
import {
  clampTimerSeconds,
  createTimer,
  pauseTimer,
  resetTimer,
  resumeTimer,
  startTimer,
} from '../utils/timer'

export type TimerCommand = 'start' | 'pause' | 'resume' | 'reset'

export interface RecentPassage {
  reference: string
  translationId: string
}


export const DEFAULT_SETTINGS: AppSettings = {
  locale: 'pt-BR',
  highlightWeekday: null,
  defaultTranslationId: 'web',
  secondaryTranslationId: 'blivre',
  reducedTransparency: false,
  glassOpacity: 0.8,
  reducedMotion: false,
  shortcutsEnabled: true,
  shortcutOverrides: {},
  transition: 'fade',
  transitionDuration: 1,
  lastBackupAt: null,
  showSetupChecklist: true,
  defaultSectionTitle: 'Message',
  showGrid: false,
  snapToObjects: true,
}

export { DEFAULT_BRANDING }

export { DEFAULT_CHURCH_ID }

interface AppState {
  services: Service[]
  activeServiceId: string | null
  selectedItemId: string | null
  selectedSlideId: string | null
  selectedElementId: string | null
  /** Branding of the active church (a copy of brandingProfiles[churchId]). */
  branding: Branding
  churchId: string
  /**
   * Services of other churches on this install. They are kept apart from
   * `services` (the active church's), so no screen or action can read or change them.
   */
  otherChurchServices: Service[]
  /** Saved branding per church id. Saving only ever writes the active church's entry. */
  brandingProfiles: Record<string, Branding>
  settings: AppSettings
  monitors: Monitor[]
  mediaLibrary: MediaAsset[]
  recentPassages: RecentPassage[]
  recentSongs: string[]
  librarySongs: LibrarySong[]
  /** Administrator-imported Bibles. Every entry carries its own language. */
  customBibles: CustomBibleTranslation[]
  /** Bundled Bible translation ids hidden by the administrator. */
  hiddenBibleIds: string[]
  /** Bundled Bible translation ids archived (permanently removed) by the administrator. */
  archivedBibleIds: string[]
  /** Bundled Bible translation ids permanently deleted by the administrator. */
  deletedBibleIds: string[]
  lastSavedAt: string
  live: LiveSession | null
  testMonitorId: string | null
  /**
   * Countdown state per timer slide id. Session-only: not persisted, so a
   * reload restores each timer to its configured duration (idle).
   */
  timers: Record<string, TimerRuntime>

  setLocale: (locale: Locale) => void
  updateSettings: (patch: Partial<AppSettings>) => void
  /** Validate-and-save the active church's branding. Returns the saved value. */
  saveBranding: (branding: Branding) => Branding
  /** Restore the active church's branding to the defaults. */
  resetBranding: () => void
  /** Make another church's profile active (multi-church installs). */
  switchChurch: (churchId: string) => void
  dismissSetup: () => void
  saveNow: () => void

  selectService: (serviceId: string, slideId?: string) => void
  selectItem: (itemId: string) => void
  selectSlide: (itemId: string, slideId: string) => void
  selectElement: (elementId: string | null) => void
  /** Validated create. Returns the new id, or why it was refused. */
  createCulto: (form: CultoForm) => ServiceSaveResult
  /** Validated edit of the service details. Refused if the service changed since `expectedVersion`. */
  updateCultoDetails: (serviceId: string, form: CultoForm, expectedVersion: number) => ServiceSaveResult
  createService: (input: NewServiceInput) => string
  duplicateService: (serviceId: string, overrides?: { title?: string; date?: string; time?: string }) => string | null
  /** Permanent. Shared libraries (songs, media) are never touched. Refused while the service is live. */
  deleteService: (serviceId: string) => boolean
  archiveService: (serviceId: string) => boolean
  restoreService: (serviceId: string) => boolean
  setServiceStatus: (serviceId: string, status: Exclude<Service['status'], 'archived' | 'active'>) => boolean
  duplicateItem: (serviceId: string, itemId: string) => string | null
  /** Give every slide in the service this background. */
  applyBackgroundToService: (serviceId: string, background: SlideBackground) => void
  updateServiceMeta: (
    serviceId: string,
    patch: Partial<Pick<Service, 'title' | 'date' | 'time' | 'eventType' | 'notes' | 'spotifyUrl'>>,
  ) => void
  addSection: (serviceId: string, title: string) => string
  renameSection: (serviceId: string, sectionId: string, title: string) => void
  deleteSection: (serviceId: string, sectionId: string) => void
  addItem: (serviceId: string, sectionId: string, item: SlideItem) => void
  removeItem: (serviceId: string, itemId: string) => void
  moveItem: (serviceId: string, itemId: string, direction: -1 | 1) => void
  /** Move an item next to another item, possibly into a different section. */
  moveItemNextTo: (serviceId: string, itemId: string, targetItemId: string, side: 'before' | 'after') => void
  /** Moves an item to the end of a section (used when dropping on a section header or an empty section). */
  moveItemToSection: (serviceId: string, itemId: string, sectionId: string) => void
  moveSectionNextTo: (serviceId: string, sectionId: string, targetSectionId: string, side: 'before' | 'after') => void
  updateSlide: (
    serviceId: string,
    itemId: string,
    slideId: string,
    patch: Partial<Slide>,
  ) => void
  updateNotes: (serviceId: string, itemId: string, slideId: string, notes: string) => void
  setSlideBackground: (
    serviceId: string,
    itemId: string,
    slideId: string,
    background: SlideBackground,
  ) => void
  addBlankSlide: (serviceId: string, itemId: string) => void
  duplicateSlide: (serviceId: string, itemId: string, slideId: string) => void
  /** Move a slide to `toIndex` within its own item (index in the item's slide list after removal). */
  moveSlide: (serviceId: string, itemId: string, slideId: string, toIndex: number) => void
  pasteSlide: (serviceId: string, itemId: string, source: Slide) => void
  deleteSlide: (serviceId: string, itemId: string, slideId: string) => void
  addElement: (serviceId: string, itemId: string, slideId: string, element: SlideElement) => void
  updateElement: (
    serviceId: string,
    itemId: string,
    slideId: string,
    elementId: string,
    patch: Partial<SlideElement>,
  ) => void
  removeElement: (serviceId: string, itemId: string, slideId: string, elementId: string) => void
  duplicateElement: (serviceId: string, itemId: string, slideId: string, elementId: string) => void
  reorderElement: (
    serviceId: string,
    itemId: string,
    slideId: string,
    elementId: string,
    action: 'forward' | 'backward' | 'front' | 'back',
  ) => void
  updateItemTitle: (serviceId: string, itemId: string, title: string) => void
  updateItemMetadata: (
    serviceId: string,
    itemId: string,
    patch: Partial<NonNullable<SlideItem['metadata']>>,
  ) => void

  startLive: (serviceId: string, slideId: string) => boolean
  endLive: () => void
  nextLive: () => boolean
  prevLive: () => boolean
  jumpLive: (slideId: string) => boolean
  toggleBlank: () => void
  toggleFreeze: () => void
  setAudienceMessage: (message: string) => void
  clearAudienceMessage: () => void
  setMessageVisible: (visible: boolean) => void
  timerCommand: (slideId: string, command: TimerCommand) => void

  addMedia: (asset: MediaAsset) => void
  removeMedia: (id: string) => void
  recordRecentPassage: (passage: RecentPassage) => void
  recordRecentSong: (songId: string) => void

  createLibrarySong: (song: LibrarySong) => void
  updateLibrarySong: (song: LibrarySong) => void
  deleteLibrarySong: (id: string) => void

  /** Validate and store an administrator-imported Bible. */
  addCustomBible: (
    entry: CustomBibleTranslation,
  ) => { ok: true; id: string } | { ok: false; reason: 'invalid' | 'duplicate' }
  /** Validate and save changes to an administrator-imported Bible. */
  updateCustomBible: (
    entry: CustomBibleTranslation,
  ) => { ok: true; id: string } | { ok: false; reason: 'invalid' | 'not-found' }
  /** Remove an administrator-imported Bible. Bundled Bibles cannot be removed. */
  removeCustomBible: (
    translationId: string,
  ) => { ok: true; resetTranslation: boolean } | { ok: false; reason: 'bundled' | 'not-found' }
  /** Hide a bundled Bible so it no longer appears in translation lists. */
  hideBibleTranslation: (
    translationId: string,
  ) => { ok: true; resetTranslation: boolean } | { ok: false; reason: 'not-bundled' | 'last-visible' }
  /** Restore a previously hidden bundled Bible. */
  unhideBibleTranslation: (translationId: string) => void
  /** Archive a bundled Bible permanently. */
  archiveBibleTranslation: (
    translationId: string,
  ) => { ok: true; resetTranslation: boolean } | { ok: false; reason: 'not-bundled' | 'last-visible' }
  /** Restore a previously archived bundled Bible. */
  unarchiveBibleTranslation: (translationId: string) => void
  /** Permanently delete a bundled Bible (no UI restore). */
  deleteBibleTranslation: (
    translationId: string,
  ) => { ok: true; resetTranslation: boolean } | { ok: false; reason: 'not-bundled' | 'last-visible' }

  updateMonitor: (id: string, patch: Partial<Monitor>) => void
  assignMonitorRole: (id: string, role: MonitorRole) => void
  reconnectMonitor: (id: string) => void
  disconnectMonitor: (id: string) => void
  startTestPattern: (monitorId: string) => void
  stopTestPattern: () => void

  importBackup: (parsed: ParsedBackup) => void
  resetDemoData: () => void
  clearAllData: () => void
}

function now(): string {
  return new Date().toISOString()
}

function touchService(service: Service, updater: (service: Service) => Service): Service {
  return { ...updater(service), updatedAt: now(), version: (service.version ?? 1) + 1 }
}

function mapService(
  services: Service[],
  serviceId: string,
  updater: (service: Service) => Service,
): Service[] {
  return services.map((service) => (service.id === serviceId ? touchService(service, updater) : service))
}

/** Message boxes always stay inside the slide and keep a valid style, whatever path changed them. */
function fitElement(element: SlideElement): SlideElement {
  if (element.type !== 'message') return element
  return {
    ...element,
    ...clampMessageBox(element),
    text: sanitizeText(element.text ?? '', MESSAGE_LIMITS.text),
    settings: { ...element.settings, message: normalizeMessageStyle(element.settings?.message) },
  }
}

function findService(services: Service[], serviceId: string): Service | undefined {
  return services.find((service) => service.id === serviceId)
}

function findSlide(service: Service, slideId: string): { item: SlideItem; slide: Slide } | null {
  for (const item of service.items) {
    const slide = item.slides.find((entry) => entry.id === slideId)
    if (slide) return { item, slide }
  }
  return null
}

function resetSelectionForService(state: AppState, service: Service): Partial<AppState> {
  const firstSection = service.sections[0]
  const firstItemId = firstSection?.itemIds[0] ?? service.items[0]?.id ?? null
  const firstItem = service.items.find((item) => item.id === firstItemId)
  return {
    activeServiceId: service.id,
    selectedItemId: firstItemId,
    selectedSlideId: firstItem?.slides[0]?.id ?? null,
    selectedElementId: null,
  }
}

function sanitizeBackground(background: SlideBackground): SlideBackground {
  if (background.type === 'image') {
    const source = background.source ?? ''
    const safe =
      validateImageDataUrl(source, 3_000_000) ||
      source.startsWith('blob:')
    return safe
      ? { ...background, tone: background.tone ?? 'dark', overlay: background.overlay ?? 0.35 }
      : { type: 'preset', preset: 'graphite', tone: 'dark' }
  }
  return { ...background, tone: background.tone ?? 'dark' }
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => {
      const seedServices = createSeedServices()
      const initialService = seedServices[0]
      const initialItem = initialService.items[0]
      const initialSlide = initialItem.slides[0]

      return {
        services: seedServices,
        activeServiceId: initialService.id,
        selectedItemId: initialItem.id,
        selectedSlideId: initialSlide.id,
        selectedElementId: null,
        branding: DEFAULT_BRANDING,
        churchId: DEFAULT_CHURCH_ID,
        otherChurchServices: [],
        brandingProfiles: { [DEFAULT_CHURCH_ID]: DEFAULT_BRANDING },
        settings: DEFAULT_SETTINGS,
        monitors: DEFAULT_MONITORS,
        mediaLibrary: [],
        recentPassages: [
          { reference: 'Psalm 23:1-6', translationId: 'web' },
          { reference: 'John 3:16', translationId: 'web' },
          { reference: 'Romans 8:28', translationId: 'web' },
          { reference: '1 Corinthians 13:4-7', translationId: 'web' },
          { reference: 'Matthew 5:1-12', translationId: 'web' },
          { reference: 'Salmos 23:1-6', translationId: 'blivre' },
        ],
        recentSongs: ['amazing-grace', 'holy-holy-holy', 'come-thou-fount'],
        librarySongs: [],
        customBibles: [],
        hiddenBibleIds: [],
        archivedBibleIds: [],
        deletedBibleIds: [],
        lastSavedAt: now(),
        live: null,
        testMonitorId: null,
        timers: {},

        setLocale: (locale) => {
          if (!LOCALES.includes(locale)) return
          set((state) => ({ settings: { ...state.settings, locale } }))
        },
        updateSettings: (patch) =>
          set((state) => ({ settings: { ...state.settings, ...patch } })),
        saveBranding: (branding) => {
          const saved = normalizeBranding(branding)
          set((state) => ({
            branding: saved,
            brandingProfiles: { ...state.brandingProfiles, [state.churchId]: saved },
            lastSavedAt: now(),
          }))
          return saved
        },
        resetBranding: () =>
          set((state) => ({
            branding: DEFAULT_BRANDING,
            brandingProfiles: { ...state.brandingProfiles, [state.churchId]: DEFAULT_BRANDING },
            lastSavedAt: now(),
          })),
        switchChurch: (churchId) =>
          set((state) => {
            const id = sanitizeSingleLine(churchId, 80)
            if (!id || id === state.churchId) return {}
            const everything = [...state.services, ...state.otherChurchServices]
            const services = everything.filter((service) => service.churchId === id)
            const first = services[0]
            return {
              churchId: id,
              branding: normalizeBranding(state.brandingProfiles[id] ?? DEFAULT_BRANDING),
              services,
              otherChurchServices: everything.filter((service) => service.churchId !== id),
              live: null,
              activeServiceId: first?.id ?? null,
              selectedItemId: first?.items[0]?.id ?? null,
              selectedSlideId: first?.items[0]?.slides[0]?.id ?? null,
              selectedElementId: null,
            }
          }),
        dismissSetup: () =>
          set((state) => ({ settings: { ...state.settings, showSetupChecklist: false } })),
        saveNow: () => set({ lastSavedAt: now() }),

        selectService: (serviceId, slideId) => {
          const service = findService(get().services, serviceId)
          if (!service) return
          const found = slideId ? findSlide(service, slideId) : null
          const item = found?.item ?? service.items.find((entry) => service.sections.some((section) => section.itemIds.includes(entry.id)))
          set({
            ...resetSelectionForService(get(), service),
            selectedItemId: found?.item.id ?? item?.id ?? null,
            selectedSlideId: found?.slide.id ?? item?.slides[0]?.id ?? null,
            selectedElementId: null,
          })
        },
        selectItem: (itemId) => {
          const state = get()
          if (!state.activeServiceId) return
          const service = findService(state.services, state.activeServiceId)
          const item = service?.items.find((entry) => entry.id === itemId)
          if (!item) return
          set({
            selectedItemId: item.id,
            selectedSlideId: item.slides[0]?.id ?? null,
            selectedElementId: null,
          })
        },
        selectSlide: (itemId, slideId) => {
          set({ selectedItemId: itemId, selectedSlideId: slideId, selectedElementId: null })
        },
        selectElement: (elementId) => set({ selectedElementId: elementId }),

        createCulto: (form) => {
          const errors = validateCulto(form)
          if (Object.keys(errors).length) return { ok: false, reason: 'invalid', errors }
          const id = get().createService({
            title: form.title,
            date: form.date,
            time: form.time,
            endTime: form.endTime || undefined,
            eventType: form.eventType || undefined,
            status: form.status === 'draft' ? 'draft' : 'scheduled',
            leader: form.leader,
            pastor: form.pastor,
            worship: form.worship,
            guests: form.guests,
            description: form.description,
            notes: form.notes,
          })
          set((state) => ({
            services: state.services.map((service) =>
              service.id === id ? { ...service, transition: normalizeTransition(form.transition) } : service,
            ),
          }))
          return { ok: true, id }
        },
        updateCultoDetails: (serviceId, form, expectedVersion) => {
          const state = get()
          const current = findService(state.services, serviceId)
          if (!current) return { ok: false, reason: 'not-found' }
          // Someone (another window, an undo) changed it since the form was opened.
          if (current.version !== expectedVersion) return { ok: false, reason: 'conflict' }
          const errors = validateCulto(form)
          if (Object.keys(errors).length) return { ok: false, reason: 'invalid', errors }
          // Status changes through archive/restore and going live, not through this form.
          const status =
            current.status === 'archived' || current.status === 'active' || form.status === 'archived' || form.status === 'active'
              ? current.status
              : form.status
          set((latest) => ({
            services: mapService(latest.services, serviceId, (service) => ({
              ...service,
              title: sanitizeSingleLine(form.title, 160),
              date: form.date,
              time: form.time,
              endTime: form.endTime || undefined,
              eventType: sanitizeSingleLine(form.eventType, 80) || undefined,
              status,
              leader: sanitizeSingleLine(form.leader, 80) || undefined,
              pastor: sanitizeSingleLine(form.pastor, 120) || undefined,
              worship: sanitizeSingleLine(form.worship, 120) || undefined,
              guests: sanitizeSingleLine(form.guests, 240) || undefined,
              description: sanitizeText(form.description, 600) || undefined,
              notes: sanitizeText(form.notes, 4000) || undefined,
              transition: normalizeTransition(form.transition),
            })),
            lastSavedAt: now(),
          }))
          return { ok: true, id: serviceId }
        },
        createService: (input) => {
          const state = get()
          const date = isValidDate(input.date) ? input.date : new Date().toISOString().slice(0, 10)
          const time = isValidTime(input.time) ? input.time : '10:00'
          const skeleton = createServiceSkeleton({
            title: sanitizeSingleLine(input.title, 160) || 'Sunday Service',
            date,
            time,
            eventType: input.eventType,
            locale: state.settings.locale,
            churchId: state.churchId,
          })
          const service: Service = {
            ...skeleton,
            status: input.status ?? 'scheduled',
            endTime: isValidTime(input.endTime) && input.endTime! > time ? input.endTime : undefined,
            leader: sanitizeSingleLine(input.leader ?? '', 80) || undefined,
            pastor: sanitizeSingleLine(input.pastor ?? '', 120) || undefined,
            worship: sanitizeSingleLine(input.worship ?? '', 120) || undefined,
            guests: sanitizeSingleLine(input.guests ?? '', 240) || undefined,
            description: sanitizeText(input.description ?? '', 600) || undefined,
            notes: sanitizeText(input.notes ?? '', 4000) || undefined,
          }
          set({
            services: [service, ...state.services],
            ...resetSelectionForService(state, service),
            lastSavedAt: now(),
          })
          return service.id
        },
        duplicateService: (serviceId, overrides = {}) => {
          const state = get()
          const original = findService(state.services, serviceId)
          if (!original) return null
          const copy = cloneService(
            original,
            sanitizeSingleLine(overrides.title ?? '', 160) ||
              `${original.title} — ${translate(state.settings.locale, 'common.copy')}`,
          )
          if (overrides.date && isValidDate(overrides.date)) copy.date = overrides.date
          if (overrides.time && isValidTime(overrides.time)) copy.time = overrides.time
          if (copy.endTime && copy.endTime <= copy.time) copy.endTime = undefined
          set({
            services: [copy, ...state.services],
            ...resetSelectionForService(state, copy),
            lastSavedAt: now(),
          })
          return copy.id
        },
        deleteService: (serviceId) => {
          const state = get()
          if (!findService(state.services, serviceId)) return false
          if (state.live?.serviceId === serviceId) return false
          const services = state.services.filter((service) => service.id !== serviceId)
          const activeService =
            state.activeServiceId === serviceId ? services[0] : findService(services, state.activeServiceId ?? '')
          set({
            services,
            ...(activeService
              ? resetSelectionForService(state, activeService)
              : { activeServiceId: null, selectedItemId: null, selectedSlideId: null, selectedElementId: null }),
            lastSavedAt: now(),
          })
          return true
        },
        archiveService: (serviceId) => {
          const state = get()
          const service = findService(state.services, serviceId)
          if (!service || service.status === 'archived' || state.live?.serviceId === serviceId) return false
          set({
            services: mapService(state.services, serviceId, (entry) => ({
              ...entry,
              status: 'archived',
              statusBeforeArchive: entry.status === 'active' ? 'completed' : (entry.status as Exclude<Service['status'], 'archived'>),
            })),
            lastSavedAt: now(),
          })
          return true
        },
        restoreService: (serviceId) => {
          const state = get()
          const service = findService(state.services, serviceId)
          if (!service || service.status !== 'archived') return false
          set({
            services: mapService(state.services, serviceId, (entry) => ({
              ...entry,
              status: entry.statusBeforeArchive ?? 'draft',
              statusBeforeArchive: undefined,
            })),
            lastSavedAt: now(),
          })
          return true
        },
        setServiceStatus: (serviceId, status) => {
          const state = get()
          const service = findService(state.services, serviceId)
          if (!service || service.status === 'archived' || service.status === 'active') return false
          if (!['draft', 'scheduled', 'completed'].includes(status)) return false
          set({
            services: mapService(state.services, serviceId, (entry) => ({ ...entry, status })),
            lastSavedAt: now(),
          })
          return true
        },
        duplicateItem: (serviceId, itemId) => {
          const state = get()
          const service = findService(state.services, serviceId)
          const item = service?.items.find((entry) => entry.id === itemId)
          if (!service || !item) return null
          const copyHolder = cloneService({ ...service, items: [item], sections: [{ id: 'tmp', title: '', itemIds: [item.id] }] }, service.title)
          const copy = { ...copyHolder.items[0], title: `${item.title} — ${translate(state.settings.locale, 'common.copy')}` }
          set({
            services: mapService(state.services, serviceId, (entry) => ({
              ...entry,
              items: [...entry.items, copy],
              sections: entry.sections.map((section) => {
                const index = section.itemIds.indexOf(itemId)
                if (index < 0) return section
                const itemIds = [...section.itemIds]
                itemIds.splice(index + 1, 0, copy.id)
                return { ...section, itemIds }
              }),
            })),
            selectedItemId: copy.id,
            selectedSlideId: copy.slides[0]?.id ?? null,
            selectedElementId: null,
            lastSavedAt: now(),
          })
          return copy.id
        },
        applyBackgroundToService: (serviceId, background) =>
          set((state) => ({
            services: mapService(state.services, serviceId, (service) => ({
              ...service,
              items: service.items.map((item) => ({
                ...item,
                slides: item.slides.map((slide) => ({ ...slide, background: sanitizeBackground(background) })),
              })),
            })),
            lastSavedAt: now(),
          })),
        updateServiceMeta: (serviceId, patch) =>
          set((state) => ({
            services: mapService(state.services, serviceId, (service) => ({
              ...service,
              ...('title' in patch ? { title: sanitizeSingleLine(patch.title, 160) } : {}),
              ...('date' in patch ? { date: patch.date || service.date } : {}),
              ...('time' in patch ? { time: patch.time || service.time } : {}),
              ...('eventType' in patch
                ? { eventType: sanitizeSingleLine(patch.eventType, 80) }
                : {}),
              ...('notes' in patch ? { notes: sanitizeText(patch.notes, 4000) } : {}),
            })),
            lastSavedAt: now(),
          })),

        addSection: (serviceId, title) => {
          const id = newId('section')
          set((state) => ({
            services: mapService(state.services, serviceId, (service) => ({
              ...service,
              sections: [...service.sections, { id, title: sanitizeSingleLine(title, 80), itemIds: [] }],
            })),
            lastSavedAt: now(),
          }))
          return id
        },
        renameSection: (serviceId, sectionId, title) =>
          set((state) => ({
            services: mapService(state.services, serviceId, (service) => ({
              ...service,
              sections: service.sections.map((section) =>
                section.id === sectionId
                  ? { ...section, title: sanitizeSingleLine(title, 80) }
                  : section,
              ),
            })),
            lastSavedAt: now(),
          })),
        deleteSection: (serviceId, sectionId) => {
          const state = get()
          const service = findService(state.services, serviceId)
          const target = service?.sections.find((section) => section.id === sectionId)
          if (!service || !target) return
          const removedIds = new Set(target.itemIds)
          const live = state.live && removedIds.has(
            service.items.find((item) => item.slides.some((slide) => slide.id === state.live?.currentSlideId))?.id ?? '',
          ) ? null : state.live
          set({
            services: mapService(state.services, serviceId, (entry) => ({
              ...entry,
              sections: entry.sections.filter((section) => section.id !== sectionId),
              items: entry.items.filter((item) => !removedIds.has(item.id)),
            })),
            live,
            selectedItemId: null,
            selectedSlideId: null,
            selectedElementId: null,
            lastSavedAt: now(),
          })
        },
        addItem: (serviceId, sectionId, item) => {
          set((state) => ({
            services: mapService(state.services, serviceId, (service) => ({
              ...service,
              sections: addItemToSections(service.sections, sectionId, item.id),
              items: [...service.items, item],
            })),
            selectedItemId: item.id,
            selectedSlideId: item.slides[0]?.id ?? null,
            selectedElementId: null,
            lastSavedAt: now(),
          }))
        },
        removeItem: (serviceId, itemId) => {
          const state = get()
          const service = findService(state.services, serviceId)
          const item = service?.items.find((entry) => entry.id === itemId)
          const live =
            state.live?.serviceId === serviceId &&
            item?.slides.some((slide) => slide.id === state.live?.currentSlideId)
              ? null
              : state.live
          set({
            services: mapService(state.services, serviceId, (entry) => ({
              ...entry,
              sections: entry.sections.map((section) => ({
                ...section,
                itemIds: section.itemIds.filter((id) => id !== itemId),
              })),
              items: entry.items.filter((entry) => entry.id !== itemId),
            })),
            live,
            selectedItemId: null,
            selectedSlideId: null,
            selectedElementId: null,
            lastSavedAt: now(),
          })
        },
        moveItem: (serviceId, itemId, direction) =>
          set((state) => ({
            services: mapService(state.services, serviceId, (service) => ({
              ...service,
              sections: service.sections.map((section) => {
                const index = section.itemIds.indexOf(itemId)
                if (index < 0) return section
                const next = index + direction
                if (next < 0 || next >= section.itemIds.length) return section
                const ids = [...section.itemIds]
                ;[ids[index], ids[next]] = [ids[next], ids[index]]
                return { ...section, itemIds: ids }
              }),
            })),
            lastSavedAt: now(),
          })),

        moveItemNextTo: (serviceId, itemId, targetItemId, side) =>
          set((state) => {
            if (itemId === targetItemId) return {}
            const service = findService(state.services, serviceId)
            if (!service?.sections.some((section) => section.itemIds.includes(targetItemId))) return {}
            if (!service.sections.some((section) => section.itemIds.includes(itemId))) return {}
            return {
              services: mapService(state.services, serviceId, (entry) => ({
                ...entry,
                sections: entry.sections.map((section) => {
                  const ids = section.itemIds.filter((id) => id !== itemId)
                  const at = ids.indexOf(targetItemId)
                  if (at >= 0) ids.splice(side === 'after' ? at + 1 : at, 0, itemId)
                  return ids.length === section.itemIds.length && ids.every((id, i) => id === section.itemIds[i])
                    ? section
                    : { ...section, itemIds: ids }
                }),
              })),
              lastSavedAt: now(),
            }
          }),

        moveItemToSection: (serviceId, itemId, sectionId) =>
          set((state) => {
            const service = findService(state.services, serviceId)
            if (!service?.sections.some((section) => section.id === sectionId)) return {}
            if (!service.sections.some((section) => section.itemIds.includes(itemId))) return {}
            return {
              services: mapService(state.services, serviceId, (entry) => ({
                ...entry,
                sections: entry.sections.map((section) => {
                  const ids = section.itemIds.filter((id) => id !== itemId)
                  if (section.id === sectionId) ids.push(itemId)
                  return ids.length === section.itemIds.length && ids.every((id, i) => id === section.itemIds[i])
                    ? section
                    : { ...section, itemIds: ids }
                }),
              })),
              lastSavedAt: now(),
            }
          }),

        moveSectionNextTo: (serviceId, sectionId, targetSectionId, side) =>
          set((state) => {
            if (sectionId === targetSectionId) return {}
            const service = findService(state.services, serviceId)
            const moving = service?.sections.find((section) => section.id === sectionId)
            if (!service || !moving || !service.sections.some((section) => section.id === targetSectionId)) return {}
            const sections = service.sections.filter((section) => section.id !== sectionId)
            const at = sections.findIndex((section) => section.id === targetSectionId)
            sections.splice(side === 'after' ? at + 1 : at, 0, moving)
            return {
              services: mapService(state.services, serviceId, (entry) => ({ ...entry, sections })),
              lastSavedAt: now(),
            }
          }),

        updateSlide: (serviceId, itemId, slideId, patch) =>
          set((state) => ({
            services: mapService(state.services, serviceId, (service) => ({
              ...service,
              items: service.items.map((item) =>
                item.id !== itemId
                  ? item
                  : {
                      ...item,
                      slides: item.slides.map((slide) =>
                        slide.id !== slideId
                          ? slide
                          : {
                              ...slide,
                              ...patch,
                              title:
                                patch.title !== undefined
                                  ? sanitizeSingleLine(patch.title, 200)
                                  : slide.title,
                              text:
                                patch.text !== undefined
                                  ? sanitizeText(patch.text, 12_000)
                                  : slide.text,
                              reference:
                                patch.reference !== undefined
                                  ? sanitizeSingleLine(patch.reference, 200)
                                  : slide.reference,
                              notes:
                                patch.notes !== undefined
                                  ? sanitizeText(patch.notes, 4000)
                                  : slide.notes,
                              background: patch.background
                                ? sanitizeBackground(patch.background)
                                : slide.background,
                              timer: patch.timer
                                ? { durationSeconds: clampTimerSeconds(patch.timer.durationSeconds) }
                                : slide.timer,
                              transition:
                                'transition' in patch ? normalizeTransition(patch.transition) : slide.transition,
                            },
                      ),
                    },
              ),
            })),
            // A new duration starts that timer over from the new value.
            timers:
              patch.timer && state.timers[slideId]
                ? Object.fromEntries(Object.entries(state.timers).filter(([id]) => id !== slideId))
                : state.timers,
            lastSavedAt: now(),
          })),
        updateNotes: (serviceId, itemId, slideId, notes) =>
          set((state) => ({
            services: mapService(state.services, serviceId, (service) => ({
              ...service,
              items: service.items.map((item) =>
                item.id !== itemId
                  ? item
                  : {
                      ...item,
                      slides: item.slides.map((slide) =>
                        slide.id === slideId
                          ? { ...slide, notes: sanitizeText(notes, 4000) }
                          : slide,
                      ),
                    },
              ),
            })),
            lastSavedAt: now(),
          })),
        setSlideBackground: (serviceId, itemId, slideId, background) =>
          set((state) => {
            const safe = sanitizeBackground(background)
            return {
              services: mapService(state.services, serviceId, (service) => ({
                ...service,
                items: service.items.map((item) =>
                  item.id !== itemId
                    ? item
                    : {
                        ...item,
                        slides: item.slides.map((slide) =>
                          slide.id === slideId ? { ...slide, background: safe } : slide,
                        ),
                      },
                ),
              })),
              lastSavedAt: now(),
            }
          }),
        addBlankSlide: (serviceId, itemId) => {
          const slide: Slide = {
            id: newId('slide'),
            kind: 'blank',
            title: translate(get().settings.locale, 'editor.blankSlide'),
            text: '',
            elements: [],
            background: { type: 'preset', preset: 'graphite', tone: 'dark' },
            textAlign: 'center',
          }
          set((state) => ({
            services: mapService(state.services, serviceId, (service) => ({
              ...service,
              items: service.items.map((item) =>
                item.id === itemId ? { ...item, slides: [...item.slides, slide] } : item,
              ),
            })),
            selectedItemId: itemId,
            selectedSlideId: slide.id,
            selectedElementId: null,
            lastSavedAt: now(),
          }))
        },
        moveSlide: (serviceId, itemId, slideId, toIndex) =>
          set((state) => {
            const service = findService(state.services, serviceId)
            const item = service?.items.find((entry) => entry.id === itemId)
            const from = item?.slides.findIndex((slide) => slide.id === slideId) ?? -1
            if (!item || from < 0) return {}
            const target = Math.max(0, Math.min(toIndex, item.slides.length - 1))
            if (target === from) return {}
            const slides = [...item.slides]
            const [moved] = slides.splice(from, 1)
            slides.splice(target, 0, moved)
            return {
              services: mapService(state.services, serviceId, (entry) => ({
                ...entry,
                items: entry.items.map((entryItem) => (entryItem.id === itemId ? { ...entryItem, slides } : entryItem)),
              })),
              lastSavedAt: now(),
            }
          }),
        duplicateSlide: (serviceId, itemId, slideId) => {
          const state = get()
          const service = findService(state.services, serviceId)
          const item = service?.items.find((entry) => entry.id === itemId)
          const index = item?.slides.findIndex((slide) => slide.id === slideId) ?? -1
          const source = index >= 0 ? item?.slides[index] : undefined
          if (!source) return
          const copy: Slide = {
            ...source,
            id: newId('slide'),
            elements: source.elements.map((element) => ({ ...element, id: newId('el') })),
          }
          set({
            services: mapService(state.services, serviceId, (entry) => ({
              ...entry,
              items: entry.items.map((entryItem) =>
                entryItem.id !== itemId
                  ? entryItem
                  : {
                      ...entryItem,
                      slides: [
                        ...entryItem.slides.slice(0, index + 1),
                        copy,
                        ...entryItem.slides.slice(index + 1),
                      ],
                    },
              ),
            })),
            selectedSlideId: copy.id,
            selectedElementId: null,
            lastSavedAt: now(),
          })
        },
        pasteSlide: (serviceId, itemId, source) => {
          const state = get()
          const service = findService(state.services, serviceId)
          const item = service?.items.find((entry) => entry.id === itemId)
          if (!item) return
          const currentIndex = item.slides.findIndex((slide) => slide.id === state.selectedSlideId)
          const insertAt = currentIndex >= 0 ? currentIndex + 1 : item.slides.length
          const copy: Slide = {
            ...source,
            id: newId('slide'),
            elements: source.elements.map((element) => ({ ...element, id: newId('el') })),
          }
          set({
            services: mapService(state.services, serviceId, (entry) => ({
              ...entry,
              items: entry.items.map((entryItem) =>
                entryItem.id !== itemId
                  ? entryItem
                  : {
                      ...entryItem,
                      slides: [
                        ...entryItem.slides.slice(0, insertAt),
                        copy,
                        ...entryItem.slides.slice(insertAt),
                      ],
                    },
              ),
            })),
            selectedItemId: itemId,
            selectedSlideId: copy.id,
            selectedElementId: null,
            lastSavedAt: now(),
          })
        },
        deleteSlide: (serviceId, itemId, slideId) => {
          const state = get()
          const service = findService(state.services, serviceId)
          const item = service?.items.find((entry) => entry.id === itemId)
          if (!item) return
          const live = state.live?.currentSlideId === slideId ? null : state.live
          if (item.slides.length <= 1) {
            get().removeItem(serviceId, itemId)
            return
          }
          const index = item.slides.findIndex((slide) => slide.id === slideId)
          const remaining = item.slides.filter((slide) => slide.id !== slideId)
          const next = remaining[Math.min(index, remaining.length - 1)]
          set({
            services: mapService(state.services, serviceId, (entry) => ({
              ...entry,
              items: entry.items.map((entryItem) =>
                entryItem.id === itemId ? { ...entryItem, slides: remaining } : entryItem,
              ),
            })),
            selectedSlideId: next.id,
            selectedItemId: itemId,
            selectedElementId: null,
            live,
            lastSavedAt: now(),
          })
        },

        addElement: (serviceId, itemId, slideId, element) => {
          set((state) => {
            const service = findService(state.services, serviceId)
            const item = service?.items.find((entry) => entry.id === itemId)
            const slide = item?.slides.find((entry) => entry.id === slideId)
            if (!slide) return state
            const maxZ = Math.max(0, ...slide.elements.map((entry) => entry.zIndex))
            const safeElement: SlideElement = fitElement({
              ...element,
              id: element.id || newId('el'),
              zIndex: maxZ + 1,
            })
            return {
              services: mapService(state.services, serviceId, (entry) => ({
                ...entry,
                items: entry.items.map((entryItem) =>
                  entryItem.id !== itemId
                    ? entryItem
                    : {
                        ...entryItem,
                        slides: entryItem.slides.map((entrySlide) =>
                          entrySlide.id === slideId
                            ? { ...entrySlide, elements: [...entrySlide.elements, safeElement] }
                            : entrySlide,
                        ),
                      },
                ),
              })),
              selectedElementId: safeElement.id,
              lastSavedAt: now(),
            }
          })
        },
        updateElement: (serviceId, itemId, slideId, elementId, patch) =>
          set((state) => ({
            services: mapService(state.services, serviceId, (service) => ({
              ...service,
              items: service.items.map((item) =>
                item.id !== itemId
                  ? item
                  : {
                      ...item,
                      slides: item.slides.map((slide) =>
                        slide.id !== slideId
                          ? slide
                          : {
                              ...slide,
                              elements: slide.elements.map((element) =>
                                element.id !== elementId
                                  ? element
                                  : fitElement({
                                      ...element,
                                      ...patch,
                                      settings: patch.settings
                                        ? { ...element.settings, ...patch.settings }
                                        : element.settings,
                                    }),
                              ),
                            },
                      ),
                    },
              ),
            })),
            lastSavedAt: now(),
          })),
        removeElement: (serviceId, itemId, slideId, elementId) =>
          set((state) => ({
            services: mapService(state.services, serviceId, (service) => ({
              ...service,
              items: service.items.map((item) =>
                item.id !== itemId
                  ? item
                  : {
                      ...item,
                      slides: item.slides.map((slide) =>
                        slide.id !== slideId
                          ? slide
                          : {
                              ...slide,
                              elements: slide.elements.filter((element) => element.id !== elementId),
                            },
                      ),
                    },
              ),
            })),
            selectedElementId: null,
            lastSavedAt: now(),
          })),
        duplicateElement: (serviceId, itemId, slideId, elementId) => {
          const service = findService(get().services, serviceId)
          const slide = service?.items
            .find((item) => item.id === itemId)
            ?.slides.find((entry) => entry.id === slideId)
          const source = slide?.elements.find((element) => element.id === elementId)
          if (!slide || !source) return
          const copy: SlideElement = fitElement({
            ...source,
            id: newId('el'),
            x: Math.min(92, source.x + 3),
            y: Math.min(92, source.y + 3),
            zIndex: Math.max(0, ...slide.elements.map((element) => element.zIndex)) + 1,
            settings: {
              ...source.settings,
              ...(source.settings?.message ? { message: { ...source.settings.message } } : {}),
            },
          })
          set((state) => ({
            services: mapService(state.services, serviceId, (service) => ({
              ...service,
              items: service.items.map((item) =>
                item.id !== itemId
                  ? item
                  : {
                      ...item,
                      slides: item.slides.map((slide) =>
                        slide.id === slideId
                          ? { ...slide, elements: [...slide.elements, copy] }
                          : slide,
                      ),
                    },
              ),
            })),
            selectedElementId: copy.id,
            lastSavedAt: now(),
          }))
        },
        reorderElement: (serviceId, itemId, slideId, elementId, action) => {
          const service = findService(get().services, serviceId)
          const slide = service?.items
            .find((item) => item.id === itemId)
            ?.slides.find((entry) => entry.id === slideId)
          if (!slide) return
          // The slide's own text (CONTENT_LAYER_ID) is ordered together with the elements.
          const reordered = reorderSlideLayers(slide, elementId, action)
          if (!reordered) return
          set((state) => ({
            services: mapService(state.services, serviceId, (service) => ({
              ...service,
              items: service.items.map((item) =>
                item.id !== itemId
                  ? item
                  : {
                      ...item,
                      slides: item.slides.map((entry) => (entry.id !== slideId ? entry : { ...entry, ...reordered })),
                    },
              ),
            })),
            lastSavedAt: now(),
          }))
        },
        updateItemTitle: (serviceId, itemId, title) =>
          set((state) => ({
            services: mapService(state.services, serviceId, (service) => ({
              ...service,
              items: service.items.map((item) =>
                item.id === itemId ? { ...item, title: sanitizeSingleLine(title, 200) } : item,
              ),
            })),
            lastSavedAt: now(),
          })),
        updateItemMetadata: (serviceId, itemId, patch) =>
          set((state) => ({
            services: mapService(state.services, serviceId, (service) => ({
              ...service,
              items: service.items.map((item) =>
                item.id === itemId
                  ? { ...item, metadata: { ...item.metadata, ...patch } }
                  : item,
              ),
            })),
          })),

        startLive: (serviceId, slideId) => {
          const state = get()
          const service = findService(state.services, serviceId)
          if (!service || service.status === 'archived') return false
          const slides = flatSlides(service)
          if (slides.length === 0) return false
          const start = slides.find((entry) => entry.slide.id === slideId) ?? slides[0]
          set({
            // Going live is what makes a service "active"; nothing starts on its own.
            services: state.services.map((entry) =>
              entry.id === serviceId ? { ...entry, status: 'active', updatedAt: now(), version: entry.version + 1 } : entry,
            ),
            live: {
              isLive: true,
              serviceId,
              currentSlideId: start.slide.id,
              history: [start.slide.id],
              startedAt: now(),
              blank: false,
              frozen: false,
              frozenSlideId: null,
              message: null,
              messageVisible: false,
            },
          })
          return true
        },
        endLive: () =>
          set((state) => ({
            live: null,
            services: state.live
              ? state.services.map((entry) =>
                  entry.id === state.live!.serviceId && entry.status === 'active'
                    ? { ...entry, status: 'completed', updatedAt: now(), version: entry.version + 1 }
                    : entry,
                )
              : state.services,
          })),
        nextLive: () => {
          const state = get()
          if (!state.live) return false
          const service = findService(state.services, state.live.serviceId)
          if (!service) return false
          const slides = flatSlides(service)
          const index = slides.findIndex((entry) => entry.slide.id === state.live?.currentSlideId)
          if (index < 0 || index >= slides.length - 1) return false
          const next = slides[index + 1]
          set({
            live: {
              ...state.live,
              currentSlideId: next.slide.id,
              history: [...state.live.history, next.slide.id].slice(-20),
            },
            // The editor, rundown and slide strip follow the slide on the audience screen.
            selectedItemId: next.item.id,
            selectedSlideId: next.slide.id,
            selectedElementId: null,
          })
          return true
        },
        prevLive: () => {
          const state = get()
          if (!state.live) return false
          const service = findService(state.services, state.live.serviceId)
          if (!service) return false
          const slides = flatSlides(service)
          const index = slides.findIndex((entry) => entry.slide.id === state.live?.currentSlideId)
          if (index <= 0) return false
          const prev = slides[index - 1]
          set({
            live: {
              ...state.live,
              currentSlideId: prev.slide.id,
              history: [...state.live.history, prev.slide.id].slice(-20),
            },
            // The editor, rundown and slide strip follow the slide on the audience screen.
            selectedItemId: prev.item.id,
            selectedSlideId: prev.slide.id,
            selectedElementId: null,
          })
          return true
        },
        jumpLive: (slideId) => {
          const state = get()
          if (!state.live) return false
          const service = findService(state.services, state.live.serviceId)
          if (!service) return false
          const target = flatSlides(service).find((entry) => entry.slide.id === slideId)
          if (!target) return false
          set({
            live: {
              ...state.live,
              currentSlideId: slideId,
              history: [...state.live.history, slideId].slice(-20),
            },
            selectedItemId: target.item.id,
            selectedSlideId: slideId,
            selectedElementId: null,
          })
          return true
        },
        toggleBlank: () =>
          set((state) => (state.live ? { live: { ...state.live, blank: !state.live.blank } } : {})),
        toggleFreeze: () =>
          set((state) =>
            state.live
              ? {
                  live: {
                    ...state.live,
                    frozen: !state.live.frozen,
                    frozenSlideId: state.live.frozen ? null : state.live.currentSlideId,
                  },
                }
              : {},
          ),
        setAudienceMessage: (message) =>
          set((state) =>
            state.live
              ? {
                  live: {
                    ...state.live,
                    message: sanitizeSingleLine(message, 300),
                    messageVisible: sanitizeSingleLine(message, 300).length > 0,
                  },
                }
              : {},
          ),
        clearAudienceMessage: () =>
          set((state) =>
            state.live ? { live: { ...state.live, message: null, messageVisible: false } } : {},
          ),
        setMessageVisible: (visible) =>
          set((state) =>
            state.live ? { live: { ...state.live, messageVisible: visible } } : {},
          ),

        timerCommand: (slideId, command) => {
          const state = get()
          let config: number | null = null
          for (const service of state.services) {
            const found = findSlide(service, slideId)
            if (found?.slide.kind === 'timer') {
              config = found.slide.timer?.durationSeconds ?? 0
              break
            }
          }
          if (config === null) return
          const current = state.timers[slideId] ?? createTimer(config)
          const at = Date.now()
          const next =
            command === 'start'
              ? startTimer(current, at)
              : command === 'pause'
                ? pauseTimer(current, at)
                : command === 'resume'
                  ? resumeTimer(current, at)
                  : resetTimer(createTimer(config))
          set({ timers: { ...state.timers, [slideId]: next } })
        },

        addMedia: (asset) =>
          set((state) => ({
            mediaLibrary: [asset, ...state.mediaLibrary].slice(0, 200),
          })),
        removeMedia: (id) => {
          const state = get()
          const asset = state.mediaLibrary.find((entry) => entry.id === id)
          set({ mediaLibrary: state.mediaLibrary.filter((entry) => entry.id !== id) })
          if (!asset || !isBlobUrl(asset.source)) return
          const referenced = [...state.services, ...state.otherChurchServices].some((service) =>
            serviceUsesSource(service, asset.source),
          )
          if (!referenced) revokeBlobUrl(asset.source)
        },
        recordRecentPassage: (passage) =>
          set((state) => ({
            recentPassages: [
              passage,
              ...state.recentPassages.filter(
                (entry) =>
                  entry.reference !== passage.reference ||
                  entry.translationId !== passage.translationId,
              ),
            ].slice(0, 8),
          })),
        recordRecentSong: (songId) =>
          set((state) => ({
            recentSongs: [songId, ...state.recentSongs.filter((id) => id !== songId)].slice(0, 8),
          })),

        createLibrarySong: (song) =>
          set((state) => ({ librarySongs: [...state.librarySongs, song], lastSavedAt: now() })),
        updateLibrarySong: (song) =>
          set((state) => ({
            librarySongs: state.librarySongs.map((s) => (s.id === song.id ? song : s)),
            lastSavedAt: now(),
          })),
        deleteLibrarySong: (id) =>
          set((state) => ({
            librarySongs: state.librarySongs.filter((s) => s.id !== id),
            lastSavedAt: now(),
          })),

        addCustomBible: (entry) => {
          const state = get()
          if (state.customBibles.length >= MAX_CUSTOM_BIBLES) {
            return { ok: false, reason: 'invalid' }
          }
          const existingIds = new Set([
            ...state.customBibles.map((item) => item.translation.id),
          ])
          if (existingIds.has(entry.translation.id)) {
            return { ok: false, reason: 'duplicate' }
          }
          const normalized = normalizeCustomBible(entry, existingIds)
          if (!normalized) return { ok: false, reason: 'invalid' }
          set((current) => ({
            customBibles: [...current.customBibles, normalized],
            lastSavedAt: now(),
          }))
          return { ok: true, id: normalized.translation.id }
        },
        updateCustomBible: (entry) => {
          const state = get()
          const index = state.customBibles.findIndex(
            (item) => item.translation.id === entry.translation.id,
          )
          if (index === -1) return { ok: false, reason: 'not-found' }
          const existingIds = new Set(
            state.customBibles
              .filter((_, position) => position !== index)
              .map((item) => item.translation.id),
          )
          const normalized = normalizeCustomBible(entry, existingIds)
          if (!normalized || normalized.translation.id !== entry.translation.id) {
            return { ok: false, reason: 'invalid' }
          }
          set((current) => ({
            customBibles: current.customBibles.map((item, position) =>
              position === index ? normalized : item,
            ),
            lastSavedAt: now(),
          }))
          return { ok: true, id: normalized.translation.id }
        },
        removeCustomBible: (translationId) => {
          if (isBundledBibleTranslation(translationId)) {
            return { ok: false, reason: 'bundled' }
          }
          const state = get()
          if (!state.customBibles.some((entry) => entry.translation.id === translationId)) {
            return { ok: false, reason: 'not-found' }
          }
          const resetTranslation =
            state.settings.defaultTranslationId === translationId ||
            state.settings.secondaryTranslationId === translationId
          set((current) => ({
            customBibles: current.customBibles.filter(
              (entry) => entry.translation.id !== translationId,
            ),
            recentPassages: current.recentPassages.filter(
              (entry) => entry.translationId !== translationId,
            ),
            settings: {
              ...current.settings,
              defaultTranslationId:
                current.settings.defaultTranslationId === translationId
                  ? 'web'
                  : current.settings.defaultTranslationId,
              secondaryTranslationId:
                current.settings.secondaryTranslationId === translationId
                  ? 'blivre'
                  : current.settings.secondaryTranslationId,
            },
            lastSavedAt: now(),
          }))
          return { ok: true, resetTranslation }
        },
        hideBibleTranslation: (translationId) => {
          if (!isBundledBibleTranslation(translationId)) {
            return { ok: false, reason: 'not-bundled' }
          }
          const state = get()
          const isVisible = (t: { id: string }) =>
            !state.hiddenBibleIds.includes(t.id) &&
            !state.archivedBibleIds.includes(t.id) &&
            !state.deletedBibleIds.includes(t.id) &&
            t.id !== translationId
          const visibleCount = allBibleTranslations().filter(isVisible).length
          if (visibleCount === 0) {
            return { ok: false, reason: 'last-visible' }
          }
          const resetTranslation =
            state.settings.defaultTranslationId === translationId ||
            state.settings.secondaryTranslationId === translationId
          const fallbackId = allBibleTranslations().find(isVisible)?.id ?? 'web'
          set((current) => ({
            hiddenBibleIds: [...current.hiddenBibleIds, translationId],
            recentPassages: current.recentPassages.filter(
              (entry) => entry.translationId !== translationId,
            ),
            settings: {
              ...current.settings,
              defaultTranslationId:
                current.settings.defaultTranslationId === translationId
                  ? fallbackId
                  : current.settings.defaultTranslationId,
              secondaryTranslationId:
                current.settings.secondaryTranslationId === translationId
                  ? fallbackId
                  : current.settings.secondaryTranslationId,
            },
            lastSavedAt: now(),
          }))
          return { ok: true, resetTranslation }
        },
        unhideBibleTranslation: (translationId) => {
          set((current) => ({
            hiddenBibleIds: current.hiddenBibleIds.filter((id) => id !== translationId),
            lastSavedAt: now(),
          }))
        },
        archiveBibleTranslation: (translationId) => {
          if (!isBundledBibleTranslation(translationId)) {
            return { ok: false, reason: 'not-bundled' }
          }
          const state = get()
          const isVisible = (t: { id: string }) =>
            !state.hiddenBibleIds.includes(t.id) &&
            !state.archivedBibleIds.includes(t.id) &&
            !state.deletedBibleIds.includes(t.id) &&
            t.id !== translationId
          const visibleCount = allBibleTranslations().filter(isVisible).length
          if (visibleCount === 0) {
            return { ok: false, reason: 'last-visible' }
          }
          const resetTranslation =
            state.settings.defaultTranslationId === translationId ||
            state.settings.secondaryTranslationId === translationId
          const fallbackId = allBibleTranslations().find(isVisible)?.id ?? 'web'
          set((current) => ({
            archivedBibleIds: [...current.archivedBibleIds, translationId],
            hiddenBibleIds: current.hiddenBibleIds.filter((id) => id !== translationId),
            recentPassages: current.recentPassages.filter(
              (entry) => entry.translationId !== translationId,
            ),
            settings: {
              ...current.settings,
              defaultTranslationId:
                current.settings.defaultTranslationId === translationId
                  ? fallbackId
                  : current.settings.defaultTranslationId,
              secondaryTranslationId:
                current.settings.secondaryTranslationId === translationId
                  ? fallbackId
                  : current.settings.secondaryTranslationId,
            },
            lastSavedAt: now(),
          }))
          return { ok: true, resetTranslation }
        },
        unarchiveBibleTranslation: (translationId) => {
          set((current) => ({
            archivedBibleIds: current.archivedBibleIds.filter((id) => id !== translationId),
            lastSavedAt: now(),
          }))
        },
        deleteBibleTranslation: (translationId) => {
          if (!isBundledBibleTranslation(translationId)) {
            return { ok: false, reason: 'not-bundled' }
          }
          const state = get()
          const visibleCount = allBibleTranslations().filter(
            (t) =>
              !state.hiddenBibleIds.includes(t.id) &&
              !state.archivedBibleIds.includes(t.id) &&
              !state.deletedBibleIds.includes(t.id) &&
              t.id !== translationId,
          ).length
          if (visibleCount === 0) {
            return { ok: false, reason: 'last-visible' }
          }
          const resetTranslation =
            state.settings.defaultTranslationId === translationId ||
            state.settings.secondaryTranslationId === translationId
          const visible = allBibleTranslations().find(
            (t) =>
              !state.hiddenBibleIds.includes(t.id) &&
              !state.archivedBibleIds.includes(t.id) &&
              !state.deletedBibleIds.includes(t.id) &&
              t.id !== translationId,
          )
          const fallbackId = visible?.id ?? 'web'
          set((current) => ({
            deletedBibleIds: [...current.deletedBibleIds, translationId],
            hiddenBibleIds: current.hiddenBibleIds.filter((id) => id !== translationId),
            archivedBibleIds: current.archivedBibleIds.filter((id) => id !== translationId),
            recentPassages: current.recentPassages.filter(
              (entry) => entry.translationId !== translationId,
            ),
            settings: {
              ...current.settings,
              defaultTranslationId:
                current.settings.defaultTranslationId === translationId
                  ? fallbackId
                  : current.settings.defaultTranslationId,
              secondaryTranslationId:
                current.settings.secondaryTranslationId === translationId
                  ? fallbackId
                  : current.settings.secondaryTranslationId,
            },
            lastSavedAt: now(),
          }))
          return { ok: true, resetTranslation }
        },
        updateMonitor: (id, patch) =>
          set((state) => ({
            monitors: state.monitors.map((monitor) =>
              monitor.id === id ? { ...monitor, ...patch, simulated: true } : monitor,
            ),
          })),
        assignMonitorRole: (id, role) =>
          set((state) => ({
            monitors: state.monitors.map((monitor) => {
              if (monitor.id === id) {
                return {
                  ...monitor,
                  role,
                  status: role === 'broadcast' ? 'unsupported' : role === 'disabled' ? monitor.status : 'ready',
                }
              }
              if (role !== 'disabled' && role !== 'broadcast' && monitor.role === role) {
                return { ...monitor, role: 'disabled' }
              }
              return monitor
            }),
          })),
        reconnectMonitor: (id) =>
          set((state) => ({
            monitors: state.monitors.map((monitor) =>
              monitor.id === id
                ? {
                    ...monitor,
                    status: monitor.role === 'broadcast' ? 'unsupported' : 'ready',
                  }
                : monitor,
            ),
          })),
        disconnectMonitor: (id) =>
          set((state) => ({
            monitors: state.monitors.map((monitor) =>
              monitor.id === id ? { ...monitor, status: 'disconnected' } : monitor,
            ),
          })),
        startTestPattern: (monitorId) => set({ testMonitorId: monitorId }),
        stopTestPattern: () => set({ testMonitorId: null }),

        importBackup: (parsed) =>
          set((state) => {
            const imported = parsed.services.map((service) => ({ ...service, churchId: state.churchId }))
            const first = imported[0]
            return {
              services: imported,
              settings: parsed.settings ? { ...state.settings, ...parsed.settings } : state.settings,
              ...(parsed.branding
                ? {
                    branding: parsed.branding,
                    brandingProfiles: { ...state.brandingProfiles, [state.churchId]: parsed.branding },
                  }
                : {}),
              monitors: parsed.monitors ?? state.monitors,
              mediaLibrary: parsed.media ?? state.mediaLibrary,
              customBibles: parsed.bibles ?? state.customBibles,
              hiddenBibleIds: parsed.hiddenBibleIds ?? state.hiddenBibleIds,
              archivedBibleIds: parsed.archivedBibleIds ?? state.archivedBibleIds,
              deletedBibleIds: parsed.deletedBibleIds ?? state.deletedBibleIds,
              activeServiceId: first.id,
              selectedItemId: first.items[0]?.id ?? null,
              selectedSlideId: first.items[0]?.slides[0]?.id ?? null,
              selectedElementId: null,
              live: null,
              timers: {},
              lastSavedAt: now(),
            }
          }),
        resetDemoData: () =>
          set((state) => {
            const services = createSeedServices()
            const first = services[0]
            return {
              services,
              ...resetSelectionForService(state, first),
              live: null,
              timers: {},
              lastSavedAt: now(),
            }
          }),
        clearAllData: () => {
          const blobSources = collectBlobSources(get())
          set({
            services: [],
            activeServiceId: null,
            selectedItemId: null,
            selectedSlideId: null,
            selectedElementId: null,
            branding: DEFAULT_BRANDING,
            churchId: DEFAULT_CHURCH_ID,
            otherChurchServices: [],
            brandingProfiles: { [DEFAULT_CHURCH_ID]: DEFAULT_BRANDING },
            settings: { ...DEFAULT_SETTINGS, showSetupChecklist: true },
            monitors: DEFAULT_MONITORS.map((monitor) => ({ ...monitor })),
            mediaLibrary: [],
            recentPassages: [],
            recentSongs: [],
            librarySongs: [],
            customBibles: [],
            hiddenBibleIds: [],
            archivedBibleIds: [],
            deletedBibleIds: [],
            live: null,
            testMonitorId: null,
            timers: {},
            lastSavedAt: now(),
          })
          for (const source of blobSources) revokeBlobUrl(source)
        },
      }
    },
    {
      name: 'church-presenter:workspace:v1',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: partializeWorkspace,
      merge: mergeWorkspace,
    },
  ),
)

// Keep the Bible provider registry in sync with persisted and imported Bibles.
setCustomBibleTranslations(useAppStore.getState().customBibles)
setHiddenBibleIds(useAppStore.getState().hiddenBibleIds)
setArchivedBibleIds(useAppStore.getState().archivedBibleIds)
setDeletedBibleIds(useAppStore.getState().deletedBibleIds)
useAppStore.subscribe((state) => {
  setCustomBibleTranslations(state.customBibles)
  setHiddenBibleIds(state.hiddenBibleIds)
  setArchivedBibleIds(state.archivedBibleIds)
  setDeletedBibleIds(state.deletedBibleIds)
})

// Imported Bible text lives in IndexedDB (see bibleTextStore). Load it back into the
// entries that arrived without it, then keep IndexedDB in step with every change.
// Each successful save re-persists the workspace so localStorage drops the inline text.
let bibleTextSync: Promise<void> = Promise.resolve()
function queueBibleTextSync(entries: CustomBibleTranslation[]) {
  bibleTextSync = bibleTextSync
    .then(() => syncBibleTexts(entries))
    .then((saved) => {
      if (saved) useAppStore.setState({})
    })
}

const bibleTextsLoaded = loadBibleTexts(useAppStore.getState().customBibles).then((loaded) => {
  if (Object.keys(loaded).length > 0) {
    useAppStore.setState((state) => ({
      customBibles: state.customBibles.map((entry) => {
        const books = loaded[entry.translation.id]
        if (!books || Object.keys(entry.books).length > 0) return entry
        const otherIds = new Set(
          state.customBibles.filter((other) => other !== entry).map((other) => other.translation.id),
        )
        return normalizeCustomBible({ translation: entry.translation, books }, otherIds) ?? entry
      }),
    }))
  }
  queueBibleTextSync(useAppStore.getState().customBibles)
  useAppStore.subscribe((state, previous) => {
    if (state.customBibles !== previous.customBibles) queueBibleTextSync(state.customBibles)
  })
})

/** Resolves once every imported Bible text change so far is saved in IndexedDB. */
export async function whenBibleTextsSaved(): Promise<void> {
  await bibleTextsLoaded.catch(() => undefined)
  await bibleTextSync.catch(() => undefined)
}

export { flatSlides }
export type { AppState }
