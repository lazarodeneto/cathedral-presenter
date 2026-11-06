import type { Locale, MediaAsset } from '../types'
import { sanitizeSingleLine } from '../security/text'
import { canonicalMediaTag, mediaTagLabel, STANDARD_MEDIA_TAGS } from '../i18n/mediaTagLabels'

export const DEFAULT_MEDIA_TAGS = STANDARD_MEDIA_TAGS

export const mediaSearchKey = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim()

export function normalizeMediaTags(value: unknown, limit = 100): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  return value.slice(0, limit * 2).flatMap((item) => {
    const tag = canonicalMediaTag(sanitizeSingleLine(item, 60).trim())
    const key = mediaSearchKey(tag)
    if (!key || seen.has(key)) return []
    seen.add(key)
    return [tag]
  }).slice(0, limit)
}

export function mediaLocalDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const part = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${part(date.getMonth() + 1)}-${part(date.getDate())}`
}

export interface MediaFilters { query: string; tags: string[]; kind: string; from: string; to: string; sort: string }
export function filterMedia(assets: MediaAsset[], filters: MediaFilters, locale: Locale = 'pt-BR'): MediaAsset[] {
  const query = mediaSearchKey(filters.query)
  const wantedTags = filters.tags.map((tag) => mediaSearchKey(canonicalMediaTag(tag)))
  return assets.filter((asset) => {
    const tags = normalizeMediaTags(asset.tags)
    const date = mediaLocalDate(asset.addedAt)
    return (!query || mediaSearchKey([asset.name, ...tags, ...tags.map((tag) => mediaTagLabel(tag, locale))].join(' ')).includes(query)) &&
      wantedTags.every((tag) => tags.some((entry) => mediaSearchKey(entry) === tag)) &&
      (!filters.kind || (filters.kind === 'youtube' ? asset.provider === 'youtube' : asset.kind === filters.kind)) &&
      (!filters.from || Boolean(date && date >= filters.from)) && (!filters.to || Boolean(date && date <= filters.to))
  }).sort((a, b) => filters.sort === 'name' ? a.name.localeCompare(b.name) :
    filters.sort === 'oldest' ? (a.addedAt ?? '').localeCompare(b.addedAt ?? '') : (b.addedAt ?? '').localeCompare(a.addedAt ?? ''))
}
