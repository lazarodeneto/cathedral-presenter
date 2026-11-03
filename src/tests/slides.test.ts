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
