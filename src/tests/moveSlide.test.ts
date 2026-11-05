import { beforeEach, describe, expect, it } from 'vitest'
import { useAppStore } from '../store/useAppStore'
import { createServiceSkeleton } from '../store/serviceUtils'
import type { Slide, SlideItem } from '../types'

function slide(id: string): Slide {
  return { id, elements: [], background: { type: 'preset', preset: 'graphite', tone: 'dark' } } as unknown as Slide
}

function setup() {
  const base = createServiceSkeleton({ title: 'Sunday', date: '2026-11-08', time: '10:00', locale: 'en' })
  const item: SlideItem = { id: 'item', type: 'song', title: 'Song', slides: ['a', 'b', 'c', 'd'].map(slide) }
  const other: SlideItem = { id: 'other', type: 'song', title: 'Other', slides: ['x', 'y'].map(slide) }
  const service = {
    ...base,
    items: [item, other],
    sections: base.sections.map((section, index) => ({ ...section, itemIds: index === 0 ? ['item', 'other'] : [] })),
  }
  useAppStore.setState({ services: [service] })
  return service.id
}

function order(itemId = 'item') {
  return useAppStore.getState().services[0].items.find((entry) => entry.id === itemId)!.slides.map((entry) => entry.id)
}

describe('moveSlide', () => {
  let serviceId: string
  beforeEach(() => {
    serviceId = setup()
  })

  it('moves a slide forward and backward within its item', () => {
    useAppStore.getState().moveSlide(serviceId, 'item', 'a', 2)
    expect(order()).toEqual(['b', 'c', 'a', 'd'])
    useAppStore.getState().moveSlide(serviceId, 'item', 'd', 0)
    expect(order()).toEqual(['d', 'b', 'c', 'a'])
  })

  it('clamps out-of-range targets and leaves other items alone', () => {
    useAppStore.getState().moveSlide(serviceId, 'item', 'b', 99)
    expect(order()).toEqual(['a', 'c', 'd', 'b'])
    useAppStore.getState().moveSlide(serviceId, 'item', 'c', -5)
    expect(order()).toEqual(['c', 'a', 'd', 'b'])
    expect(order('other')).toEqual(['x', 'y'])
  })

  it('ignores unknown slides', () => {
    useAppStore.getState().moveSlide(serviceId, 'item', 'x', 0)
    expect(order()).toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('moveItemNextTo', () => {
  it('moves an item before or after another item', () => {
    const serviceId = setup()
    const ids = () => useAppStore.getState().services[0].sections[0].itemIds
    useAppStore.getState().moveItemNextTo(serviceId, 'other', 'item', 'before')
    expect(ids()).toEqual(['other', 'item'])
    useAppStore.getState().moveItemNextTo(serviceId, 'other', 'item', 'after')
    expect(ids()).toEqual(['item', 'other'])
  })
})
