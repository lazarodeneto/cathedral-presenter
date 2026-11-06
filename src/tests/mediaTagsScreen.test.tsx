import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MediaScreen } from '../screens/MediaScreen'
import { useAppStore } from '../store/useAppStore'
import type { MediaAsset } from '../types'

const initial = useAppStore.getState()
const assets: MediaAsset[] = [
  { id: 'one', name: 'Choir image', kind: 'image', mime: 'image/png', size: 1, source: '', status: 'missing', addedAt: '2026-11-05T12:00:00', provider: 'upload', tags: [] },
  { id: 'two', name: 'Service video', kind: 'video', mime: 'video/mp4', size: 1, source: '', status: 'missing', addedAt: '2026-10-05T12:00:00', provider: 'upload', tags: ['Culto'] },
]
afterEach(() => { cleanup(); useAppStore.setState({ mediaLibrary: initial.mediaLibrary, mediaTags: initial.mediaTags, settings: initial.settings }) })

describe('media tagging UI', () => {
  it('renames an existing media item without changing its source or tags', async () => {
    useAppStore.setState({ mediaLibrary: assets, settings: { ...initial.settings, locale: 'en' } })
    render(<MediaScreen />)
    fireEvent.click(screen.getByRole('button', { name: 'Rename media' }))
    fireEvent.change(screen.getByLabelText('Media name'), { target: { value: 'Choir on Sunday' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(useAppStore.getState().mediaLibrary[0].name).toBe('Choir on Sunday'))
    expect(useAppStore.getState().mediaLibrary[0].source).toBe(assets[0].source)
  })
  it('creates reusable tags, assigns them, and filters by a selected tag', () => {
    useAppStore.setState({ mediaLibrary: assets, mediaTags: [], settings: { ...initial.settings, locale: 'en' } })
    const { container } = render(<MediaScreen />)
    fireEvent.click(screen.getByText('Choose tags'))
    fireEvent.change(screen.getByLabelText('Find or create a tag'), { target: { value: 'Retreat' } })
    fireEvent.click(screen.getByRole('button', { name: /create tag: retreat/i }))
    expect(useAppStore.getState().mediaTags).toContain('Retreat')
    expect(useAppStore.getState().mediaLibrary[0].tags).toContain('Retreat')

    const filter = container.querySelector('.media-tag-filter') as HTMLElement
    fireEvent.click(within(filter).getByText('Tags'))
    fireEvent.click(within(filter).getByLabelText('Retreat'))
    expect(screen.getByRole('button', { name: /choir image/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /service video/i })).not.toBeInTheDocument()
  })
})
