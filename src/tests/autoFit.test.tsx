import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { useRef } from 'react'
import { useAutoFit } from '../components/SlideRenderer'

/** A box 100px tall whose content is `natural` px tall at full size and scales with --fit. */
function Box({ natural, text }: { natural: number; text: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useAutoFit(ref, text)
  return (
    <div
      data-testid="box"
      ref={(element) => {
        ref.current = element
        if (!element || element.dataset.mocked) return
        element.dataset.mocked = '1'
        const fit = () => Number(element.style.getPropertyValue('--fit') || 1)
        Object.defineProperty(element, 'clientHeight', { get: () => 100 })
        Object.defineProperty(element, 'clientWidth', { get: () => 100 })
        Object.defineProperty(element, 'scrollWidth', { get: () => 100 })
        Object.defineProperty(element, 'scrollHeight', { get: () => Math.ceil(natural * fit()) })
      }}
    >
      {text}
    </div>
  )
}

describe('auto-fit', () => {
  afterEach(cleanup)

  const fitOf = (element: HTMLElement) => Number(element.style.getPropertyValue('--fit'))

  it('leaves text that fits at full size', () => {
    const { getByTestId } = render(<Box natural={80} text="short" />)
    expect(fitOf(getByTestId('box'))).toBe(1)
  })

  it('shrinks text just enough to fit', () => {
    const { getByTestId } = render(<Box natural={250} text="long verse" />)
    const fit = fitOf(getByTestId('box'))
    // Largest scale whose content fits the 100px box (1px rounding tolerance).
    expect(Math.ceil(250 * fit)).toBeLessThanOrEqual(101)
    expect(fit).toBeGreaterThan(0.39)
  })

  it('stops at the minimum scale for text that cannot fit', () => {
    const { getByTestId } = render(<Box natural={1000} text="whole chapter" />)
    expect(fitOf(getByTestId('box'))).toBeCloseTo(0.3, 3)
  })
})
