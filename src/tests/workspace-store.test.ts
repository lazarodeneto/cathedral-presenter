import { beforeEach, describe, expect, it } from 'vitest'
import { useAppStore } from '../store/useAppStore'
import { DEFAULT_CHURCH_ID } from '../utils/church'
import { makeTextElement } from '../utils/slides'

const STORAGE_KEY = 'church-presenter:workspace:v1'

function slideWithElements(minimum = 1) {
  const initial = useAppStore.getState()
  const service = initial.services[0]
  const item = service.items[0]
  const slide = item.slides[0]
  for (let index = 0; index < Math.max(minimum, 2); index += 1) {
    useAppStore
      .getState()
      .addElement(service.id, item.id, slide.id, makeTextElement(`Item ${index}`))
  }
  const updated = useAppStore.getState().services.find((entry) => entry.id === service.id)!
  const updatedItem = updated.items.find((entry) => entry.id === item.id)!
  const updatedSlide = updatedItem.slides.find((entry) => entry.id === slide.id)!
  return { service: updated, item: updatedItem, slide: updatedSlide }
}

describe('workspace store', () => {
  beforeEach(() => {
    useAppStore.getState().resetDemoData()
  })

  it('duplicates an element on the requested slide, not the selected slide', () => {
    const { service, item, slide } = slideWithElements()
    const other = service.items.flatMap((entry) => entry.slides).find((entry) => entry.id !== slide.id)!
    useAppStore.getState().selectService(service.id)
    useAppStore.getState().selectItem(item.id)
    useAppStore.getState().selectSlide(item.id, other.id)

    const element = slide.elements[0]
    useAppStore.getState().duplicateElement(service.id, item.id, slide.id, element.id)

    const updated = useAppStore.getState().services.find((entry) => entry.id === service.id)!
    const target = updated.items.flatMap((entry) => entry.slides).find((entry) => entry.id === slide.id)!
    const selected = updated.items.flatMap((entry) => entry.slides).find((entry) => entry.id === other.id)!
    expect(target.elements).toHaveLength(slide.elements.length + 1)
    expect(selected.elements).toHaveLength(other.elements.length)
  })

  it('reorders elements on the requested slide, not the selected slide', () => {
    const { service, item, slide } = slideWithElements(2)
    const other = service.items.flatMap((entry) => entry.slides).find((entry) => entry.id !== slide.id)!
    useAppStore.getState().selectService(service.id)
    useAppStore.getState().selectItem(item.id)
    useAppStore.getState().selectSlide(item.id, other.id)

    const element = [...slide.elements].sort((a, b) => a.zIndex - b.zIndex)[0]
    const previous = slide.elements.map((entry) => entry.zIndex)
    useAppStore.getState().reorderElement(service.id, item.id, slide.id, element.id, 'front')

    const updated = useAppStore.getState().services.find((entry) => entry.id === service.id)!
    const target = updated.items.flatMap((entry) => entry.slides).find((entry) => entry.id === slide.id)!
    const selected = updated.items.flatMap((entry) => entry.slides).find((entry) => entry.id === other.id)!
    expect(target.elements.map((entry) => entry.zIndex)).not.toEqual(previous)
    expect(selected.elements).toEqual(other.elements)
  })

  it('clears every church and resets the active church on clearAllData', () => {
    const service = useAppStore.getState().services[0]
    useAppStore.setState({
      churchId: 'other-church',
      otherChurchServices: [{ ...service, id: 'other-service', churchId: 'other-church' }],
    })

    useAppStore.getState().clearAllData()

    const state = useAppStore.getState()
    expect(state.services).toEqual([])
    expect(state.otherChurchServices).toEqual([])
    expect(state.churchId).toBe(DEFAULT_CHURCH_ID)
    expect(state.brandingProfiles).toEqual({ [DEFAULT_CHURCH_ID]: state.branding })
  })

  it('does not persist transient blob backgrounds', () => {
    const { service, item, slide } = slideWithElements()
    useAppStore.getState().selectService(service.id)
    useAppStore.getState().selectItem(item.id)
    useAppStore.getState().selectSlide(item.id, slide.id)
    useAppStore
      .getState()
      .setSlideBackground(service.id, item.id, slide.id, { type: 'image', source: 'blob:preview' })

    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).not.toBeNull()
    expect(raw).not.toContain('blob:preview')
    const persisted = JSON.parse(raw!) as {
      state: { services: { items: { slides: { id: string; background: { type: string } }[] }[] }[] }
    }
    const persistedSlide = persisted.state.services[0].items
      .flatMap((entry) => entry.slides)
      .find((entry) => entry.id === slide.id)
    expect(persistedSlide?.background.type).toBe('preset')
  })
})
