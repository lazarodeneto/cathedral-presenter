// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { createNativeWorkspaceSync } from '../../server/nativeWorkspaceSync'
import type { createWorkspace } from '../../server/workspace'

describe('native synchronization safety', () => {
  it('does not replace the workspace if presentation starts while media is downloading', async () => {
    let live = false
    const replace = vi.fn()
    const workspace = { readCurrent: () => ({ revision: 1, document: { services: [] } }), replace } as unknown as ReturnType<typeof createWorkspace>
    const sync = createNativeWorkspaceSync({
      file: '/unused/sync-state.json', workspace, installation: () => 'installation',
      request: vi.fn(), download: async () => ({ revision: 2, document: { services: [], mediaLibrary: [{ source: '/api/media/files/01234567-0123-4123-8123-0123456789ab' }] } }),
      cache: async () => { live = true }, source: vi.fn(), isLive: () => live,
    })
    await expect(sync.transfer('download')).rejects.toThrow('stop-live-before-sync')
    expect(replace).not.toHaveBeenCalled()
  })
})
