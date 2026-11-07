import type { UserTemplate, Slide, SlideItem } from '../types'
import { normalizeUserTemplates } from '../security/backup'
import { scanPresentation } from './presentationImport'
import { newId } from './id'
import { webMediaProvider } from '../providers/media/MediaProvider'

export function createUserTemplate(name: string, slides: Slide[], category = 'Service', description = '', id = newId('template')): UserTemplate {
  const now = new Date().toISOString()
  if (!slides.length || slides.length > 20) throw new Error('template-limit')
  const [result] = normalizeUserTemplates([{ id, name, category, description, slides, createdAt: now, updatedAt: now }])
  if (!result) throw new Error('invalid-template')
  return result
}
export function userTemplateItem(template: UserTemplate): SlideItem {
  return { id: newId('item'), type: template.category === 'Worship' ? 'song' : template.category === 'Scripture' ? 'bible' : template.category === 'Blank' ? 'blank' : template.category === 'Announcement' || template.category === 'Service' ? 'announcement' : 'sermon', title: template.name, slides: template.slides.map((slide) => ({ ...structuredClone(slide), id: newId('slide'), elements: slide.elements.map((element) => ({ ...structuredClone(element), id: newId('element') })) })) }
}
export function exportUserTemplate(template: UserTemplate): string {
  return JSON.stringify({ app: 'cathedral-template', version: 1, template: normalizeUserTemplates([template])[0] },null,2)
}
export function parseUserTemplate(raw: string): UserTemplate {
  if (raw.length > 8 * 1024 * 1024) throw new Error('template-limit')
  const data = JSON.parse(raw)
  if (data?.app !== 'cathedral-template' || data.version !== 1 || !Array.isArray(data.template?.slides) || data.template.slides.length > 20) throw new Error('invalid-template')
  const [result] = normalizeUserTemplates([data.template])
  if (!result || result.slides.length !== data.template.slides.length) throw new Error('invalid-template')
  return { ...result, id: newId('template'), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
}
export async function importUserTemplate(file: File, addMedia: (asset: import('../types').MediaAsset) => void): Promise<UserTemplate> {
  if (!/\.(json|pptx|pdf|png|jpg|jpeg|webp|gif|avif)$/i.test(file.name) || file.size > 50 * 1024 * 1024) throw new Error('invalid-template')
  if (!/\.json$/i.test(file.name)) { const { importVisualPresentation } = await import('./visualPresentationImport'); return createUserTemplate(file.name.replace(/\.[^.]+$/, ''), await importVisualPresentation([file], addMedia, () => {}, undefined, 20)) }
  await scanPresentation(file)
  const template = parseUserTemplate(await file.text())
  const replacements = new Map<string,string>()
  const source = async (value?: string) => {
    if (!value) return value
    if (value.startsWith('blob:')) throw new Error('invalid-template')
    if (!value.startsWith('data:')) return value
    if (replacements.has(value)) return replacements.get(value)
    const mime = /^data:(image\/(?:png|jpeg|webp|gif|avif));base64,/.exec(value)?.[1]
    if (!mime) throw new Error('invalid-template')
    const blob = await (await fetch(value)).blob(), extension = mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1]
    const registered = await webMediaProvider.registerFile(new File([blob], `template-image.${extension}`, { type: mime }))
    if (!registered.ok || !registered.asset) throw new Error(registered.reason || 'scan-failed')
    addMedia(registered.asset); replacements.set(value, registered.asset.source); return registered.asset.source
  }
  for (const slide of template.slides) {
    slide.background.source = await source(slide.background.source)
    for (const element of slide.elements) element.source = await source(element.source)
  }
  return template
}
