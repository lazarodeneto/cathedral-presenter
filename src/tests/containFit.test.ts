import { describe, expect, it } from 'vitest'
import { containFit } from '../hooks/useContainFit'

describe('containFit', () => {
  it('fits 16:9 by width when the area is tall', () => {
    expect(containFit({ width: 960, height: 900 }, 16 / 9)).toEqual({ width: 960, height: 540 })
  })

  it('fits 4:3 by height when the area is wide', () => {
    expect(containFit({ width: 1000, height: 480 }, 4 / 3)).toEqual({ width: 640, height: 480 })
  })

  it('never exceeds the area and keeps the ratio within half a pixel', () => {
    for (const [width, height] of [[533, 401], [592, 477], [337, 9999], [1180, 611]]) {
      for (const ratio of [1920 / 1080, 4 / 3]) {
        const fit = containFit({ width, height }, ratio)!
        expect(fit.width).toBeLessThanOrEqual(width)
        expect(fit.height).toBeLessThanOrEqual(height)
        expect(Math.abs(fit.width - fit.height * ratio)).toBeLessThanOrEqual(0.5)
      }
    }
  })

  it('treats a missing height as unlimited and rejects an empty area', () => {
    expect(containFit({ width: 400, height: Infinity }, 4 / 3)).toEqual({ width: 400, height: 300 })
    expect(containFit({ width: 0, height: 300 }, 4 / 3)).toBeNull()
  })
})
