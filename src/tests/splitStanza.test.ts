import { describe, expect, it } from 'vitest'
import { createLyricsSlides, splitStanza } from '../utils/slides'

const lines = (count: number, text = 'Linha curta') => Array.from({ length: count }, (_, i) => `${text} ${i + 1}`).join('\n')

describe('splitStanza', () => {
  it('keeps a stanza of up to 4 lines on one slide', () => {
    expect(splitStanza(lines(4))).toEqual([lines(4)])
    expect(splitStanza('  \n ')).toEqual([])
  })

  it('splits long stanzas into balanced slides', () => {
    expect(splitStanza(lines(9)).map((part) => part.split('\n').length)).toEqual([3, 3, 3])
    expect(splitStanza(lines(5)).map((part) => part.split('\n').length)).toEqual([3, 2])
    expect(splitStanza(lines(8)).map((part) => part.split('\n').length)).toEqual([4, 4])
  })

  it('counts a line that wraps on screen as two', () => {
    const long = 'Esta linha é comprida o bastante para quebrar em duas no ecrã'
    const parts = splitStanza(['Um', 'Dois', long, 'Quatro'].join('\n'))
    expect(parts).toHaveLength(2)
    expect(parts.join('\n').split('\n')).toEqual(['Um', 'Dois', long, 'Quatro'])
  })

  it('gives each part its own slide, in order', () => {
    const slides = createLyricsSlides({ title: 'Teste', stanzas: [lines(9), lines(2, 'Coro')] })
    expect(slides.map((slide) => slide.text.split('\n').length)).toEqual([3, 3, 3, 2])
    expect(slides[1].text.startsWith('Linha curta 4')).toBe(true)
  })
})
