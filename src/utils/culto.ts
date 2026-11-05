import type { Service, ServiceStatus, SlideItem, SlideTransition, TransitionType } from '../types'
import { flatSlides } from '../store/serviceUtils'

export const SERVICE_STATUSES: ServiceStatus[] = ['draft', 'scheduled', 'active', 'completed', 'archived']
export const SERVICE_TYPES = [
  'Sunday Service',
  'Bible Study',
  'Youth',
  'Class',
  'Special Service',
  'Prayer Meeting',
] as const
export const SERVICE_TYPE_KEYS: Record<(typeof SERVICE_TYPES)[number], string> = {
  'Sunday Service': 'event.sundayService',
  'Bible Study': 'event.bibleStudy',
  Youth: 'event.youth',
  Class: 'event.class',
  'Special Service': 'event.specialService',
  'Prayer Meeting': 'event.prayerMeeting',
}
export const TRANSITION_TYPES: TransitionType[] = ['fade', 'cut', 'slide', 'zoom']
export const DEFAULT_TRANSITION: SlideTransition = { type: 'fade', durationMs: 600 }
export const MAX_TITLE = 160
export const MAX_LEADER = 80
export const MAX_PASTOR = 120
export const MAX_WORSHIP = 120
export const MAX_GUESTS = 240
export const MAX_DESCRIPTION = 600
export const MAX_NOTES = 4000

/* ───────── Dates and times (church-local wall clock) ───────── */

export function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d && y >= 2000 && y <= 2100
}

export function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))

export function durationMinutes(service: Pick<Service, 'time' | 'endTime'>): number | null {
  if (!service.endTime || !isValidTime(service.time) || !isValidTime(service.endTime)) return null
  return minutes(service.endTime) - minutes(service.time)
}

/** Today's date in the church's local time (this computer's time zone). */
export function localToday(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'local time'
  } catch {
    return 'local time'
  }
}

/** Sortable "YYYY-MM-DDTHH:MM" key in local time. */
export const startKey = (service: Pick<Service, 'date' | 'time'>) => `${service.date}T${service.time || '00:00'}`

export function isPast(service: Pick<Service, 'date' | 'time' | 'endTime'>, now = new Date()): boolean {
  const today = localToday(now)
  if (service.date !== today) return service.date < today
  const end = service.endTime ?? service.time
  const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  return end < current
}

/* ───────── Validation ───────── */

export interface CultoForm {
  title: string
  date: string
  time: string
  endTime: string
  eventType: string
  status: ServiceStatus
  leader: string
  pastor: string
  worship: string
  guests: string
  description: string
  notes: string
  transition: SlideTransition
}

export type CultoField = 'title' | 'date' | 'time' | 'endTime' | 'leader' | 'pastor' | 'worship' | 'guests' | 'description' | 'notes' | 'status' | 'transition'
export type CultoError =
  | 'required'
  | 'too-long'
  | 'invalid-date'
  | 'invalid-time'
  | 'end-before-start'
  | 'invalid-status'
  | 'invalid-transition'

export function validateCulto(form: CultoForm): Partial<Record<CultoField, CultoError>> {
  const errors: Partial<Record<CultoField, CultoError>> = {}
  const title = form.title.trim()
  if (!title) errors.title = 'required'
  else if (title.length > MAX_TITLE) errors.title = 'too-long'
  if (!form.date) errors.date = 'required'
  else if (!isValidDate(form.date)) errors.date = 'invalid-date'
  if (!form.time) errors.time = 'required'
  else if (!isValidTime(form.time)) errors.time = 'invalid-time'
  if (form.endTime) {
    if (!isValidTime(form.endTime)) errors.endTime = 'invalid-time'
    else if (!errors.time && minutes(form.endTime) <= minutes(form.time)) errors.endTime = 'end-before-start'
  }
  if (form.leader.trim().length > MAX_LEADER) errors.leader = 'too-long'
  if (form.pastor.trim().length > MAX_PASTOR) errors.pastor = 'too-long'
  if (form.worship.trim().length > MAX_WORSHIP) errors.worship = 'too-long'
  if (form.guests.trim().length > MAX_GUESTS) errors.guests = 'too-long'
  if (form.description.length > MAX_DESCRIPTION) errors.description = 'too-long'
  if (form.notes.length > MAX_NOTES) errors.notes = 'too-long'
  if (!SERVICE_STATUSES.includes(form.status)) errors.status = 'invalid-status'
  if (!TRANSITION_TYPES.includes(form.transition.type) || !(form.transition.durationMs >= 0 && form.transition.durationMs <= 3000)) {
    errors.transition = 'invalid-transition'
  }
  return errors
}

/** `fallback` is the transition shown when the service has none of its own (the Settings default). */
export function formFromService(service: Service, fallback: SlideTransition = DEFAULT_TRANSITION): CultoForm {
  return {
    title: service.title,
    date: service.date,
    time: service.time,
    endTime: service.endTime ?? '',
    eventType: service.eventType ?? '',
    status: service.status,
    leader: service.leader ?? '',
    pastor: service.pastor ?? '',
    worship: service.worship ?? '',
    guests: service.guests ?? '',
    description: service.description ?? '',
    notes: service.notes ?? '',
    transition: service.transition ?? fallback,
  }
}

