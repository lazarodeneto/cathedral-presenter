import { describe, expect, it } from 'vitest'
import { buildOutputSnapshot } from '../store/outputState'
import { mergeWorkspace } from '../store/workspacePersistence'
import { DEFAULT_MONITORS } from '../data/seed'
import { DEFAULT_BRANDING, useAppStore } from '../store/useAppStore'
import { gridRows } from '../utils/snap'
import { ASPECT_RATIO, OUTPUT_FORMATS, outputFormat } from '../utils/outputFormats'

describe('projection formats', () => {
  it('lists the 7 common projector formats with matching proportions', () => {
    expect(OUTPUT_FORMATS.map((format) => `${format.width}x${format.height} ${format.ratio}`)).toEqual([
      '1920x1080 16:9',
      '1280x720 16:9',
      '3840x2160 16:9',
      '1280x800 16:10',
      '1920x1200 16:10',
      '1024x768 4:3',
      '800x600 4:3',
    ])
    for (const format of OUTPUT_FORMATS) {
      expect(format.width / format.height).toBeCloseTo(ASPECT_RATIO[format.aspect], 5)
    }
  })

  it('falls back to Full HD for unknown values', () => {
    expect(outputFormat(undefined).id).toBe('fhd')
    expect(outputFormat('8k').id).toBe('fhd')
  })

  it('uses a grid row count that keeps grid cells square', () => {
    expect(gridRows('wide')).toBe(9)
    expect(gridRows('wide10')).toBe(10)
    expect(gridRows('classic')).toBe(12)
  })

  it('sends the chosen format to the audience output', () => {
    const snapshot = buildOutputSnapshot({
      service: null,
      live: null,
      monitors: DEFAULT_MONITORS,
      branding: DEFAULT_BRANDING,
      testMonitorId: null,
      format: 'xga',
    })
    expect(snapshot.audience.format).toBe('xga')
  })

  it('saves the format and gives the audience monitor its resolution', () => {
    useAppStore.getState().updateSettings({ outputFormat: 'wuxga' })
    const state = useAppStore.getState()
    expect(state.settings.outputFormat).toBe('wuxga')
    expect(state.monitors.find((monitor) => monitor.role === 'audience')).toMatchObject({ width: 1920, height: 1200 })
    useAppStore.getState().updateSettings({ outputFormat: 'fhd' })
  })

  it('drops an invalid saved format when loading a workspace', () => {
    const merged = mergeWorkspace({ settings: { outputFormat: 'bogus' } }, useAppStore.getState())
    expect(merged.settings.outputFormat).toBe('fhd')
  })
})
