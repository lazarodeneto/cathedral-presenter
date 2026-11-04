import { ART_CALVARY, ART_DOVE, ART_KNEELING, ART_NIGHTSCAPE, ART_WATER, ART_WORSHIP } from '../assets/templateArt'
import type {
  BiblePassage,
  ContentType,
  ElementType,
  ScriptureBlock,
  Service,
  ServiceSection,
  Slide,
  SlideElement,
  SlideItem,
  SlideTemplate,
  Song,
} from '../types'
import { BACKGROUND_PRESETS } from '../data/templates'
import { newId } from './id'
import { bookName } from '../data/bible'
import { clampTimerSeconds } from './timer'

/** Canonical presentation canvas. UI previews scale this without changing the ratio. */
export const SLIDE_SIZE = { width: 1920, height: 1080 } as const

export function defaultBackgroundFor(type: ContentType): Slide['background'] {
  const tone = BACKGROUND_PRESETS.find((preset) => preset.id === 'aurora')?.tone ?? 'dark'
  const map: Record<ContentType, Slide['background']['preset']> = {
    song: 'violet',
    bible: 'aurora',
    announcement: 'copper',
    sermon: 'golden',
    blank: 'graphite',
    media: 'graphite',
    timer: 'graphite',
  }
  return { type: 'preset', preset: map[type], tone }
}

export function makeTextElement(text: string, overrides: Partial<SlideElement> = {}): SlideElement {
  return {
    id: newId('el'),
    type: 'text',
    x: 9,
    y: 44,
    width: 82,
    height: 10,
    zIndex: 1,
    opacity: 1,
    visible: true,
    text,
    settings: {
      fontFamily: SLIDE_TEXT_DEFAULTS.fontFamily,
      fontSize: SLIDE_TEXT_DEFAULTS.fontSize,
      fontWeight: SLIDE_TEXT_DEFAULTS.fontWeight,
      align: 'center',
      lineHeight: 1.1,
      letterSpacing: 0,
      color: '',
      textShadow: true,
    },
    ...overrides,
  }
}

export function makeElement(type: ElementType, overrides: Partial<SlideElement> = {}): SlideElement {
  const base: SlideElement = {
    id: newId('el'),
    type,
    x: 30,
    y: 24,
    width: 40,
    height: 42,
    zIndex: 2,
    opacity: 1,
    visible: true,
    settings: {},
  }
  if (type === 'text') return makeTextElement('', overrides)
  if (type === 'shape') {
    base.settings = { shape: 'rect', fill: 'rgba(232,164,74,0.22)', radius: 18 }
  }
  if (type === 'qr') {
    base.x = 38
    base.y = 22
    base.width = 24
    base.height = 42
    base.settings = { quietZone: 2, foreground: '#141210', background: '#fff8ec' }
  }
  return { ...base, ...overrides, settings: { ...base.settings, ...overrides.settings } }
}

/**
 * Standard text for every slide: Inter, 64 (on the 1280-wide reference canvas) and
 * weight 500. A slide or text element uses these unless it sets its own value.
 */
export const SLIDE_TEXT_DEFAULTS = { fontFamily: 'sans', fontSize: 64, fontWeight: 500 } as const

export function makeSlide(overrides: Partial<Slide> = {}): Slide {
  return {
    id: newId('slide'),
    kind: 'body',
    title: '',
    text: '',
    elements: [],
    background: { type: 'preset', preset: 'graphite', tone: 'dark' },
    textAlign: 'center',
    ...overrides,
  }
}

function blockForVerse(
  passage: BiblePassage,
  verseIndex: number,
  textOverride?: string,
): ScriptureBlock {
  const verse = passage.verses[verseIndex]
  return {
    translationId: passage.translationId,
    translationName: passage.translationName,
    abbreviation: passage.translationAbbreviation,
    language: passage.language,
    reference:
      verse !== undefined
        ? `${verse.bookName} ${verse.chapter}:${verse.verse}`
        : passage.reference,
    text: textOverride ?? passage.verses.map((item) => item.text).join(' '),
    licenseType: passage.licenseType,
    copyrightNotice: passage.copyrightNotice,
    sourceUrl: passage.sourceUrl,
  }
}

