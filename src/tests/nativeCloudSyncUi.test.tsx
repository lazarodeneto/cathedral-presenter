import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NativeCloudSettings } from '../components/settings/NativeCloudSettings'

vi.mock('../i18n/useT', () => ({ useT: () => (key: string) => key }))
vi.mock('../runtime', () => ({ isCloud: false, DEFAULT_CLOUD_ORIGIN: 'https://church.example' }))

describe('native workspace synchronization choices', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('requires confirmation before choosing the initial copy', async () => {
    const fetcher = vi.fn(async (_path: string, init?: RequestInit) => new Response(JSON.stringify(init?.method === 'POST' ? { revision: 1 } : { connected: true, online: true, name: 'Mac', origin: 'https://church.example' }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetcher)
    render(<NativeCloudSettings />)
    fireEvent.click(await screen.findByRole('button', { name: 'cloud.uploadWorkspace' }))
    expect(screen.getByText('cloud.syncUploadConfirm')).toBeInTheDocument()
    expect(fetcher.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'cloud.sync' }))
    await waitFor(() => expect(fetcher.mock.calls.some(([path, init]) => path === '/api/cloud/sync' && init?.body === JSON.stringify({ direction: 'upload', authorized: true }))).toBe(true))
  })
})
