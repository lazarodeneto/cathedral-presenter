import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { DateField } from '../components/DateField'
import { useAppStore } from '../store/useAppStore'
import { formatNumericDateTime, formatTime, parseDayMonthYear } from '../utils/dates'

describe('day-first dates', () => {
  it('reads DD/MM/YYYY and common separators, rejecting impossible dates', () => {
    expect(parseDayMonthYear('08/11/2026')).toBe('2026-11-08')
    expect(parseDayMonthYear('8.11.2026')).toBe('2026-11-08')
    expect(parseDayMonthYear('08-11-2026')).toBe('2026-11-08')
    expect(parseDayMonthYear('08112026')).toBe('2026-11-08')
    expect(parseDayMonthYear('31/02/2026')).toBeNull()
    expect(parseDayMonthYear('11/08/26')).toBeNull()
  })

  it('formats timestamps and English times day-first and 24-hour', () => {
    expect(formatNumericDateTime(new Date(2026, 10, 8, 18, 5))).toBe('08/11/2026 18:05')
    expect(formatTime('18:05', 'en')).toBe('18:05')
  })
})

describe('DateField', () => {
  afterEach(cleanup)

  beforeEach(() => {
    useAppStore.setState((state) => ({ settings: { ...state.settings, locale: 'en' } }))
  })

  function Harness({ initial = '', onChange }: { initial?: string; onChange: (value: string) => void }) {
    const [value, setValue] = useState(initial)
    return (
      <label>
        Date
        <DateField
          value={value}
          onChange={(next) => {
            setValue(next)
            onChange(next)
          }}
        />
      </label>
    )
  }

  it('shows the stored ISO date as DD/MM/YYYY', () => {
    render(<Harness initial="2026-11-08" onChange={() => {}} />)
    expect(screen.getByRole('textbox', { name: 'Date' })).toHaveValue('08/11/2026')
    expect(screen.getByRole('textbox')).toHaveAttribute('placeholder', 'DD/MM/YYYY')
  })

  it('masks typed digits and emits ISO once the date is complete', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '2412' } })
    expect(input).toHaveValue('24/12')
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.change(input, { target: { value: '24122026' } })
    expect(input).toHaveValue('24/12/2026')
    expect(onChange).toHaveBeenLastCalledWith('2026-12-24')
  })

  it('restores the last valid date when an impossible one is left on blur', () => {
    render(<Harness initial="2026-11-08" onChange={() => {}} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '31/02/2026' } })
    fireEvent.blur(input)
    expect(input).toHaveValue('08/11/2026')
  })

  it('clears to an empty value', () => {
    const onChange = vi.fn()
    render(<Harness initial="2026-11-08" onChange={onChange} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } })
    expect(onChange).toHaveBeenLastCalledWith('')
  })
})