function secondaryTextForVerse(
  passage: BiblePassage,
  verseNumber: number | null,
  fallbackIndex: number,
): { text: string; reference: string } {
  const match =
    verseNumber !== null ? passage.verses.find((verse) => verse.verse === verseNumber) : undefined
  const verse = match ?? passage.verses[fallbackIndex] ?? passage.verses[0]
  return {
    text: verse?.text ?? passage.verses.map((item) => item.text).join(' '),
    reference: verse
      ? `${verse.bookName} ${verse.chapter}:${verse.verse}`
      : passage.reference,
  }
}

export interface CreateBibleSlideOptions {
  primary: BiblePassage
  secondary?: BiblePassage
  bilingual: boolean
}

/**
 * One slide per verse, always: a passage never shares a slide, so long
 * readings cannot overflow the canvas. A bilingual slide pairs the verse with
 * the same verse in the secondary translation.
 */
export function createBibleSlides(options: CreateBibleSlideOptions): Slide[] {
  const { primary, secondary, bilingual } = options
  const secondaryFor = (verseIndex: number, verseNumber: number | null) => {
    if (!bilingual || !secondary) return undefined
    const secondaryVerse = secondaryTextForVerse(secondary, verseNumber, verseIndex)
    return {
      translationId: secondary.translationId,
      translationName: secondary.translationName,
      abbreviation: secondary.translationAbbreviation,
      language: secondary.language,
      reference: secondaryVerse.reference,
      text: secondaryVerse.text,
      licenseType: secondary.licenseType,
      copyrightNotice: secondary.copyrightNotice,
      sourceUrl: secondary.sourceUrl,
    } satisfies ScriptureBlock
  }

  return primary.verses.map((verse, index) => {
    // The block carries this verse only; without the text the whole passage would repeat on every slide.
    const primaryBlock = blockForVerse(primary, index, verse.text)
    const secondaryBlock = secondaryFor(index, verse.verse)
    const reference = primaryBlock.reference
    return makeSlide({
      kind: 'scripture',
      title: primaryBlock.reference,
      text: verse.text,
      reference,
      translationId: primary.translationId,
      bible: { primary: primaryBlock, secondary: secondaryBlock },
      background: { type: 'preset', preset: 'aurora', tone: 'dark' },
      notes: `Source: ${primary.translationName} (${primary.licenseType}).`,
    })
  })
}

export function createLyricsSlides(input: {
  title: string
  stanzas: string[]
  reference?: string
  notesForSlide?: (index: number) => string
}): Slide[] {
  return input.stanzas.map((stanza, index) => {
    const text = stanza
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n')
    const firstParagraph = text.split('\n')[0]?.trim() || input.title

    return makeSlide({
      kind: 'lyrics',
      title: firstParagraph,
      text,
      reference: input.reference,
      background: { type: 'preset', preset: 'violet', tone: 'dark' },
      textAlign: 'center',
      notes: input.notesForSlide?.(index) ?? '',
    })
  })
}

export function createSongItem(song: Song): SlideItem {
  const slides = createLyricsSlides({
    title: song.title,
    stanzas: song.stanzas,
    reference: song.author,
    notesForSlide: () => `Song key: ${song.key}. ${song.license}`,
  })
  return {
    id: newId('item'),
    type: 'song',
    title: song.title,
    slides,
    metadata: {
      provider: 'Local sample hymn library',
      sourceLabel: song.sourceLabel,
      license: song.license,
      author: song.author,
      songKey: song.key,
      sourceId: song.id,
    },
  }
}

export function createBibleItem(
  title: string,
  slides: Slide[],
  primary: BiblePassage,
  secondary?: BiblePassage,
): SlideItem {
  return {
    id: newId('item'),
    type: 'bible',
    title,
    slides,
    metadata: {
      provider: 'Local sample Bible library',
      sourceLabel: primary.translationAbbreviation,
      license: `${primary.translationName} · ${primary.licenseType}`,
      sourceId: `${primary.id}${secondary ? `+${secondary.id}` : ''}`,
    },
  }
}

export function createAnnouncementItem(title: string, body: string): SlideItem {
  return {
    id: newId('item'),
    type: 'announcement',
    title,
    slides: [
      makeSlide({
        kind: 'announcement',
        title,
        text: body,
        background: { type: 'preset', preset: 'copper', tone: 'dark' },
        elements: [],
      }),
    ],
    metadata: { provider: 'Local service content' },
  }
}

