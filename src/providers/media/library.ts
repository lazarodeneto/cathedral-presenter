import type { MediaAsset } from '../../types'
import { useAppStore } from '../../store/useAppStore'

export async function syncMediaLibrary(fromDrive = false) {
  const response = await fetch(`/api/media/library${fromDrive ? '?refresh=drive' : ''}`)
  const result = await response.json() as { assets?: MediaAsset[]; reason?: string }
  if (!response.ok || !result.assets) throw new Error(result.reason ?? 'media-service-unavailable')
  useAppStore.setState((state) => {
    const ids = new Set(result.assets!.map((asset) => asset.id))
    return { mediaLibrary: [...result.assets!.map((asset) => ({ ...asset, tags: asset.tags ?? state.mediaLibrary.find((local) => local.id === asset.id)?.tags })), ...state.mediaLibrary.filter((asset) => !ids.has(asset.id))] }
  })
}

export async function removeStoredMedia(asset: MediaAsset) {
  if (!/^\/api\/media\/files\/[0-9a-f-]{36}$/i.test(asset.source)) return
  const response = await fetch(asset.source, { method: 'DELETE', headers: { 'X-Cathedral-Media': '1' } })
  if (!response.ok) throw new Error('media-service-unavailable')
}

export async function updateStoredMedia(asset: MediaAsset, changes: { name?: string; tags?: string[] }) {
  if (!/^\/api\/media\/files\/[0-9a-f-]{36}$/i.test(asset.source)) return
  const response = await fetch(asset.source, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Cathedral-Media': '1' }, body: JSON.stringify(changes) })
  if (!response.ok) throw new Error('media-service-unavailable')
}
