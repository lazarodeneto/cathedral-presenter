import type {
  FlatSlide,
  Locale,
  Service,
  ServiceSection,
  Slide,
  SlideItem,
} from '../types'
import { newId } from '../utils/id'
import { makeSlide } from '../utils/slides'
import { formatLongDate } from '../utils/dates'
import { translate } from '../i18n/dictionary'
import { DEFAULT_CHURCH_ID } from '../utils/church'

export function createServiceSkeleton(input: {
  title: string
  date: string
  time: string
  eventType?: string
  locale: Locale
  churchId?: string
}): Service {
  const title = input.title.trim() || translate(input.locale, 'home.newServiceTitle')
  const welcomeSlide = makeSlide({
    kind: 'title',
    title: translate(input.locale, 'section.welcome'),
    text: `${title}\n${formatLongDate(input.date, input.locale)}`,
    background: { type: 'preset', preset: 'dawn', tone: 'dark' },
    textAlign: 'center',
  })
  const welcomeItem: SlideItem = {
    id: newId('item'),
    type: 'announcement',
    title: translate(input.locale, 'section.welcome'),
    slides: [welcomeSlide],
    metadata: { provider: 'Local service content' },
  }
  const now = new Date().toISOString()
  return {
    id: newId('service'),
    churchId: input.churchId ?? DEFAULT_CHURCH_ID,
    title,
    date: input.date,
    time: input.time,
    eventType: input.eventType,
    status: 'scheduled',
    version: 1,
    sections: [
      { id: newId('section'), title: translate(input.locale, 'section.welcome'), itemIds: [welcomeItem.id] },
      { id: newId('section'), title: translate(input.locale, 'section.worship'), itemIds: [] },
      { id: newId('section'), title: translate(input.locale, 'section.message'), itemIds: [] },
      { id: newId('section'), title: translate(input.locale, 'section.response'), itemIds: [] },
    ],
    items: [welcomeItem],
    createdAt: now,
    updatedAt: now,
  }
}

export function addItemToSections(
  sections: ServiceSection[],
  sectionId: string,
  itemId: string,
): ServiceSection[] {
  let placed = false
  const cleaned = sections.map((section) => ({
    ...section,
    itemIds: section.itemIds.filter((id) => id !== itemId),
  }))
  const result = cleaned.map((section) => {
    if (section.id !== sectionId) return section
    placed = true
    return { ...section, itemIds: [...section.itemIds, itemId] }
  })
  if (!placed) {
    const fallback = result[result.length - 1]
    if (fallback) fallback.itemIds.push(itemId)
  }
  return result
}

export function flatSlides(service: Service): FlatSlide[] {
  const slides: FlatSlide[] = []
  const seen = new Set<string>()
  for (const section of service.sections) {
    for (const itemId of section.itemIds) {
      if (seen.has(itemId)) continue
      const item = service.items.find((entry) => entry.id === itemId)
      if (!item) continue
      seen.add(itemId)
      for (const slide of item.slides) {
        slides.push({ slide, item, section, index: slides.length })
      }
    }
  }
  const leftovers = service.items.filter((item) => !seen.has(item.id))
  if (leftovers.length) {
    const section: ServiceSection = {
      id: '__unassigned',
      title: translate('en', 'section.other'),
      itemIds: leftovers.map((item) => item.id),
    }
    for (const item of leftovers) {
      for (const slide of item.slides) {
        slides.push({ slide, item, section, index: slides.length })
      }
    }
  }
  return slides
}

export function slideContext(service: Service, slideId: string): FlatSlide | null {
  return flatSlides(service).find((entry) => entry.slide.id === slideId) ?? null
}

export function nextSlide(service: Service, slideId: string): FlatSlide | null {
  const slides = flatSlides(service)
  const index = slides.findIndex((entry) => entry.slide.id === slideId)
  return index >= 0 ? slides[index + 1] ?? null : null
}

export function previousSlide(service: Service, slideId: string): FlatSlide | null {
  const slides = flatSlides(service)
  const index = slides.findIndex((entry) => entry.slide.id === slideId)
  return index > 0 ? slides[index - 1] : null
}

export function serviceSlideCount(service: Service): number {
  return flatSlides(service).length
}

export function findItem(service: Service, itemId: string): SlideItem | null {
  return service.items.find((item) => item.id === itemId) ?? null
}

export function findSlideInService(service: Service, slideId: string): Slide | null {
  for (const item of service.items) {
    const slide = item.slides.find((entry) => entry.id === slideId)
    if (slide) return slide
  }
  return null
}

function cloneSlide(slide: Slide): Slide {
  return {
    ...slide,
    id: newId('slide'),
    elements: slide.elements.map((element) => ({
      ...element,
      id: newId('el'),
      settings: element.settings
        ? { ...element.settings, ...(element.settings.message ? { message: { ...element.settings.message } } : {}) }
        : undefined,
    })),
    timer: slide.timer ? { ...slide.timer } : undefined,
    transition: slide.transition ? { ...slide.transition } : undefined,
    background: { ...slide.background },
    bible: slide.bible
      ? {
          primary: { ...slide.bible.primary },
          secondary: slide.bible.secondary ? { ...slide.bible.secondary } : undefined,
        }
      : undefined,
  }
}

export function cloneService(service: Service, title: string): Service {
  const now = new Date().toISOString()
  const itemMap = new Map<string, string>()
  const items = service.items.map((item) => {
    const id = newId('item')
    itemMap.set(item.id, id)
    return {
      ...item,
      id,
      slides: item.slides.map(cloneSlide),
      metadata: item.metadata ? { ...item.metadata } : undefined,
    }
  })
  return {
    ...service,
    id: newId('service'),
    title,
    sections: service.sections.map((section) => ({
      ...section,
      id: newId('section'),
      itemIds: section.itemIds
        .map((itemId) => itemMap.get(itemId))
        .filter((itemId): itemId is string => Boolean(itemId)),
    })),
    items,
    status: 'draft',
    statusBeforeArchive: undefined,
    transition: service.transition ? { ...service.transition } : undefined,
    duplicatedFromId: service.id,
    createdAt: now,
    updatedAt: now,
    version: 1,
  }
}

export function serviceSectionForItem(service: Service, itemId: string): ServiceSection | null {
  return service.sections.find((section) => section.itemIds.includes(itemId)) ?? null
}
