import type { LibrarySong, Locale, SlideItem } from '../types'
import { newId } from './id'
import { createLyricsSlides } from './slides'

export const MAX_SONG_TITLE = 200
export const MAX_SONG_AUTHOR = 120
export const MAX_SONG_CATEGORY = 80
export const MAX_SONG_KEY = 20
export const MAX_SONG_NOTES = 4000
export const MAX_SONG_COPYRIGHT = 400
export const MAX_SONG_LYRICS = 50000

export type SongLibraryField = 'title' | 'lyrics' | 'author' | 'category' | 'key' | 'notes' | 'copyright'
export type SongLibraryError = 'required' | 'too-long'

export interface SongLibraryForm {
  title: string
  lyrics: string
  author: string
  language: Locale | ''
  category: string
  tags: string
  key: string
  notes: string
  copyright: string
}

export function validateSongLibrary(form: SongLibraryForm): Partial<Record<SongLibraryField, SongLibraryError>> {
  const errors: Partial<Record<SongLibraryField, SongLibraryError>> = {}
  const title = form.title.trim()
  if (!title) errors.title = 'required'
  else if (title.length > MAX_SONG_TITLE) errors.title = 'too-long'
  const lyrics = form.lyrics.trim()
  if (!lyrics) errors.lyrics = 'required'
  else if (lyrics.length > MAX_SONG_LYRICS) errors.lyrics = 'too-long'
  if (form.author.trim().length > MAX_SONG_AUTHOR) errors.author = 'too-long'
  if (form.category.trim().length > MAX_SONG_CATEGORY) errors.category = 'too-long'
  if (form.key.trim().length > MAX_SONG_KEY) errors.key = 'too-long'
  if (form.notes.trim().length > MAX_SONG_NOTES) errors.notes = 'too-long'
  if (form.copyright.trim().length > MAX_SONG_COPYRIGHT) errors.copyright = 'too-long'
  return errors
}

/** Split raw lyrics string into stanzas (blank-line separated). */
export function parseLyrics(lyrics: string): string[] {
  return lyrics
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Build a SlideItem from a LibrarySong. Each stanza becomes one slide. */
export function createLibrarySongItem(song: LibrarySong): SlideItem {
  const stanzas = parseLyrics(song.lyrics)
  const slides = createLyricsSlides({
    title: song.title,
    stanzas: stanzas.length > 0 ? stanzas : [song.lyrics.trim()],
    reference: song.author,
    notesForSlide: () => [song.key ? `Key: ${song.key}` : '', song.copyright ?? ''].filter(Boolean).join('. '),
  })
  return {
    id: newId('item'),
    type: 'song',
    title: song.title,
    slides,
    metadata: {
      provider: 'Song library',
      sourceLabel: song.copyright ?? '',
      license: song.copyright ?? '',
      author: song.author ?? '',
      songKey: song.key ?? '',
      sourceId: song.id,
    },
  }
}

export function formFromLibrarySong(song: LibrarySong): SongLibraryForm {
  return {
    title: song.title,
    lyrics: song.lyrics,
    author: song.author ?? '',
    language: song.language ?? '',
    category: song.category ?? '',
    tags: (song.tags ?? []).join(', '),
    key: song.key ?? '',
    notes: song.notes ?? '',
    copyright: song.copyright ?? '',
  }
}

export function librarySongFromForm(form: SongLibraryForm, existing?: LibrarySong): LibrarySong {
  const now = new Date().toISOString()
  const tags = form.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
  return {
    id: existing?.id ?? newId('song'),
    title: form.title.trim(),
    lyrics: form.lyrics,
    author: form.author.trim() || undefined,
    language: (form.language as Locale) || undefined,
    category: form.category.trim() || undefined,
    tags: tags.length > 0 ? tags : undefined,
    key: form.key.trim() || undefined,
    notes: form.notes.trim() || undefined,
    copyright: form.copyright.trim() || undefined,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
}

export type SongLibrarySort = 'title' | 'author' | 'updated' | 'created'

export interface SongLibraryQuery {
  search: string
  language: Locale | ''
  category: string
  sort: SongLibrarySort
}

export const DEFAULT_LIBRARY_QUERY: SongLibraryQuery = {
  search: '',
  language: '',
  category: '',
  sort: 'title',
}

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export function querySongLibrary(songs: LibrarySong[], query: SongLibraryQuery): LibrarySong[] {
  const needle = normalize(query.search.trim())
  const filtered = songs.filter((song) => {
    if (query.language && song.language !== query.language) return false
    if (query.category && normalize(song.category ?? '') !== normalize(query.category)) return false
    if (needle) {
      const hay = normalize(
        [song.title, song.author ?? '', song.lyrics, song.category ?? '', (song.tags ?? []).join(' '), song.key ?? ''].join(' '),
      )
      if (!hay.includes(needle)) return false
    }
    return true
  })
  const compare: Record<SongLibrarySort, (a: LibrarySong, b: LibrarySong) => number> = {
    title: (a, b) => a.title.localeCompare(b.title),
    author: (a, b) => (a.author ?? '').localeCompare(b.author ?? '') || a.title.localeCompare(b.title),
    updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
    created: (a, b) => b.createdAt.localeCompare(a.createdAt),
  }
  return filtered.sort(compare[query.sort])
}

/** Parse a .txt or .md file import: extract title from first non-empty line, rest is lyrics. */
export function importFromText(raw: string, filename: string): Partial<SongLibraryForm> {
  const lines = raw.replace(/\r\n/g, '\n').split('\n')
  const firstLine = lines[0]?.replace(/^#\s*/, '').trim() ?? ''
  const title = firstLine || filename.replace(/\.(txt|md)$/i, '').replace(/[-_]/g, ' ')
  const lyrics = lines.slice(firstLine ? 1 : 0).join('\n').trim()
  return { title, lyrics: lyrics || raw.trim() }
}
