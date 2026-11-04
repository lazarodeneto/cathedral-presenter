import { DEFAULT_BRANDING } from '../utils/branding'
import { describe, expect, it } from 'vitest'
import { buildOutputSnapshot } from '../store/outputState'
import { createServiceSkeleton } from '../store/serviceUtils'
import { createAnnouncementItem } from '../utils/slides'
import type { Branding, LiveSession, Monitor, Service } from '../types'

const branding: Branding = { ...DEFAULT_BRANDING, name: 'Campus Algarve', logoUrl: null }
const monitors: Monitor[] = [
  {
    id: 'monitor_audience',
    name: 'Main Output',
    displayName: 'Audience Display',
    role: 'audience',
    status: 'ready',
    width: 1920,
    height: 1080,
    fullscreen: true,
    simulated: true,
  },
  {
    id: 'monitor_confidence',
    name: 'Confidence',
    displayName: 'Stage Display',
    role: 'confidence',
    status: 'ready',
    width: 1280,
    height: 720,
    fullscreen: false,
    simulated: true,
  },
]

function makeService(): Service {
  const service = createServiceSkeleton({
    title: 'Sunday Morning',
    date: '2026-11-01',
    time: '10:00',
    locale: 'en',
  })
  const item = createAnnouncementItem('Announcements', 'This week at Grace')
  item.slides[0].notes = 'Keep this up for thirty seconds.'
  return {
    ...service,
    sections: service.sections.map((section, index) =>
      index === 0 ? { ...section, itemIds: [...section.itemIds, item.id] } : section,
    ),
    items: [...service.items, item],
  }
}

function liveFor(service: Service, overrides: Partial<LiveSession> = {}): LiveSession {
  const item = service.items[0]
  const currentSlideId = item.slides[0].id
  return {
    isLive: true,
    serviceId: service.id,
    currentSlideId,
    history: [currentSlideId],
    startedAt: '2026-11-01T10:00:00.000Z',
    blank: false,
    frozen: false,
    frozenSlideId: null,
    message: null,
    messageVisible: false,
    ...overrides,
  }
}

describe('output snapshots', () => {
  it('publishes current and next slides with the live position', () => {
    const service = makeService()
    const live = liveFor(service)
    const snapshot = buildOutputSnapshot({ service, live, monitors, branding, testMonitorId: null })

    expect(snapshot.audience).toMatchObject({
      mode: 'live',
      slide: service.items[0].slides[0],
      monitorName: 'Main Output',
      isFrozen: false,
    })
    expect(snapshot.confidence).toMatchObject({
      mode: 'live',
      current: service.items[0].slides[0],
      next: service.items[1].slides[0],
      notes: null,
      position: '1 / 2',
      monitorName: 'Confidence',
      startedAt: '2026-11-01T10:00:00.000Z',
    })
  })

  it('keeps the frozen slide on the audience output while confidence follows live', () => {
    const service = makeService()
    const live = liveFor(service, {
      currentSlideId: service.items[1].slides[0].id,
      frozen: true,
      frozenSlideId: service.items[0].slides[0].id,
    })
    const snapshot = buildOutputSnapshot({ service, live, monitors, branding, testMonitorId: null })

    expect(snapshot.audience.slide).toBe(service.items[0].slides[0])
    expect(snapshot.audience.isFrozen).toBe(true)
    expect(snapshot.confidence.current).toBe(service.items[1].slides[0])
    expect(snapshot.confidence.notes).toBe('Keep this up for thirty seconds.')
  })

  it('blackouts the audience output without ending confidence output', () => {
    const service = makeService()
    const live = liveFor(service, { blank: true })
    const snapshot = buildOutputSnapshot({ service, live, monitors, branding, testMonitorId: null })

    expect(snapshot.audience.mode).toBe('blank')
    expect(snapshot.audience.slide).not.toBeNull()
    expect(snapshot.confidence.mode).toBe('live')
  })

  it('routes test patterns by monitor role', () => {
    const service = makeService()
    const live = liveFor(service)
    const audienceTest = buildOutputSnapshot({
      service,
      live,
      monitors,
      branding,
      testMonitorId: 'monitor_audience',
    })
    expect(audienceTest.audience).toMatchObject({ mode: 'test', slide: null, testMonitorName: 'Main Output' })
    expect(audienceTest.confidence.mode).toBe('live')

    const confidenceTest = buildOutputSnapshot({
      service,
      live,
      monitors,
      branding,
      testMonitorId: 'monitor_confidence',
    })
    expect(confidenceTest.confidence).toMatchObject({
      mode: 'test',
      current: null,
      next: null,
      testMonitorName: 'Confidence',
    })
    expect(confidenceTest.audience.mode).toBe('live')
  })

  it('returns idle outputs with no live session or service', () => {
    const snapshot = buildOutputSnapshot({
      service: null,
      live: null,
      monitors,
      branding,
      testMonitorId: null,
    })

    expect(snapshot.audience).toMatchObject({ mode: 'idle', slide: null, monitorName: 'Main Output' })
    expect(snapshot.confidence).toMatchObject({
      mode: 'idle',
      current: null,
      next: null,
      position: null,
      startedAt: null,
    })
  })

  it('exposes message visibility only when a message exists', () => {
    const service = makeService()
    const hidden = buildOutputSnapshot({
      service,
      live: liveFor(service, { message: 'Welcome', messageVisible: false }),
      monitors,
      branding,
      testMonitorId: null,
    })
    expect(hidden.audience.message).toBe('Welcome')
    expect(hidden.audience.messageVisible).toBe(false)

    const shown = buildOutputSnapshot({
      service,
      live: liveFor(service, { message: 'Welcome', messageVisible: true }),
      monitors,
      branding,
      testMonitorId: null,
    })
    expect(shown.audience.messageVisible).toBe(true)
  })
})
