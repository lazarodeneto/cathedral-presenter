import type { Service } from '../types'
import { isCloud } from '../runtime'
export interface PreflightCheck { key: string; severity: 'ready' | 'warning' | 'error'; detail?: string }
export async function checkService(service: Service): Promise<PreflightCheck[]> {
  const checks: PreflightCheck[] = []
  const slides = service.sections.flatMap((section) => section.itemIds.flatMap((id) => service.items.find((i) => i.id === id)?.slides ?? []))
  if (!slides.length) return [{ key: 'slides', severity: 'error' }]
  const media = new Map<string, { type: string; name: string }>()
  for (const slide of slides) {
    for (const e of slide.elements) {
      if (!e.visible || !['image', 'video', 'audio', 'embed'].includes(e.type) || e.settings?.videoSlot) continue
      if (!e.source || e.settings?.missing) { checks.push({ key: 'missing', severity: 'error', detail: e.text || slide.title }); continue }
      media.set(e.source, { type: e.type, name: e.text || slide.title })
    }
    if (slide.background.type === 'image' && slide.background.source) media.set(slide.background.source, { type: 'image', name: slide.title })
  }
  const tasks = [...media].map(([source, asset]) => async () => {
    if (/^https?:/.test(source)) { checks.push({ key: 'internet', severity: navigator.onLine ? 'warning' : 'error', detail: asset.name }); return }
    if (!source.startsWith('data:') && !source.startsWith('/api/media/files/') && !source.startsWith('/media/')) { checks.push({ key: 'missing', severity: 'error', detail: asset.name }); return }
    try {
      if (isCloud && source.startsWith('/api/media/files/')) {
        const { webOutputProvider } = await import('../providers/output/WebOutputProvider')
        if (!await webOutputProvider.cacheMedia(source.split('/').pop()!)) throw new Error('native-cache-unavailable')
      }
      if (!source.startsWith('data:')) {
        const response = await fetch(source, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
        if (!response.ok) throw new Error('missing')
      }
      await new Promise<void>((resolve, reject) => {
        const element = document.createElement(asset.type === 'video' ? 'video' : asset.type === 'audio' ? 'audio' : 'img')
        let finished = false
        const timer = setTimeout(() => finish(false), 6000)
        const finish = (ok: boolean) => {
          if (finished) return
          finished = true; element.onload = null; element.onerror = null; element.onloadeddata = null
          clearTimeout(timer); element.removeAttribute('src')
          if (element instanceof HTMLMediaElement) { element.pause(); element.load() }
          if (ok) resolve(); else reject(new Error('decode-failed'))
        }
        if (element instanceof HTMLMediaElement) { element.muted = true; element.preload = 'auto'; element.onloadeddata = () => finish(true) }
        else element.onload = () => finish(true)
        element.onerror = () => finish(false); element.src = source
      })
      checks.push({ key: 'media', severity: 'ready', detail: asset.name })
    } catch { checks.push({ key: 'missing', severity: 'error', detail: asset.name }) }
  })
  await Promise.all(Array.from({ length: Math.min(2, tasks.length) }, async () => { while (tasks.length) await tasks.shift()!() }))
  try {
    const health = await fetch('/api/workspace/health', { headers: { 'X-Cathedral-Workspace': '1' }, signal: AbortSignal.timeout(5000) }).then((r) => { if (!r.ok) throw new Error('storage'); return r.json() })
    checks.push({ key: 'storage', severity: health.writable ? 'ready' : 'error' })
    if (typeof health.freeBytes === 'number' && Number.isFinite(health.freeBytes) && health.freeBytes < 1024 ** 3) checks.push({ key: 'disk', severity: health.freeBytes < 50 * 1024 ** 2 ? 'error' : 'warning' })
  } catch { checks.push({ key: 'storage', severity: 'warning' }) }
  return checks
}
