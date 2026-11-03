import { describe, expect, it } from 'vitest'
import { formatLongDate, formatServiceTitleDate } from '../utils/dates'

describe('date presentation', () => {
  it('formats displayed dates as DD/MM/YYYY in every locale', () => {
    expect(formatLongDate('2026-11-01', 'en')).toBe('01/11/2026')
    expect(formatLongDate('2026-11-01', 'pt-BR')).toBe('01/11/2026')
    expect(formatLongDate('2026-11-01', 'de')).toBe('01/11/2026')
  })

  it('uses the compact Portuguese format for automatically named services', () => {
    expect(formatServiceTitleDate('2026-10-31', 'pt-BR')).toBe('Sáb: 31 Out 2026')
    expect(formatServiceTitleDate('2026-11-01', 'pt')).toBe('Dom: 1 Nov 2026')
  })
})