export function createSermonItem(title: string, body: string): SlideItem {
  const segments = body
    .split(/\n\s*\n/)
    .map((segment) => segment.trim())
    .filter(Boolean)
  const slides = (segments.length ? segments : [title]).map((segment, index) =>
    makeSlide({
      kind: 'sermon',
      title,
      text: segment,
      background: {
        type: 'preset',
        preset: index % 2 === 0 ? 'golden' : 'graphite',
        tone: 'dark',
      },
      notes: index === 0 ? 'Operator note: keep this slide visible while introducing the point.' : '',
    }),
  )
  return { id: newId('item'), type: 'sermon', title, slides, metadata: { provider: 'Local service content' } }
}

export function createBlankItem(title = 'Blank Slide'): SlideItem {
  return {
    id: newId('item'),
    type: 'blank',
    title,
    slides: [
      makeSlide({
        kind: 'blank',
        title,
        background: { type: 'preset', preset: 'graphite', tone: 'dark' },
      }),
    ],
    metadata: { provider: 'Local service content' },
  }
}

export function createTimerItem(title: string, durationSeconds: number): SlideItem {
  return {
    id: newId('item'),
    type: 'timer',
    title,
    slides: [
      makeSlide({
        kind: 'timer',
        title,
        text: '',
        background: { type: 'preset', preset: 'graphite', tone: 'dark' },
        timer: { durationSeconds: clampTimerSeconds(durationSeconds) },
      }),
    ],
    metadata: { provider: 'Local service content' },
  }
}

export function createMediaItem(title: string, element: SlideElement): SlideItem {
  return {
    id: newId('item'),
    type: 'media',
    title,
    slides: [
      makeSlide({
        kind: 'media',
        title,
        text: '',
        background: { type: 'preset', preset: 'graphite', tone: 'dark' },
        elements: [element],
      }),
    ],
    metadata: { provider: element.settings?.providerLabel ?? 'Local media' },
  }
}

const shape = (x: number, y: number, width: number, height: number, fill: string, extra: Partial<SlideElement['settings']> = {}, opacity = 1) =>
  makeElement('shape', { x, y, width, height, zIndex: 1, opacity, settings: { shape: 'rect', fill, radius: 0, ...extra } })

type Motion = NonNullable<NonNullable<SlideElement['settings']>['motion']>

// An illustration layer; contain keeps the drawing's proportions, anchored to the bottom of its box.
const art = (source: string, x: number, y: number, width: number, height: number, motion?: Motion, opacity = 1) =>
  makeElement('image', {
    x,
    y,
    width,
    height,
    zIndex: 1,
    opacity,
    source,
    text: '',
    settings: { fit: 'contain', cropX: 50, cropY: 100, cropZoom: 1, ...(motion ? { motion } : {}) },
  })

const label = (text: string, overrides: Partial<SlideElement>, settings: Partial<SlideElement['settings']> = {}) =>
  makeTextElement(text, {
    zIndex: 3,
    ...overrides,
    settings: {
      fontFamily: 'sans',
      fontSize: 18,
      fontWeight: 650,
      align: 'center',
      lineHeight: 1.2,
      letterSpacing: 4,
      uppercase: true,
      color: 'rgba(255,255,255,0.78)',
      textShadow: false,
      ...settings,
    },
  })

/**
 * Decorative layers for the newer templates, built from plain shapes and text
 * elements so every piece stays editable on the slide. Coordinates are canvas %.
 */
