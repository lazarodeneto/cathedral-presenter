import { describe, expect, it } from 'vitest'
import { snapAxis, snapTargets } from '../utils/snap'

describe('snapTargets', () => {
  it('includes canvas edges and center, other elements, and the grid only when given', () => {
    const others = [{ x: 10, y: 20, width: 30, height: 40 }]
    expect(snapTargets(others, null)).toEqual({ x: [0, 50, 100, 10, 25, 40], y: [0, 50, 100, 20, 40, 60] })
    const withGrid = snapTargets([], { columns: 4, rows: 2 })
    expect(withGrid.x).toEqual([0, 50, 100, 25, 50, 75])
    expect(withGrid.y).toEqual([0, 50, 100, 50])
  })
})

describe('snapAxis', () => {
  it('picks the closest line within the threshold', () => {
    // Left edge 48.5 is 1.5 from 50; right edge 98.9 is 1.1 from 100, which wins.
    expect(snapAxis([48.5, 73.7, 98.9], [0, 50, 100], 2)).toEqual({ delta: expect.closeTo(1.1, 5), line: 100 })
  })

  it('returns null when nothing is close enough', () => {
    expect(snapAxis([20, 30], [0, 50, 100], 2)).toBeNull()
  })
})
