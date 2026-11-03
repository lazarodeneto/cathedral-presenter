import { describe, expect, it } from 'vitest'
import {
  addItemToSections,
  cloneService,
  createServiceSkeleton,
  flatSlides,
  nextSlide,
  previousSlide,
  serviceSectionForItem,
  slideContext,
} from '../store/serviceUtils'
import { createAnnouncementItem, makeSlide } from '../utils/slides'
import type { Service } from '../types'

function serviceWithItems(): Service {
  const service = createServiceSkeleton({
    title: 'Sunday Morning',
    date: '2026-11-01',
    time: '10:00',
    eventType: 'Sunday Service',
    locale: 'en',
  })
  const item = createAnnouncementItem('Announcements', 'This week')
  const orphan = {
    id: 'item_orphan',
    type: 'announcement' as const,
    title: 'Orphan',
    slides: [makeSlide({ kind: 'body', title: 'Orphan', text: 'Unplaced' })],
  }
  return {
    ...service,
    sections: [
      ...service.sections.map((section, index) =>
        index === 0 ? { ...section, itemIds: [service.items[0].id, item.id] } : section,
      ),
    ],
    items: [...service.items, item, orphan],
  }
}

describe('service slide navigation', () => {
  it('flattens sections in order and deduplicates item ids', () => {
    const service = serviceWithItems()
    service.sections[0].itemIds.push(service.items[0].id)
    const slides = flatSlides(service)

    expect(slides.map((entry) => entry.item.title)).toEqual([
      'Welcome',
      'Announcements',
      'Orphan',
    ])
    expect(slides.map((entry) => entry.index)).toEqual([0, 1, 2])
    expect(slides[2].section.id).toBe('__unassigned')
  })

  it('walks slides across section boundaries', () => {
    const service = serviceWithItems()
    const slides = flatSlides(service)
    const first = slides[0]
    const second = slides[1]

    expect(nextSlide(service, first.slide.id)?.slide.id).toBe(second.slide.id)
    expect(previousSlide(service, second.slide.id)?.slide.id).toBe(first.slide.id)
    expect(previousSlide(service, first.slide.id)).toBeNull()
    expect(nextSlide(service, slides.at(-1)!.slide.id)).toBeNull()
    expect(slideContext(service, second.slide.id)?.item.title).toBe('Announcements')
  })

  it('moves an item between sections without duplicating it', () => {
    const service = serviceWithItems()
    const itemId = service.items[0].id
    const destination = service.sections[2].id
    const sections = addItemToSections(service.sections, destination, itemId)

    expect(sections[0].itemIds).not.toContain(itemId)
    expect(sections[2].itemIds).toContain(itemId)
    expect(sections.flatMap((section) => section.itemIds).filter((id) => id === itemId)).toHaveLength(1)
  })

  it('puts an item in the last section when the destination no longer exists', () => {
    const service = serviceWithItems()
    const itemId = service.items[0].id
    const sections = addItemToSections(service.sections, 'missing-section', itemId)

    expect(sections.at(-1)?.itemIds).toContain(itemId)
  })

  it('finds the section that owns an item', () => {
    const service = serviceWithItems()
    const itemId = service.items[1].id
    expect(serviceSectionForItem(service, itemId)?.title).toBe('Welcome')
    expect(serviceSectionForItem(service, 'missing')).toBeNull()
  })
})

describe('service duplication', () => {
  it('creates fresh service, section, item, slide, and element ids', () => {
    const service = serviceWithItems()
    service.items[1].slides[0].elements = [
      {
        id: 'el_original',
        type: 'text',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        zIndex: 1,
        opacity: 1,
        visible: true,
        text: 'Hello',
      },
    ]

    const duplicate = cloneService(service, 'Sunday Evening')
    expect(duplicate.id).not.toBe(service.id)
    expect(duplicate.duplicatedFromId).toBe(service.id)
    expect(duplicate.sections).toHaveLength(service.sections.length)
    expect(duplicate.items).toHaveLength(service.items.length)
    expect(duplicate.sections[0].id).not.toBe(service.sections[0].id)
    expect(duplicate.items[0].id).not.toBe(service.items[0].id)
    expect(duplicate.items[0].slides[0].id).not.toBe(service.items[0].slides[0].id)
    expect(duplicate.items[1].slides[0].elements[0].id).not.toBe('el_original')
  })

  it('remaps section references to the duplicated item ids', () => {
    const service = serviceWithItems()
    const duplicate = cloneService(service, 'Copy')
    const duplicateItemIds = new Set(duplicate.items.map((item) => item.id))

    for (const section of duplicate.sections) {
      for (const itemId of section.itemIds) {
        expect(duplicateItemIds.has(itemId)).toBe(true)
      }
    }
  })
})