function decorElements(template: SlideTemplate): SlideElement[] {
  const gold = template.accent ?? 'linear-gradient(180deg, #f6d58a, #d9a441)'
  // A solid version of the accent for gradients and glows (gold when the accent is a gradient).
  const solid = template.accent && !template.accent.includes('gradient') ? template.accent : '#e0b04f'
  const tint = (percent: number) => `color-mix(in srgb, ${solid} ${percent}%, transparent)`
  switch (template.elementPreset) {
    case 'cross':
      // A slim cross above the text: one tall and one short bar, softly lit.
      return [
        shape(49.4, 11, 1.2, 22, gold, { shape: 'line' }, 0.9),
        shape(46, 17, 8, 2.1, gold, { shape: 'line' }, 0.9),
      ]
    case 'quote-bar':
      return [
        shape(4.6, 24, 0.7, 52, gold, { shape: 'line' }),
        ...(template.label ? [label(template.label, { x: 9, y: 80, width: 60, height: 7 }, { align: 'left', color: '#f2c56b', fontSize: 22 })] : []),
      ]
    case 'frame':
      // A thin inset frame: four hairlines with a gap from the edge.
      return [
        shape(6, 8, 88, 0.35, 'rgba(255,255,255,0.35)'),
        shape(6, 91.65, 88, 0.35, 'rgba(255,255,255,0.35)'),
        shape(6, 8, 0.2, 84, 'rgba(255,255,255,0.35)'),
        shape(93.8, 8, 0.2, 84, 'rgba(255,255,255,0.35)'),
      ]
    case 'band':
      return [
        shape(0, 72, 100, 28, template.accent ? `linear-gradient(90deg, ${tint(90)}, ${tint(65)})` : 'linear-gradient(90deg, rgba(37,99,235,0.85), rgba(14,165,233,0.75))'),
        ...(template.label ? [label(template.label, { x: 8, y: 80, width: 84, height: 10 }, { color: '#ffffff', fontSize: 26 })] : []),
      ]
    case 'halo':
      return [
        shape(30, 10, 40, 80, template.accent ? `radial-gradient(circle, ${tint(36)} 0%, ${tint(10)} 45%, transparent 70%)` : 'radial-gradient(circle, rgba(255,214,140,0.32) 0%, rgba(255,214,140,0.08) 45%, rgba(255,214,140,0) 70%)', { shape: 'circle' }),
      ]
    case 'tag':
      return template.label
        ? [
            shape(6, 8, 22, 9, 'rgba(255,255,255,0.14)', { radius: 999 }),
            label(template.label, { x: 6, y: 9.8, width: 22, height: 5.4 }, { fontSize: 22, letterSpacing: 3, color: '#ffffff' }),
          ]
        : []
    case 'split': {
      // Text: "Title\n\nSubtitle". The title sits on the coloured panel, the subtitle beside it.
      const [heading = '', subtitle = ''] = template.text.split('\n\n')
      return [
        shape(0, 0, 42, 100, template.accent ? `linear-gradient(160deg, ${tint(92)}, color-mix(in srgb, ${solid} 35%, #0b0b14))` : 'linear-gradient(160deg, rgba(124,58,237,0.9), rgba(30,27,75,0.95))'),
        ...(template.label ? [label(template.label, { x: 6, y: 30, width: 32, height: 7 }, { align: 'left', fontSize: 18 })] : []),
        makeTextElement(heading, {
          x: 6,
          y: 38,
          width: 32,
          height: 34,
          zIndex: 3,
          settings: { fontFamily: 'sans', fontSize: 64, fontWeight: 750, align: 'left', lineHeight: 1.02, letterSpacing: -1, color: '#ffffff', textShadow: false },
        }),
        ...(subtitle
          ? [label(subtitle, { x: 48, y: 42, width: 44, height: 16 }, { align: 'left', uppercase: false, letterSpacing: 0, fontSize: 30, fontWeight: 500, color: 'rgba(255,255,255,0.85)' })]
          : []),
      ]
    }
    case 'underline':
      return [shape(45, 70, 10, 1.1, gold, { shape: 'line' })]
    case 'glass':
      // A frosted card behind the text.
      return [shape(12, 18, 76, 64, 'rgba(255,255,255,0.08)', { radius: 36 }), shape(12, 18, 76, 0.25, 'rgba(255,255,255,0.22)')]
    case 'diagonal':
      return [shape(0, 0, 100, 100, `linear-gradient(115deg, ${tint(85)} 0 34%, transparent 34.2%)`)]
    case 'ring':
      // A thin ring around the text (40% × 71% is square on a 16:9 canvas).
      return [shape(30, 14.5, 40, 71, `radial-gradient(circle, transparent 66%, ${tint(80)} 67%, ${tint(80)} 68.5%, transparent 69.5%)`, { shape: 'circle' })]
    case 'corners': {
      const c = tint(85)
      return [
        shape(6, 9, 9, 0.5, c), shape(6, 9, 0.3, 16, c),
        shape(85, 9, 9, 0.5, c), shape(93.7, 9, 0.3, 16, c),
        shape(6, 90.5, 9, 0.5, c), shape(6, 75, 0.3, 16, c),
        shape(85, 90.5, 9, 0.5, c), shape(93.7, 75, 0.3, 16, c),
      ]
    }
    case 'video':
      // A full-bleed slot for the church's own video, under a soft shade that keeps text readable.
      return [
        makeElement('video', {
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          zIndex: 0,
          source: '',
          text: '',
          settings: { videoSlot: true, fit: 'cover' },
        }),
        shape(0, 0, 100, 100, 'linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.55))'),
      ]
    case 'art-water':
      return [art(ART_WATER, 0, 62, 100, 38, 'sway'), art(ART_WATER, -4, 70, 108, 30, 'sway', 0.7)]
    case 'art-night':
      return [art(ART_NIGHTSCAPE, 0, 0, 100, 100)]
    case 'art-dove':
      return [
        shape(32, 2, 36, 64, `radial-gradient(circle, ${tint(45)}, transparent 68%)`, { shape: 'circle', motion: 'pulse' }),
        art(ART_DOVE, 38, 6, 24, 33, 'float'),
      ]
    case 'art-calvary':
      return [
        shape(25, 18, 50, 60, `radial-gradient(circle, ${tint(55)}, transparent 70%)`, { shape: 'circle', motion: 'pulse' }),
        art(ART_CALVARY, 0, 50, 100, 50),
      ]
    case 'art-kneeling':
      return [
        shape(55, 22, 40, 76, `radial-gradient(circle, ${tint(40)}, transparent 68%)`, { shape: 'circle', motion: 'pulse' }),
        art(ART_KNEELING, 62, 40, 28, 52),
      ]
    case 'art-worship':
      return [
        shape(10, 30, 80, 70, `radial-gradient(60% 60% at 50% 100%, ${tint(50)}, transparent 75%)`, { motion: 'pulse' }),
        art(ART_WORSHIP, -2, 64, 104, 36, 'sway'),
      ]
    case 'glow':
      return [shape(0, 45, 100, 55, `radial-gradient(60% 100% at 50% 100%, ${tint(60)}, transparent 72%)`)]
    default:
      return []
  }
}

