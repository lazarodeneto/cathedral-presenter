import { BIBLE_TRANSLATIONS } from '../data/bible'
import type {
  AppSettings,
  BackgroundPreset,
  Branding,
  ContentType,
  CustomBibleTranslation,
  ElementType,
  Locale,
  MediaAsset,
  Monitor,
  MonitorRole,
  MonitorStatus,
  ScriptureBlock,
  Service,
  ServiceSection,
  Slide,
  SlideBackground,
  SlideElement,
  SlideItem,
  SlideKind,
  TextAlign,
} from '../types'
import { LOCALES } from '../types'
import { BACKGROUND_PRESETS } from '../data/templates'
import { validateImageDataUrl, MAX_BACKUP_BYTES } from './media'
import { sanitizeSingleLine, sanitizeText } from './text'
import { newId } from '../utils/id'
import { clampTimerSeconds } from '../utils/timer'
import { normalizeTransition } from '../utils/culto'
import { normalizeBranding } from '../utils/branding'
import { normalizeServiceMeta } from '../utils/cultoNormalize'
import { DEFAULT_CHURCH_ID } from '../utils/church'
import { normalizeOverrides } from '../shortcuts/bindings'
import { clampMessageBox, normalizeMessageStyle } from '../utils/messageBox'
import { sanitizeCustomBibleTranslations } from '../providers/bible/customBibles'

const SECRET_KEY = /(token|secret|password|passwd|oauth|authorization|credential|api[_-]?key|private[_-]?key)/i
const ID_PATTERN = /^[A-Za-z0-9_-]{1,140}$/
const MAX_SERVICES = 500
const MAX_SECTIONS = 100
const MAX_ITEMS = 600
const MAX_SLIDES = 200
const MAX_ELEMENTS = 120

export function redactSecrets<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => redactSecrets(entry)) as T
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEY.test(key)) continue
      result[key] = redactSecrets(entry)
    }
    return result as T
  }
  return value
}

export interface BackupData {
  app: 'church-presenter'
  version: 1
  exportedAt: string
  services: Service[]
  settings: AppSettings
  branding: Branding
  monitors: Monitor[]
  media: Omit<MediaAsset, 'source'>[]
  bibles: CustomBibleTranslation[]
  hiddenBibleIds?: string[]
  archivedBibleIds?: string[]
  deletedBibleIds?: string[]
}

export function buildBackup(input: {
  services: Service[]
  settings: AppSettings
  branding: Branding
  monitors: Monitor[]
  media: MediaAsset[]
  bibles?: CustomBibleTranslation[]
  hiddenBibleIds?: string[]
  archivedBibleIds?: string[]
  deletedBibleIds?: string[]
}): BackupData {
  const media = input.media.map(({ source: _source, ...asset }) => ({
    ...asset,
    status: 'missing' as const,
  }))
  return redactSecrets({
    app: 'church-presenter' as const,
    version: 1 as const,
    exportedAt: new Date().toISOString(),
    services: input.services,
    settings: { ...input.settings, lastBackupAt: new Date().toISOString() },
    branding: input.branding,
    monitors: input.monitors,
    media,
    bibles: sanitizeCustomBibleTranslations(input.bibles ?? []),
    hiddenBibleIds: input.hiddenBibleIds ?? [],
    archivedBibleIds: input.archivedBibleIds ?? [],
    deletedBibleIds: input.deletedBibleIds ?? [],
  })
}

export interface ParsedBackup {
  services: Service[]
  settings: AppSettings | null
  branding: Branding | null
  monitors: Monitor[] | null
  media: MediaAsset[] | null
  bibles: CustomBibleTranslation[] | null
  hiddenBibleIds: string[] | null
  archivedBibleIds: string[] | null
  deletedBibleIds: string[] | null
}

type Obj = Record<string, unknown>

function obj(value: unknown): Obj | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Obj) : null
}

function str(value: unknown, max = 500): string {
  return sanitizeText(value, max)
}

function oneLine(value: unknown, max = 200): string {
  return sanitizeSingleLine(value, max)
}

