import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { SlideRenderer } from '../components/SlideRenderer'
import { useAppStore } from '../store/useAppStore'
import { makeSlide, SLIDE_TEXT_DEFAULTS } from '../utils/slides'

describe('standard slide text', () => {
  afterEach(cleanup)

  beforeEach(() => {
    useAppStore.setState((state) => ({ settings: { ...state.settings, locale: 'en' } }))
  })

  it('is Inter at 64 and weight 500', () => {
    expect(SLIDE_TEXT_DEFAULTS).toEqual({ fontFamily: 'sans', fontSize: 64, fontWeight: 500 })
  })

  it('applies to a slide that sets nothing, and yields to the slide’s own values', () => {
    const branding = useAppStore.getState().branding
    const { container, rerender } = render(
      <SlideRenderer slide={makeSlide({ kind: 'title', text: 'Welcome' })} branding={branding} />,
    )
    const heading = () => container.querySelector('.slide-title-layout h1') as HTMLElement
    expect(heading().style.fontSize).toBe('5cqw')
    expect(heading().style.fontWeight).toBe('500')
    expect(heading().style.fontFamily).toBe('var(--font-ui)')

    rerender(
      <SlideRenderer
        slide={makeSlide({ kind: 'title', text: 'Welcome', fontSize: 96, fontWeight: 700, fontFamily: 'serif' })}
        branding={branding}
      />,
    )
    expect(heading().style.fontSize).toBe('7.5cqw')
    expect(heading().style.fontWeight).toBe('700')
    expect(heading().style.fontFamily).toBe('var(--font-slide-serif)')
  })
})
