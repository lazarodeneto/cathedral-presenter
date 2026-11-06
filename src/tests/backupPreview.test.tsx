import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { SettingsScreen } from '../screens/SettingsScreen'
import { DEFAULT_SETTINGS, useAppStore } from '../store/useAppStore'
import { createServiceSkeleton } from '../store/serviceUtils'
import { buildBackup } from '../security/backup'

beforeEach(() => {
  useAppStore.setState({ live: null, services: [createServiceSkeleton({ title: 'Current service', date: '2026-11-06', time: '10:00', locale: 'en' })], settings: { ...DEFAULT_SETTINGS, locale: 'en' } })
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
it('reviews a backup without replacing services, preserves them on cancel, and restores only after confirmation', async () => {
  const state = useAppStore.getState()
  const backup = buildBackup({ services: [createServiceSkeleton({ title: 'Restored service', date: '2026-11-07', time: '10:00', locale: 'en' })], settings: state.settings, branding: state.branding, monitors: [], media: [], librarySongs: [] })
  const file = new File([], 'backup.json', { type: 'application/json' })
  Object.defineProperty(file, 'text', { value: async () => JSON.stringify(backup) })
  const { container } = render(<SettingsScreen initialTab="data" />)
  const input = container.querySelector('input[type="file"]')!
  fireEvent.change(input, { target: { files: [file] } })
  await screen.findByRole('heading', { name: 'Review backup' })
  expect(useAppStore.getState().services[0].title).toBe('Current service')
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(useAppStore.getState().services[0].title).toBe('Current service')
  fireEvent.change(input, { target: { files: [file] } })
  const dialog = await screen.findByRole('dialog')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Import backup' }))
  await waitFor(() => expect(useAppStore.getState().services[0].title).toBe('Restored service'))
})
it('disables backup restore while a presentation is live', () => {
  const state = useAppStore.getState(), service = state.services[0]
  state.startLive(service.id, service.items[0].slides[0].id)
  render(<SettingsScreen initialTab="data" />)
  expect(screen.getByRole('button', { name: 'Import backup' })).toBeDisabled()
})