function num(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function safeId(value: unknown, prefix: string, seen: Set<string>): string {
  const candidate = typeof value === 'string' && ID_PATTERN.test(value) ? value : ''
  if (candidate && !seen.has(candidate)) {
    seen.add(candidate)
    return candidate
  }
  let next = newId(prefix)
  while (seen.has(next)) next = newId(prefix)
  seen.add(next)
  return next
}

function allowed<T extends string>(value: unknown, list: readonly T[], fallback: T): T {
  return typeof value === 'string' && (list as readonly string[]).includes(value)
    ? (value as T)
    : fallback
}

const SLIDE_KINDS: readonly SlideKind[] = [
  'title',
  'body',
  'lyrics',
  'scripture',
  'announcement',
  'sermon',
  'media',
  'blank',
  'timer',
]
const CONTENT_TYPES: readonly ContentType[] = ['song', 'bible', 'announcement', 'sermon', 'blank', 'media', 'timer']
const ELEMENT_TYPES: readonly ElementType[] = ['text', 'image', 'video', 'shape', 'qr', 'embed', 'message']
const ALIGNMENTS: readonly TextAlign[] = ['left', 'center', 'right']
const PRESETS = BACKGROUND_PRESETS.map((preset) => preset.id)
const MONITOR_ROLES: readonly MonitorRole[] = ['audience', 'confidence', 'broadcast', 'disabled']
const MONITOR_STATUSES: readonly MonitorStatus[] = ['ready', 'connecting', 'disconnected', 'test', 'unsupported']

function normalizeBackground(value: unknown): SlideBackground {
  const record = obj(value)
  const preset = allowed<BackgroundPreset>(record?.preset, PRESETS, 'graphite')
  const type = record?.type === 'image' && typeof record.source === 'string' && validateImageDataUrl(record.source, 2_500_000) ? 'image' : 'preset'
  const tone = BACKGROUND_PRESETS.find((entry) => entry.id === preset)?.tone ?? 'dark'
  return {
    type,
    preset,
    source: type === 'image' ? (record?.source as string) : undefined,
    overlay: num(record?.overlay, 0, 1, 0.35),
    tone,
  }
}

function normalizeBlock(value: unknown): ScriptureBlock | null {
  const record = obj(value)
  if (!record) return null
  const text = str(record.text, 12_000)
  if (!text) return null
  return {
    translationId: oneLine(record.translationId, 60) || 'imported',
    translationName: oneLine(record.translationName, 120) || 'Imported translation',
    abbreviation: oneLine(record.abbreviation, 16) || 'BIB',
    language: allowed<Locale>(record.language, LOCALES, 'en'),
    reference: oneLine(record.reference, 160),
    text,
    licenseType: oneLine(record.licenseType, 80) || 'unknown',
    copyrightNotice: str(record.copyrightNotice, 2000) || undefined,
    sourceUrl: oneLine(record.sourceUrl, 500) || undefined,
  }
}

const MOTIONS = ['pulse', 'float', 'spin', 'drift', 'sway'] as const
/** CSS functions that would load or run something from a style value (fill, colour…). */
const UNSAFE_STYLE = /url\s*\(|image-set\s*\(|expression\s*\(|@import|javascript:/i

/**
 * Imported element settings: drop string values that could fetch a remote
 * resource through CSS (a crafted backup could otherwise track who opens it),
 * cap their length, and keep the template-only fields to known values.
 */
function safeElementSettings(settings: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(settings)) {
    if (typeof entry === 'string') {
      if (UNSAFE_STYLE.test(entry)) continue
      out[key] = entry.slice(0, 2000)
    } else {
      out[key] = entry
    }
  }
  if (typeof settings.motion === 'string' && (MOTIONS as readonly string[]).includes(settings.motion)) out.motion = settings.motion
  else delete out.motion
  if ('videoSlot' in settings) out.videoSlot = settings.videoSlot === true
  return out
}

function normalizeElement(value: unknown, seen: Set<string>): SlideElement | null {
  const record = obj(value)
  if (!record) return null
  const settings = obj(record.settings) ?? {}
  const type = allowed<ElementType>(record.type, ELEMENT_TYPES, 'text')
  const element: SlideElement = {
    id: safeId(record.id, 'el', seen),
    type,
    x: num(record.x, -50, 150, 10),
    y: num(record.y, -50, 150, 10),
    width: num(record.width, 1, 200, 50),
    height: num(record.height, 1, 200, 30),
    zIndex: Math.round(num(record.zIndex, 0, 10_000, 1)),
    opacity: num(record.opacity, 0, 1, 1),
    visible: bool(record.visible, true),
    text: record.text === undefined ? undefined : str(record.text, 12_000),
    source:
      typeof record.source === 'string' && /^(https:|blob:|data:image\/(?:png|jpeg|webp|gif|avif);base64,)/.test(record.source)
        ? record.source.slice(0, 5_000_000)
        : undefined,
    settings: {
      ...(safeElementSettings(redactSecrets(settings) as Record<string, unknown>) as SlideElement['settings']),
      fontSize: num(settings.fontSize, 8, 200, 64),
      ...(type === 'message' ? { message: normalizeMessageStyle(settings.message) } : {}),
    },
  }
  return type === 'message' ? { ...element, ...clampMessageBox(element) } : element
}

function normalizeSlide(value: unknown, seen: Set<string>): Slide | null {
  const record = obj(value)
  if (!record) return null
  const elementsRecord = Array.isArray(record.elements) ? record.elements : []
  const elements = elementsRecord
    .slice(0, MAX_ELEMENTS)
    .map((element) => normalizeElement(element, seen))
    .filter((element): element is SlideElement => Boolean(element))
  const bibleRecord = obj(record.bible)
  const primary = normalizeBlock(bibleRecord?.primary)
  const secondary = normalizeBlock(bibleRecord?.secondary)
  const kind = allowed<SlideKind>(record.kind, SLIDE_KINDS, 'body')
  return {
    id: safeId(record.id, 'slide', seen),
    kind,
    title: oneLine(record.title, 200),
    text: str(record.text, 12_000),
    reference: oneLine(record.reference, 200) || undefined,
    translationId: oneLine(record.translationId, 60) || undefined,
    bible: primary ? { primary, secondary: secondary ?? undefined } : undefined,
    elements,
    background: normalizeBackground(record.background),
    textAlign: allowed<TextAlign>(record.textAlign, ALIGNMENTS, 'center'),
    notes: str(record.notes, 4_000) || undefined,
    transition: normalizeTransition(record.transition),
    timer:
      kind === 'timer'
        ? { durationSeconds: clampTimerSeconds(obj(record.timer)?.durationSeconds) }
        : undefined,
  }
}

function normalizeItem(value: unknown, idSeen: Set<string>, slideSeen: Set<string>): SlideItem | null {
  const record = obj(value)
  if (!record) return null
  const slidesRecord = Array.isArray(record.slides) ? record.slides : []
  const slides = slidesRecord
    .slice(0, MAX_SLIDES)
    .map((slide) => normalizeSlide(slide, slideSeen))
    .filter((slide): slide is Slide => Boolean(slide))
  if (slides.length === 0) return null
  const metadataRecord = obj(record.metadata)
  return {
    id: safeId(record.id, 'item', idSeen),
    type: allowed<ContentType>(record.type, CONTENT_TYPES, 'blank'),
    title: oneLine(record.title, 200) || 'Imported item',
    slides,
    metadata: metadataRecord
      ? {
          provider: oneLine(metadataRecord.provider, 160) || undefined,
          sourceLabel: oneLine(metadataRecord.sourceLabel, 160) || undefined,
          license: str(metadataRecord.license, 2000) || undefined,
          author: oneLine(metadataRecord.author, 160) || undefined,
          songKey: oneLine(metadataRecord.songKey, 12) || undefined,
          sourceId: oneLine(metadataRecord.sourceId, 200) || undefined,
        }
      : undefined,
  }
}

function normalizeService(value: unknown, serviceSeen: Set<string>): Service | null {
  const record = obj(value)
  if (!record) return null
  const idSeen = new Set<string>()
  const slideSeen = new Set<string>()
  const itemsRecord = Array.isArray(record.items) ? record.items : []
  const items = itemsRecord
    .slice(0, MAX_ITEMS)
    .map((item) => normalizeItem(item, idSeen, slideSeen))
    .filter((item): item is SlideItem => Boolean(item))
  if (items.length === 0) return null
  const itemIds = new Set(items.map((item) => item.id))
  const sectionsRecord = Array.isArray(record.sections) ? record.sections : []
  let sections: ServiceSection[] = sectionsRecord
    .slice(0, MAX_SECTIONS)
    .map((entry) => {
      const sectionRecord = obj(entry)
      if (!sectionRecord) return null
      const sectionIds = Array.isArray(sectionRecord.itemIds) ? sectionRecord.itemIds : []
      return {
        id: safeId(sectionRecord.id, 'section', idSeen),
        title: oneLine(sectionRecord.title, 160) || 'Imported section',
        itemIds: sectionIds.filter(
          (itemId): itemId is string => typeof itemId === 'string' && itemIds.has(itemId),
        ),
      }
    })
    .filter((section): section is ServiceSection => Boolean(section))
  if (sections.length === 0) {
    sections = [{ id: newId('section'), title: 'Imported', itemIds: items.map((item) => item.id) }]
  }
  const used = new Set(sections.flatMap((section) => section.itemIds))
  const unused = items.filter((item) => !used.has(item.id)).map((item) => item.id)
  if (unused.length) sections[sections.length - 1].itemIds.push(...unused)
  return normalizeServiceMeta(
    {
      id: safeId(record.id, 'service', serviceSeen),
      sections,
      items,
    },
    record,
    // Imported services always join the church doing the import (set again by importBackup).
    DEFAULT_CHURCH_ID,
  )
}

function normalizeMonitors(value: unknown): Monitor[] | null {
  if (!Array.isArray(value)) return null
  const seen = new Set<string>()
  return value.slice(0, 12).map((entry) => {
    const record = obj(entry) ?? {}
    return {
      id: safeId(record.id, 'monitor', seen),
      name: oneLine(record.name, 80) || 'Output',
      displayName: oneLine(record.displayName, 160) || 'Display',
      role: allowed<MonitorRole>(record.role, MONITOR_ROLES, 'disabled'),
      status: allowed<MonitorStatus>(record.status, MONITOR_STATUSES, 'disconnected'),
      width: Math.round(num(record.width, 320, 16_384, 1920)),
      height: Math.round(num(record.height, 240, 16_384, 1080)),
      fullscreen: bool(record.fullscreen, false),
      simulated: true,
    }
  })
}

function normalizeMedia(value: unknown): MediaAsset[] | null {
  if (!Array.isArray(value)) return null
  const seen = new Set<string>()
  return value.slice(0, 500).map((entry) => {
    const record = obj(entry) ?? {}
    const kind = record.kind === 'video' ? 'video' : 'image'
    return {
      id: safeId(record.id, 'media', seen),
      name: oneLine(record.name, 160) || 'Imported media',
      kind,
      mime: oneLine(record.mime, 120),
      size: Math.round(num(record.size, 0, 1_000_000_000, 0)),
      source: '',
      status: 'missing' as const,
      addedAt: oneLine(record.addedAt, 40) || new Date().toISOString(),
      localOnly: false,
      provider: allowed<MediaAsset['provider']>(record.provider, ['upload', 'url', 'youtube'], 'upload'),
    }
  })
}

const bibleTranslationIds = new Set(BIBLE_TRANSLATIONS.map((translation) => translation.id))

function validTranslationId(value: unknown, fallback: string, ids: Set<string>) {
  return typeof value === 'string' && ids.has(value) ? value : fallback
}

function normalizeSettings(value: unknown, translationIds: Set<string>): AppSettings | null {
  const record = obj(value)
  if (!record) return null
  return {
    locale: allowed<Locale>(record.locale, LOCALES, 'en'),
    defaultTranslationId: validTranslationId(record.defaultTranslationId, 'web', translationIds),
    secondaryTranslationId: validTranslationId(
      record.secondaryTranslationId,
      'blivre',
      translationIds,
    ),
    reducedTransparency: bool(record.reducedTransparency),
    glassOpacity: num(record.glassOpacity, 0.55, 1, 0.8),
    reducedMotion: bool(record.reducedMotion),
    shortcutsEnabled: bool(record.shortcutsEnabled, true),
    shortcutOverrides: normalizeOverrides(record.shortcutOverrides),
    transition: allowed(record.transition, ['fade', 'cut', 'slide', 'zoom'] as const, 'fade'),
    transitionDuration: num(record.transitionDuration, 0.1, 3, 1),
    lastBackupAt: oneLine(record.lastBackupAt, 40) || null,
    showSetupChecklist: bool(record.showSetupChecklist, true),
    defaultSectionTitle: oneLine(record.defaultSectionTitle, 80) || 'Message',
  }
}

export function parseBackup(raw: string): ParsedBackup {
  if (raw.length > MAX_BACKUP_BYTES) throw new Error('backup-too-large')
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('invalid-json')
  }
  const root = obj(parsed)
  if (!root || root.app !== 'church-presenter' || root.version !== 1) {
    throw new Error('invalid-backup')
  }
  const servicesRecord = Array.isArray(root.services) ? root.services : []
  const serviceSeen = new Set<string>()
  const services = servicesRecord
    .slice(0, MAX_SERVICES)
    .map((service) => normalizeService(service, serviceSeen))
    .filter((service): service is Service => Boolean(service))
  if (services.length === 0) throw new Error('empty-backup')

  const brandingRecord = obj(root.branding)
  const branding: Branding | null = brandingRecord ? normalizeBranding(brandingRecord) : null

  const bibles = Array.isArray(root.bibles) ? sanitizeCustomBibleTranslations(root.bibles) : null
  const translationIds = new Set([
    ...bibleTranslationIds,
    ...(bibles ?? []).map((entry) => entry.translation.id),
  ])

  const hiddenBibleIds = Array.isArray(root.hiddenBibleIds)
    ? root.hiddenBibleIds.filter(
        (id): id is string => typeof id === 'string' && bibleTranslationIds.has(id),
      )
    : null

  const archivedBibleIds = Array.isArray(root.archivedBibleIds)
    ? root.archivedBibleIds.filter(
        (id): id is string => typeof id === 'string' && bibleTranslationIds.has(id),
      )
    : null

  const deletedBibleIds = Array.isArray(root.deletedBibleIds)
    ? root.deletedBibleIds.filter(
        (id): id is string => typeof id === 'string' && bibleTranslationIds.has(id),
      )
    : null

  return {
    services,
    settings: normalizeSettings(root.settings, translationIds),
    branding,
    monitors: normalizeMonitors(root.monitors),
    media: normalizeMedia(root.media),
    bibles,
    hiddenBibleIds,
    archivedBibleIds,
    deletedBibleIds,
  }
}
