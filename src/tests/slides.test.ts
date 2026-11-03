import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createLyricsSlides, SLIDE_SIZE } from '../utils/slides'

describe('presentation canvas', () => {
  it('uses a 1920 × 1080 slide reference size', () => {
    expect(SLIDE_SIZE).toEqual({ width: 1920, height: 1080 })
    expect(SLIDE_SIZE.width / SLIDE_SIZE.height).toBeCloseTo(16 / 9)
  })

  it('guarantees 1920 / 1080 aspect ratio in stylesheet and no 1020 typos', () => {
    const stylesheet = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8')
    expect(stylesheet).toContain('aspect-ratio: 1920 / 1080')
    expect(stylesheet).not.toContain('1920 / 1020')
  })

  it('uses the first lyric line as the slide title while preserving the song title as the item title', () => {
    const slides = createLyricsSlides({
      title: 'Nome da música',
      stanzas: ['  Primeiro verso  \nSegundo verso\nTerceiro verso'],
    })

    expect(slides[0].title).toBe('Primeiro verso')
    expect(slides[0].text).toBe('Primeiro verso\nSegundo verso\nTerceiro verso')
  })
})

describe('Bible slides', () => {
  it('always puts one verse on each slide, bilingual included', async () => {
    const { createBibleSlides } = await import('../utils/slides')
    const { getLocalPassageSync } = await import('../providers/bible/LocalBibleProvider')
    const primary = getLocalPassageSync('Psalm 23:1-6', 'web')
    const secondary = getLocalPassageSync('Psalm 23:1-6', 'blivre')
    expect(primary.verses).toHaveLength(6)

    const single = createBibleSlides({ primary, bilingual: false })
    expect(single).toHaveLength(6)
    expect(single.map((slide) => slide.reference)).toEqual(primary.verses.map((verse) => `${verse.bookName} ${verse.chapter}:${verse.verse}`))
    expect(single[0].text).toBe(primary.verses[0].text)
    // What the slide shows is the Scripture block: each must hold only its own verse.
    expect(single.map((slide) => slide.bible?.primary.text)).toEqual(primary.verses.map((verse) => verse.text))
    expect(single.map((slide) => slide.bible?.primary.reference)).toEqual(single.map((slide) => slide.reference))

    const bilingual = createBibleSlides({ primary, secondary, bilingual: true })
    expect(bilingual).toHaveLength(6)
    expect(bilingual[1].bible?.secondary?.text).toBe(secondary.verses[1].text)
    expect(bilingual[1].bible?.primary.text).toBe(primary.verses[1].text)
  })
})

describe('slide labels', () => {
  it('name the exact verse, with translations when there is room', async () => {
    const { createBibleSlides, slideLabel } = await import('../utils/slides')
    const { getLocalPassageSync } = await import('../providers/bible/LocalBibleProvider')
    const primary = getLocalPassageSync('Psalm 23:1-6', 'web')
    const secondary = getLocalPassageSync('Psalm 23:1-6', 'blivre')
    const slides = createBibleSlides({ primary, secondary, bilingual: true })
    expect(slides[3].title).toBe(`${primary.verses[3].bookName} 23:4`)
    expect(slideLabel(slides[3], 'Psalm 23:1-6', { short: true })).toBe(`${primary.verses[3].bookName} 23:4`)
    expect(slideLabel(slides[3])).toBe(`${primary.verses[3].bookName} 23:4 · ${primary.translationAbbreviation} + ${secondary.translationAbbreviation}`)
  })
})
