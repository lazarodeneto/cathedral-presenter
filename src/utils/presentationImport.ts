import { Unzip, UnzipInflate } from 'fflate'
import { sanitizeSingleLine, sanitizeText } from '../security/text'
import type { LibrarySong } from '../types'
import { newId } from './id'
import { isCloud } from '../runtime'

function xml(raw: string) {
  if (raw.length > 2 * 1024 * 1024 || /<!DOCTYPE|<!ENTITY/i.test(raw)) throw new Error('unsafe-document')
  const document = new DOMParser().parseFromString(raw, 'application/xml')
  if (document.getElementsByTagName('parsererror').length) throw new Error('invalid-document')
  return document
}
function texts(document: Document | Element, name: string) { return [...document.getElementsByTagNameNS('*', name)] }
export function importOpenLyrics(raw: string, fallback: string): LibrarySong {
  const document = xml(raw)
  if (document.documentElement.localName !== 'song') throw new Error('invalid-document')
  const verses = texts(document, 'verse').slice(0, 200).map((verse) => ({ name: verse.getAttribute('name') ?? '', text: texts(verse, 'lines').map((line) => {
    const copy = line.cloneNode(true) as Element
    for (const br of texts(copy, 'br')) br.parentNode?.replaceChild(document.createTextNode('\n'), br)
    return sanitizeText(copy.textContent, 12000)
  }).filter(Boolean).join('\n') }))
  if (!verses.length) throw new Error('empty-document')
  const order = texts(document, 'verseOrder')[0]?.textContent?.trim().split(/\s+/).map((name) => verses.findIndex((v) => v.name === name) + 1).filter((index) => index > 0)
  const now = new Date().toISOString()
  return { id: newId('song'), title: sanitizeSingleLine(texts(document, 'title')[0]?.textContent, 200) || fallback, author: sanitizeSingleLine(texts(document, 'author').map((a) => a.textContent).join(', '), 200), copyright: sanitizeSingleLine(texts(document, 'copyright')[0]?.textContent, 400), lyrics: verses.map((v) => v.text).join('\n\n').slice(0, 50000), arrangement: order?.length ? order : undefined, createdAt: now, updatedAt: now }
}
export function importPowerPointText(bytes: Uint8Array): string[] {
  if (bytes.length > 12 * 1024 * 1024) throw new Error('document-too-large')
  const documents = new Map<string, string>(); let expanded = 0, entries = 0
  const unzip = new Unzip((file) => {
    if (++entries > 4096) throw new Error('document-too-large')
    if (!/^ppt\/(slides\/slide\d+\.xml|presentation\.xml|_rels\/presentation\.xml\.rels)$/.test(file.name)) return
    const chunks: Uint8Array[] = []; let size = 0
    file.ondata = (error, data, final) => {
      if (error) throw error
      size += data.length; expanded += data.length
      if (size > 2 * 1024 * 1024 || expanded > 16 * 1024 * 1024) throw new Error('document-too-large')
      chunks.push(data)
      if (final) { const result = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length }; documents.set(file.name, new TextDecoder().decode(result)) }
    }
    file.start()
  })
  unzip.register(UnzipInflate); for (let i = 0; i < bytes.length; i += 65536) unzip.push(bytes.subarray(i, i + 65536)); unzip.push(new Uint8Array(), true)
  let names = [...documents.keys()].filter((name) => /^ppt\/slides\//.test(name)).sort((a, b) => Number(a.match(/slide(\d+)/)?.[1]) - Number(b.match(/slide(\d+)/)?.[1]))
  if (documents.has('ppt/presentation.xml') && documents.has('ppt/_rels/presentation.xml.rels')) {
    const relations = new Map(texts(xml(documents.get('ppt/_rels/presentation.xml.rels')!), 'Relationship').map((r) => [r.getAttribute('Id'), r.getAttribute('Target')]))
    const ordered = texts(xml(documents.get('ppt/presentation.xml')!), 'sldId').map((s) => relations.get(s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id'))).filter((target): target is string => Boolean(target && /^slides\/slide\d+\.xml$/.test(target))).map((target) => `ppt/${target}`)
    if (ordered.length) names = ordered
  }
  const slides = names.slice(0, 200).map((name) => texts(xml(documents.get(name) ?? ''), 'p').map((p) => texts(p, 't').map((t) => t.textContent).join('')).filter(Boolean).join('\n')).map((text) => sanitizeText(text, 12000)).filter(Boolean)
  if (!slides.length) throw new Error('empty-document')
  return slides
}
export async function scanPresentation(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase()
  const mime = extension === 'pdf' ? 'application/pdf' : extension === 'json' ? 'application/json' : extension === 'pptx' ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation' : extension === 'xml' ? 'application/xml' : 'text/plain'
  if (file.size > 50 * 1024 * 1024) throw new Error('document-too-large')
  if (isCloud) { const { uploadCloudFile } = await import('../providers/media/cloudUpload'); await uploadCloudFile(file, mime, true); return }
  const response = await fetch('/api/media/scan', { method: 'POST', headers: { 'Content-Type': mime, 'X-File-Name': encodeURIComponent(file.name), 'X-Cathedral-Media': '1' }, body: file })
  if (!response.ok) throw new Error((await response.json()).reason ?? 'scan-failed')
}
