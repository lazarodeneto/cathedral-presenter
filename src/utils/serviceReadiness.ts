import type { Service } from '../types'

export interface ReadinessCheck {
  /** i18n key for the check's label. */
  key: string
  done: boolean
}

export interface ServiceReadiness {
  checks: ReadinessCheck[]
  /** 0–100, rounded. */
  percent: number
}

/**
 * How prepared a service is to run, as a short list of checks for the Home
 * readiness ring. Only reads the service; the caller says whether an audience
 * output is configured.
 */
export function serviceReadiness(service: Service, { hasAudienceOutput }: { hasAudienceOutput: boolean }): ServiceReadiness {
  const items = service.items.filter((item) => service.sections.some((section) => section.itemIds.includes(item.id)))
  const checks: ReadinessCheck[] = [
    {
      key: 'home.readySections',
      done: service.sections.length > 0 && service.sections.every((section) => section.itemIds.length > 0),
    },
    { key: 'home.readySongs', done: items.some((item) => item.type === 'song') },
    { key: 'home.readyScripture', done: items.some((item) => item.type === 'bible') },
    { key: 'home.readySlides', done: items.length > 0 && items.every((item) => item.slides.length > 0) },
    { key: 'home.readyOutput', done: hasAudienceOutput },
  ]
  const done = checks.filter((check) => check.done).length
  return { checks, percent: Math.round((done / checks.length) * 100) }
}

/** Whole days and hours from `now` until the service starts; null once it has started. */
export function timeUntilService(service: Pick<Service, 'date' | 'time'>, now: Date): { days: number; hours: number } | null {
  const start = new Date(`${service.date}T${service.time || '00:00'}:00`)
  const diff = start.getTime() - now.getTime()
  if (!Number.isFinite(diff) || diff <= 0) return null
  const totalHours = Math.floor(diff / 3_600_000)
  return { days: Math.floor(totalHours / 24), hours: totalHours % 24 }
}
