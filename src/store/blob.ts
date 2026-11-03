import type { MediaAsset, Service, SlideBackground } from '../types'

export function isBlobUrl(source: string | undefined): boolean {
  return Boolean(source?.startsWith('blob:'))
}

export function revokeBlobUrl(source: string | undefined) {
  if (isBlobUrl(source) && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
    URL.revokeObjectURL(source!)
  }
}

export function serviceUsesSource(service: Service, source: string): boolean {
  return service.items.some((item) =>
    item.slides.some(
      (slide) =>
        slide.background.source === source ||
        slide.elements.some((element) => element.source === source),
    ),
  )
}

export function collectBlobSources(state: {
  services: Service[]
  otherChurchServices: Service[]
  mediaLibrary: MediaAsset[]
}): Set<string> {
  const sources = new Set<string>()
  for (const asset of state.mediaLibrary) {
    if (isBlobUrl(asset.source)) sources.add(asset.source)
  }
  for (const service of [...state.services, ...state.otherChurchServices]) {
    for (const item of service.items) {
      for (const slide of item.slides) {
        if (isBlobUrl(slide.background.source)) sources.add(slide.background.source!)
        for (const element of slide.elements) {
          if (isBlobUrl(element.source)) sources.add(element.source!)
        }
      }
    }
  }
  return sources
}

export function sanitizeServicesForStorage(services: Service[]): Service[] {
  return services.map((service) => ({
    ...service,
    items: service.items.map((item) => ({
      ...item,
      slides: item.slides.map((slide) => {
        const background =
          slide.background.type === 'image' && isBlobUrl(slide.background.source)
            ? ({ type: 'preset', preset: 'graphite', tone: 'dark' } as SlideBackground)
            : slide.background
        const elements = slide.elements.map((element) =>
          isBlobUrl(element.source)
            ? {
                ...element,
                source: '',
                settings: { ...element.settings, missing: true, localOnly: true },
              }
            : element,
        )
        return { ...slide, background, elements }
      }),
    })),
  }))
}
