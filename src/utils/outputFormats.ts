/**
 * Projection formats the operator can choose. The choice is saved in
 * Settings and drives both the editor canvas and the audience output, so
 * what is designed is exactly what the projector shows.
 */
export type SlideAspect = 'wide' | 'wide10' | 'classic'

export type OutputFormatId = 'fhd' | 'hd' | 'uhd' | 'wxga' | 'wuxga' | 'xga' | 'svga'

export interface OutputFormat {
  id: OutputFormatId
  /** Common name, e.g. "Full HD — 1080p". Not translated: it is the industry name. */
  name: string
  width: number
  height: number
  aspect: SlideAspect
  /** "16:9", "16:10" or "4:3". */
  ratio: string
}

export const OUTPUT_FORMATS: OutputFormat[] = [
  { id: 'fhd', name: 'Full HD — 1080p', width: 1920, height: 1080, aspect: 'wide', ratio: '16:9' },
  { id: 'hd', name: 'HD — 720p', width: 1280, height: 720, aspect: 'wide', ratio: '16:9' },
  { id: 'uhd', name: '4K UHD', width: 3840, height: 2160, aspect: 'wide', ratio: '16:9' },
  { id: 'wxga', name: 'WXGA', width: 1280, height: 800, aspect: 'wide10', ratio: '16:10' },
  { id: 'wuxga', name: 'WUXGA', width: 1920, height: 1200, aspect: 'wide10', ratio: '16:10' },
  { id: 'xga', name: 'XGA', width: 1024, height: 768, aspect: 'classic', ratio: '4:3' },
  { id: 'svga', name: 'SVGA', width: 800, height: 600, aspect: 'classic', ratio: '4:3' },
]

export const DEFAULT_OUTPUT_FORMAT_ID: OutputFormatId = 'fhd'

export const ASPECT_RATIO: Record<SlideAspect, number> = {
  wide: 16 / 9,
  wide10: 16 / 10,
  classic: 4 / 3,
}

export function isOutputFormatId(value: unknown): value is OutputFormatId {
  return OUTPUT_FORMATS.some((format) => format.id === value)
}

export function outputFormat(id: unknown): OutputFormat {
  return OUTPUT_FORMATS.find((format) => format.id === id) ?? OUTPUT_FORMATS[0]
}

/** "1920 × 1080" */
export function resolutionLabel(format: Pick<OutputFormat, 'width' | 'height'>): string {
  return `${format.width} × ${format.height}`
}
