// Snapping for the slide canvas. All positions are percentages of the canvas
// (x/width of its width, y/height of its height).

export interface Box {
  x: number
  y: number
  width: number
  height: number
}

export interface SnapTargets {
  x: number[]
  y: number[]
}

/** Columns of the editor grid; rows follow the slide format so cells stay square. */
export const GRID_COLUMNS = 16

export function gridRows(aspectRatio: 'wide' | 'classic'): number {
  return aspectRatio === 'classic' ? 12 : 9
}

/** Lines an element can snap to: the canvas edges and center, other elements, and the grid when shown. */
export function snapTargets(others: Box[], grid: { columns: number; rows: number } | null): SnapTargets {
  const x = [0, 50, 100]
  const y = [0, 50, 100]
  for (const box of others) {
    x.push(box.x, box.x + box.width / 2, box.x + box.width)
    y.push(box.y, box.y + box.height / 2, box.y + box.height)
  }
  if (grid) {
    for (let i = 1; i < grid.columns; i += 1) x.push((i * 100) / grid.columns)
    for (let i = 1; i < grid.rows; i += 1) y.push((i * 100) / grid.rows)
  }
  return { x, y }
}

/**
 * The smallest shift that puts one of `edges` on one of `targets`, if it is within `threshold`.
 * Returns the shift and the target line it lands on.
 */
export function snapAxis(edges: number[], targets: number[], threshold: number): { delta: number; line: number } | null {
  let best: { delta: number; line: number } | null = null
  for (const edge of edges) {
    for (const target of targets) {
      const delta = target - edge
      if (Math.abs(delta) <= threshold && (!best || Math.abs(delta) < Math.abs(best.delta))) {
        best = { delta, line: target }
      }
    }
  }
  return best
}
