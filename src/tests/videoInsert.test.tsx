import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { EditorMediaDialog } from '../components/editor/EditorMediaDialog'
import { useAppStore } from '../store/useAppStore'
import { prepareUploadedMedia } from '../providers/media/mediaWorkflow'

vi.mock('../providers/media/mediaWorkflow', async (original) => ({ ...await original<typeof import('../providers/media/mediaWorkflow')>(), prepareUploadedMedia: vi.fn() }))
vi.mock('../components/MediaStorageControls', () => ({ MediaStorageControls: () => <div>Storage status</div> }))
afterEach(() => { cleanup(); vi.clearAllMocks() })
describe('video insertion failures', () => {
  it('shows the upload rejection inside the file dialog instead of silently leaving insertion disabled', async () => {
    useAppStore.setState((s) => ({ settings: { ...s.settings, locale: 'en' }, mediaLibrary: [] }))
    vi.mocked(prepareUploadedMedia).mockResolvedValue({ ok: false, reason: 'sign-in-required' })
    const { container } = render(<EditorMediaDialog open mode="video" onClose={() => {}} onInsert={() => {}} />)
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File(['video'], 'film.mp4', { type: 'video/mp4' })] } })
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Sign in'))
    expect(screen.getByRole('button', { name: 'Add to slide' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Upload media' })).not.toBeDisabled()
  })
  it('recovers from file-read errors rather than leaving upload busy forever', async () => {
    useAppStore.setState((s) => ({ settings: { ...s.settings, locale: 'en' }, mediaLibrary: [] }))
    vi.mocked(prepareUploadedMedia).mockRejectedValue(new Error('read failure'))
    const { container } = render(<EditorMediaDialog open mode="video" onClose={() => {}} onInsert={() => {}} />)
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File(['video'], 'film.mp4', { type: 'video/mp4' })] } })
    await waitFor(() => expect(screen.getByRole('alert')).toBeVisible())
    expect(screen.getByRole('button', { name: 'Upload media' })).not.toBeDisabled()
  })
})
