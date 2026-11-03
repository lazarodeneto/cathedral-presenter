import type { Service, ServiceSection, ServiceStatus, SlideItem } from '../types'
import { sanitizeSingleLine, sanitizeText } from '../security/text'
import {
  inferStatus,
  isValidDate,
  isValidTime,
  localToday,
  MAX_DESCRIPTION,
  MAX_LEADER,
  MAX_NOTES,
  MAX_TITLE,
  normalizeTransition,
  SERVICE_STATUSES,
} from './culto'

/**
 * Repair service details from older saves, backups or hand-edited data.
 * Every field is checked on its own; anything missing or invalid gets a safe
 * value, so a damaged field never makes the whole service unusable.
 */
export function normalizeServiceMeta(
  content: { id: string; sections: ServiceSection[]; items: SlideItem[] },
  raw: Record<string, unknown>,
  churchId: string,
): Service {
  const date = isValidDate(raw.date) ? raw.date : localToday()
  const time = isValidTime(raw.time) ? raw.time : '10:00'
  const endTime = isValidTime(raw.endTime) && raw.endTime > time ? raw.endTime : undefined
  const base = { date, time, endTime }
  const status = SERVICE_STATUSES.includes(raw.status as ServiceStatus) ? (raw.status as ServiceStatus) : inferStatus(base)
  const before = raw.statusBeforeArchive as ServiceStatus
  const now = new Date().toISOString()
  const text = (value: unknown, max: number) => (typeof value === 'string' ? sanitizeText(value, max) : '')
  return {
    ...content,
    churchId,
    title: sanitizeSingleLine(raw.title, MAX_TITLE) || 'Imported service',
    date,
    time,
    endTime,
    eventType: sanitizeSingleLine(raw.eventType, 80) || undefined,
    // A service cannot still be "active" after a reload or import: no live session exists.
    status: status === 'active' ? 'scheduled' : status,
    statusBeforeArchive:
      status === 'archived' && before && before !== 'archived' && SERVICE_STATUSES.includes(before)
        ? (before as Exclude<ServiceStatus, 'archived'>)
        : undefined,
    leader: sanitizeSingleLine(raw.leader, MAX_LEADER) || undefined,
    description: text(raw.description, MAX_DESCRIPTION) || undefined,
    notes: text(raw.notes, MAX_NOTES) || undefined,
    transition: normalizeTransition(raw.transition),
    duplicatedFromId: sanitizeSingleLine(raw.duplicatedFromId, 140) || undefined,
    createdAt: sanitizeSingleLine(raw.createdAt, 40) || now,
    updatedAt: sanitizeSingleLine(raw.updatedAt, 40) || now,
    version: typeof raw.version === 'number' && Number.isInteger(raw.version) && raw.version > 0 ? raw.version : 1,
  }
}

/** Bring a stored service up to the current model (used when loading saved data). */
export function upgradeService(service: Service, churchId: string): Service {
  const raw = service as unknown as Record<string, unknown>
  return normalizeServiceMeta(
    { id: service.id, sections: service.sections, items: service.items },
    raw,
    typeof raw.churchId === 'string' && raw.churchId ? raw.churchId : churchId,
  )
}