export function normalizeTransition(value: unknown): SlideTransition | undefined {
  if (!value || typeof value !== 'object') return undefined
  const record = value as Record<string, unknown>
  if (!TRANSITION_TYPES.includes(record.type as TransitionType)) return undefined
  const duration = typeof record.durationMs === 'number' && Number.isFinite(record.durationMs) ? record.durationMs : DEFAULT_TRANSITION.durationMs
  return { type: record.type as TransitionType, durationMs: Math.min(3000, Math.max(0, Math.round(duration))) }
}

/**
 * Status for services saved before statuses existed: past services are
 * completed, others scheduled. Nothing becomes "active" this way; that only
 * happens when a service actually goes live.
 */
export function inferStatus(service: Pick<Service, 'date' | 'time' | 'endTime'>, now = new Date()): ServiceStatus {
  return isPast(service, now) ? 'completed' : 'scheduled'
}

/* ───────── Where an item came from ───────── */

export type ItemOrigin = 'song-library' | 'bible-library' | 'media-library' | 'template' | 'here'

/**
 * Everything in a culto is a copy: songs, Scripture, templates and media are
 * copied in when added, so later library edits or deletions never change a
 * service that already uses them (and editing the copy never changes the library).
 */
export function itemOrigin(item: Pick<SlideItem, 'type' | 'metadata'>): ItemOrigin {
  if (item.type === 'song') return 'song-library'
  if (item.type === 'bible') return 'bible-library'
  if (item.type === 'media') return 'media-library'
  if (item.metadata?.provider?.toLowerCase().includes('template')) return 'template'
  return 'here'
}

/* ───────── Presentation readiness ───────── */

export type ReadinessProblem = 'no-slides' | 'archived'

/** Why a service cannot be presented, or null. Individual broken slides are shown safely instead. */
export function presentationProblem(service: Service): ReadinessProblem | null {
  if (service.status === 'archived') return 'archived'
  if (flatSlides(service).length === 0) return 'no-slides'
  return null
}

/* ───────── Listing ───────── */

export type ServiceView = 'upcoming' | 'past' | 'draft' | 'scheduled' | 'active' | 'archived' | 'all'
export type ServiceSort = 'date-asc' | 'date-desc' | 'title' | 'status' | 'updated'

export interface ServiceQuery {
  view: ServiceView
  search: string
  status: ServiceStatus | ''
  type: string
  leader: string
  from: string
  to: string
  sort: ServiceSort
}

export const DEFAULT_QUERY: ServiceQuery = {
  view: 'upcoming',
  search: '',
  status: '',
  type: '',
  leader: '',
  from: '',
  to: '',
  sort: 'date-asc',
}

export function inView(service: Service, view: ServiceView, now = new Date()): boolean {
  switch (view) {
    case 'all':
      return true
    case 'archived':
      return service.status === 'archived'
    case 'upcoming':
      return service.status !== 'archived' && !isPast(service, now)
    case 'past':
      return service.status !== 'archived' && isPast(service, now)
    default:
      return service.status === view
  }
}

const STATUS_ORDER: Record<ServiceStatus, number> = { active: 0, scheduled: 1, draft: 2, completed: 3, archived: 4 }

export function queryServices(services: Service[], query: ServiceQuery, now = new Date()): Service[] {
  const needle = query.search.trim().toLowerCase()
  const leader = query.leader.trim().toLowerCase()
  const result = services.filter((service) => {
    if (!inView(service, query.view, now)) return false
    if (query.status && service.status !== query.status) return false
    if (query.type && service.eventType !== query.type) return false
    if (leader && !(service.leader ?? '').toLowerCase().includes(leader)) return false
    if (query.from && service.date < query.from) return false
    if (query.to && service.date > query.to) return false
    if (needle) {
      const haystack = [service.title, service.description, service.notes, service.eventType, service.leader, service.pastor, service.worship, service.guests].join(' ').toLowerCase()
      if (!haystack.includes(needle)) return false
    }
    return true
  })
  const compare: Record<ServiceSort, (a: Service, b: Service) => number> = {
    'date-asc': (a, b) => startKey(a).localeCompare(startKey(b)),
    'date-desc': (a, b) => startKey(b).localeCompare(startKey(a)),
    title: (a, b) => a.title.localeCompare(b.title),
    status: (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || startKey(a).localeCompare(startKey(b)),
    updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
  }
  return result.sort(compare[query.sort])
}

export function viewCounts(services: Service[], now = new Date()): Record<ServiceView, number> {
  const views: ServiceView[] = ['upcoming', 'past', 'draft', 'scheduled', 'active', 'archived', 'all']
  return Object.fromEntries(views.map((view) => [view, services.filter((service) => inView(service, view, now)).length])) as Record<
    ServiceView,
    number
  >
}
