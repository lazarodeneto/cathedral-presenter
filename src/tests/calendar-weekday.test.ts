import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../store/useAppStore'
import { isDateOnWeekday } from '../utils/dates'

describe('calendar weekday highlight', () => {
  it('matches the Sunday-first weekday index used by the calendar', () => {
    expect(isDateOnWeekday('2026-10-26', 1)).toBe(true)
    expect(isDateOnWeekday('2026-10-26', 0)).toBe(false)
    expect(isDateOnWeekday('2026-10-25', 0)).toBe(true)
    expect(isDateOnWeekday('2026-10-26', null)).toBe(false)
  })

  it('defaults to no highlighted weekday', () => {
    expect(DEFAULT_SETTINGS.highlightWeekday).toBeNull()
  })
})