export function createTemplateItem(template: SlideTemplate, title: string): SlideItem {
  const elements: SlideElement[] = []
  if (template.elementPreset === 'image-right') {
    elements.push(
      makeElement('shape', {
        x: 5,
        y: 8,
        width: 42,
        height: 84,
        zIndex: 1,
        settings: { shape: 'rect', fill: 'rgba(255,248,236,0.06)', radius: 22 },
      }),
    )
  }
  if (template.elementPreset === 'two-column') {
    elements.push(
      makeTextElement(template.text.split('\n\n')[0] ?? template.text, {
        x: 8,
        y: 18,
        width: 38,
        height: 62,
        settings: { fontSize: 38, fontWeight: 500, align: 'left', lineHeight: 1.2 },
      }),
      makeTextElement(template.text.split('\n\n')[1] ?? '', {
        x: 54,
        y: 18,
        width: 38,
        height: 62,
        settings: { fontSize: 30, fontWeight: 400, align: 'left', lineHeight: 1.25 },
      }),
    )
  }
  elements.push(
    ...decorElements(template).map((element) =>
      template.motion && element.type === 'shape' ? { ...element, settings: { ...element.settings, motion: template.motion } } : element,
    ),
  )
  return {
    id: newId('item'),
    type: 'blank',
    title,
    slides: [
      makeSlide({
        kind: template.kind,
        title: template.name,
        text: template.elementPreset === 'two-column' || template.elementPreset === 'split' ? '' : template.text,
        ...(template.fontFamily ? { fontFamily: template.fontFamily } : {}),
        ...(template.fontSize ? { fontSize: template.fontSize } : {}),
        ...(template.fontWeight ? { fontWeight: template.fontWeight } : {}),
        ...(template.textVerticalAlign ? { textVerticalAlign: template.textVerticalAlign } : {}),
        background: { type: 'preset', preset: template.background, tone: BACKGROUND_PRESETS.find((preset) => preset.id === template.background)?.tone ?? 'dark' },
        textAlign: template.textAlign,
        elements,
      }),
    ],
    metadata: { provider: 'Built-in template' },
  }
}

