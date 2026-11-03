import { describe, expect, it } from 'vitest'
import { createServiceSkeleton } from '../store/serviceUtils'
import { serviceReadiness, timeUntilService } from '../utils/serviceReadiness'
import type { Service, SlideItem } from '../types'

function item(id: string, type: SlideItem['type'], slides = 1): SlideItem {
  return { id, type, title: id, slides: Array.from({ length: slides }, () => ({}) as SlideItem['slides'][number]) }
}

function withItems(service: Service, items: SlideItem[]): Service {
  return {
    ...service,
    items,
    sections: service.sections.map((section, index) => ({ ...section, itemIds: index === 0 ? items.map((entry) => entry.id) : [] })),
  }
}

describe('serviceReadiness', () => {
  const base = createServiceSkeleton({ title: 'Sunday', date: '2026-11-08', time: '10:00', locale: 'en' })

  it('counts every check and rounds the percentage', () => {
    const ready = withItems({ ...base, sections: [base.sections[0]] }, [item('song', 'song'), item('verse', 'bible')])
    const result = serviceReadiness(ready, { hasAudienceOutput: true })
    expect(result.checks.every((check) => check.done)).toBe(true)
    expect(result.percent).toBe(100)
  })

  it('flags empty sections, missing content and items without slides', () => {
    const partial = withItems({ ...base, sections: [base.sections[0], { id: 'empty', title: 'Empty', itemIds: [] }] }, [
      item('song', 'song', 0),
    ])
    const result = serviceReadiness(partial, { hasAudienceOutput: false })
    const done = Object.fromEntries(result.checks.map((check) => [check.key, check.done]))
    expect(done).toEqual({
      'home.readySections': false,
      'home.readySongs': true,
      'home.readyScripture': false,
      'home.readySlides': false,
      'home.readyOutput': false,
    })
    expect(result.percent).toBe(20)
  })

  it('ignores items that no section uses', () => {
    const orphan = { ...withItems({ ...base, sections: [base.sections[0]] }, []), items: [item('song', 'song')] }
    expect(serviceReadiness(orphan, { hasAudienceOutput: false }).checks[1].done).toBe(false)
  })
})

describe('timeUntilService', () => {
  it('returns whole days and hours before the start', () => {
    expect(timeUntilService({ date: '2026-11-08', time: '10:00' }, new Date('2026-11-06T07:30:00'))).toEqual({ days: 2, hours: 2 })
  })

  it('returns null once the service has started', () => {
    expect(timeUntilService({ date: '2026-11-08', time: '10:00' }, new Date('2026-11-08T10:00:00'))).toBeNull()
  })
})
