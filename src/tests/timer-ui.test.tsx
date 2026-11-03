import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { TimerDurationField } from '../components/timer/TimerDurationField'
import { TimerControls } from '../components/timer/TimerControls'
import { TimerFace } from '../components/timer/TimerFace'
import { TimerSourceContext } from '../components/timer/useTimer'
import { useAppStore } from '../store/useAppStore'
import { createServiceSkeleton } from '../store/serviceUtils'
import { createTimerItem } from '../utils/slides'
import { createTimer, startTimer } from '../utils/timer'

describe('timer duration field', () => {
  beforeEach(() => {
    useAppStore.setState({ settings: { ...useAppStore.getState().settings, locale: 'en' } })
  })

  it('reports valid totals and explains invalid ones without saving them', () => {
    const onChange = vi.fn()
    const onValidity = vi.fn()
    render(<TimerDurationField value={300} onChange={onChange} onValidityChange={onValidity} />)
    const minutes = screen.getByLabelText('Minutes')
    const seconds = screen.getByLabelText('Seconds')

    fireEvent.change(minutes, { target: { value: '12' } })
    expect(onChange).toHaveBeenLastCalledWith(720)

    fireEvent.change(minutes, { target: { value: '61' } })
    expect(screen.getByRole('alert')).toHaveTextContent('The longest timer is 60:00.')
    expect(minutes).toHaveAttribute('aria-invalid', 'true')
    expect(onValidity).toHaveBeenLastCalledWith(false)
    expect(onChange).toHaveBeenCalledTimes(1)

    fireEvent.change(minutes, { target: { value: '1' } })
    fireEvent.change(seconds, { target: { value: '75' } })
    expect(screen.getByRole('alert')).toHaveTextContent('Seconds must be between 0 and 59.')

    fireEvent.change(seconds, { target: { value: '-3' } })
    expect(screen.getByRole('alert')).toHaveTextContent('can’t be negative')

    fireEvent.change(minutes, { target: { value: '0' } })
    fireEvent.change(seconds, { target: { value: '0' } })
    expect(screen.queryByRole('alert')).toBeNull()
    expect(onChange).toHaveBeenLastCalledWith(0)
  })
})

describe('timer controls and face', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-01T10:00:00Z'))
    useAppStore.setState({ settings: { ...useAppStore.getState().settings, locale: 'en' } })
  })
  afterEach(() => vi.useRealTimers())

  it('offers only the actions that fit each state and counts down on the slide', () => {
    const base = createServiceSkeleton({ title: 'Sunday', date: '2026-11-01', time: '10:00', locale: 'en' })
    const item = createTimerItem('Countdown', 65)
    const slide = item.slides[0]
    useAppStore.setState({ services: [{ ...base, items: [...base.items, item] }], timers: {} })

    render(
      <>
        <TimerControls slide={slide} />
        <TimerFace slide={slide} />
      </>,
    )
    expect(screen.getAllByText('01:05')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    act(() => {
      vi.advanceTimersByTime(5_000)
    })
    expect(screen.getAllByText('01:00')).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    act(() => {
      vi.advanceTimersByTime(30_000)
    })
    expect(screen.getAllByText('01:00')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Resume' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    act(() => {
      vi.advanceTimersByTime(61_000)
    })
    expect(screen.getAllByText('00:00')).toHaveLength(2)
    expect(screen.getByText('Time’s up')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(screen.getAllByText('01:05')).toHaveLength(2)
  })

  it('reads timer state from the snapshot in output windows', () => {
    const item = createTimerItem('Countdown', 600)
    const slide = item.slides[0]
    useAppStore.setState({ timers: {} })
    const running = startTimer(createTimer(600), Date.now() - 90_000)
    render(
      <TimerSourceContext.Provider value={{ [slide.id]: running }}>
        <TimerFace slide={slide} />
      </TimerSourceContext.Provider>,
    )
    expect(screen.getByText('08:30')).toBeInTheDocument()
  })
})