export function section(title: string, itemIds: string[] = []): ServiceSection {
  return { id: newId('section'), title, itemIds }
}

export function itemSlides(item: SlideItem): Slide[] {
  return item.slides
}

export function scripturePrimaryRef(passage: BiblePassage): string {
  return passage.reference
}

export function scriptureTitle(passage: BiblePassage, secondary?: BiblePassage): string {
  if (secondary) {
    return `${passage.reference} · ${passage.translationAbbreviation} + ${secondary.translationAbbreviation}`
  }
  return `${passage.reference} · ${passage.translationAbbreviation}`
}

export function isBilingual(slide: Slide): boolean {
  return Boolean(slide.bible?.secondary)
}

/**
 * What a presenter reads to identify a slide: the exact verse for Scripture
 * ("Salmos 23:4 · NAA", or both translations when bilingual), else the slide's
 * own title, else the item's title.
 */
export function slideLabel(slide: Slide, fallback = '', { short = false }: { short?: boolean } = {}): string {
  const primary = slide.bible?.primary
  if (primary) {
    // Narrow captions (slide thumbnails) keep only the verse, the part a presenter scans for.
    if (short) return primary.reference
    const secondary = slide.bible?.secondary
    return secondary
      ? `${primary.reference} · ${primary.abbreviation} + ${secondary.abbreviation}`
      : `${primary.reference} · ${primary.abbreviation}`
  }
  return slide.title || fallback
}

/** Layer id the editor uses for the slide's own text in the Layers panel. */
export const CONTENT_LAYER_ID = '__content'
/** Stacking order of the slide's own text when the slide has not set one. */
export const DEFAULT_CONTENT_Z = 2

/** Whether a slide has its own text layer (lyrics, Scripture, title or body text). */
export function hasContentLayer(slide: Slide): boolean {
  if (slide.kind === 'timer' || slide.kind === 'blank' || slide.kind === 'media') return Boolean(slide.bible)
  return Boolean(slide.bible || slide.text.trim())
}

/**
 * Moves one layer, an element or the slide's own text (CONTENT_LAYER_ID), and
 * renumbers every layer 1..n so the order is unambiguous. On equal z the
 * element sits above the text, as it is drawn later.
 */
export function reorderSlideLayers(
  slide: Slide,
  layerId: string,
  action: 'forward' | 'backward' | 'front' | 'back',
): Pick<Slide, 'elements' | 'contentZ'> | null {
  const layers = slide.elements.map((element) => ({ id: element.id, z: element.zIndex, content: false }))
  if (hasContentLayer(slide)) layers.push({ id: CONTENT_LAYER_ID, z: slide.contentZ ?? DEFAULT_CONTENT_Z, content: true })
  layers.sort((a, b) => a.z - b.z || Number(b.content) - Number(a.content))
  const index = layers.findIndex((layer) => layer.id === layerId)
  if (index < 0) return null
  const last = layers.length - 1
  const target =
    action === 'forward' ? Math.min(last, index + 1)
      : action === 'backward' ? Math.max(0, index - 1)
        : action === 'front' ? last
          : 0
  if (target === index) return null
  const [moving] = layers.splice(index, 1)
  layers.splice(target, 0, moving)
  const order = new Map(layers.map((layer, position) => [layer.id, position + 1]))
  return {
    elements: slide.elements.map((element) => ({ ...element, zIndex: order.get(element.id) ?? element.zIndex })),
    contentZ: order.get(CONTENT_LAYER_ID) ?? slide.contentZ,
  }
}

export function isLikelyOverflow(slide: Slide): boolean {
  if (slide.kind === 'scripture' && slide.bible) {
    const primaryLength = slide.bible.primary.text.length
    const secondaryLength = slide.bible.secondary?.text.length ?? 0
    return primaryLength + secondaryLength > (slide.bible.secondary ? 720 : 430)
  }
  return slide.text.length > 320
}

export function sectionIdForService(service: Service, itemId: string): string | null {
  return service.sections.find((entry) => entry.itemIds.includes(itemId))?.id ?? null
}

export function bookDisplayName(bookId: string, language: Parameters<typeof bookName>[1]): string {
  return bookName(bookId, language)
}
