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
      fontSize: 64,
      fontWeight: 600,
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
  format: 'verse' | 'multi' | 'single'
  bilingual: boolean
  versesPerSlide?: number
}

export function createBibleSlides(options: CreateBibleSlideOptions): Slide[] {
  const { primary, secondary, bilingual, format } = options
  const versesPerSlide = Math.min(Math.max(options.versesPerSlide ?? 3, 2), 6)
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

  if (format === 'single' || (bilingual && format === 'verse')) {
    const primaryBlock = blockForVerse(
      primary,
      0,
      primary.verses.map((verse) => `${verse.verse} ${verse.text}`).join('\n\n'),
    )
    const secondaryBlock =
      bilingual && secondary
        ? {
            translationId: secondary.translationId,
            translationName: secondary.translationName,
            abbreviation: secondary.translationAbbreviation,
            language: secondary.language,
            reference: secondary.reference,
            text: secondary.verses.map((verse) => `${verse.verse} ${verse.text}`).join('\n\n'),
            licenseType: secondary.licenseType,
            copyrightNotice: secondary.copyrightNotice,
            sourceUrl: secondary.sourceUrl,
          }
        : undefined
    return [
      makeSlide({
        kind: 'scripture',
        title: primary.reference,
        text: primary.verses.map((verse) => verse.text).join(' '),
        reference: primary.reference,
        translationId: primary.translationId,
        bible: { primary: primaryBlock, secondary: secondaryBlock },
        background: { type: 'preset', preset: 'aurora', tone: 'dark' },
        notes: `Source: ${primary.translationName} (${primary.licenseType}).`,
      }),
    ]
  }

  if (format === 'multi') {
    const slides: Slide[] = []
    for (let start = 0; start < primary.verses.length; start += versesPerSlide) {
      const group = primary.verses.slice(start, start + versesPerSlide)
      const primaryBlock: ScriptureBlock = {
        ...blockForVerse(primary, start),
        reference: `${group[0].bookName} ${group[0].chapter}:${group[0].verse}–${group[group.length - 1].verse}`,
        text: group.map((verse) => `${verse.verse} ${verse.text}`).join('\n\n'),
      }
      const secondaryBlock =
        bilingual && secondary
          ? (() => {
              const secondaryVerses = group.map((verse, index) =>
                secondaryTextForVerse(secondary, verse.verse, start + index),
              )
              return {
                translationId: secondary.translationId,
                translationName: secondary.translationName,
                abbreviation: secondary.translationAbbreviation,
                language: secondary.language,
                reference: secondaryVerses[0].reference,
                text: secondaryVerses.map((item) => item.text).join('\n\n'),
                licenseType: secondary.licenseType,
                copyrightNotice: secondary.copyrightNotice,
                sourceUrl: secondary.sourceUrl,
              } satisfies ScriptureBlock
            })()
          : undefined
      slides.push(
        makeSlide({
          kind: 'scripture',
          title: primary.reference,
          text: group.map((verse) => verse.text).join(' '),
          reference: primaryBlock.reference,
          translationId: primary.translationId,
          bible: { primary: primaryBlock, secondary: secondaryBlock },
          background: { type: 'preset', preset: 'aurora', tone: 'dark' },
          notes: `Source: ${primary.translationName} (${primary.licenseType}).`,
        }),
      )
    }
    return slides
  }

  return primary.verses.map((verse, index) => {
    const primaryBlock = blockForVerse(primary, index)
    const secondaryBlock = secondaryFor(index, verse.verse)
    const reference = primaryBlock.reference
    return makeSlide({
      kind: 'scripture',
      title: primary.reference,
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
  return {
    id: newId('item'),
    type: 'blank',
    title,
    slides: [
      makeSlide({
        kind: template.kind,
        title: template.name,
        text: template.elementPreset === 'two-column' ? '' : template.text,
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

export function defaultSections(): ServiceSection[] {
  return [
    section('Welcome'),
    section('Worship'),
    section('Message'),
    section('Response'),
  ]
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
