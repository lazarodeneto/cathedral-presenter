import { describe, expect, it } from 'vitest'
import {
  createLibrarySongItem,
  DEFAULT_LIBRARY_QUERY,
  formFromLibrarySong,
  importFromText,
  librarySongFromForm,
  parseLyrics,
  querySongLibrary,
  validateSongLibrary,
  type SongLibraryForm,
} from '../utils/songLibrary'
import type { LibrarySong } from '../types'

// ── helpers ──────────────────────────────────────────────────────

function makeSong(overrides: Partial<LibrarySong> = {}): LibrarySong {
  return {
    id: 'song_1',
    title: 'Amazing Grace',
    lyrics: 'Amazing grace, how sweet the sound\nThat saved a wretch like me\n\nI once was lost, but now am found\nWas blind, but now I see',
    author: 'John Newton',
    language: 'en',
    category: 'Hymns',
    tags: ['grace', 'assurance'],
    key: 'G',
    notes: 'Classic hymn',
    copyright: 'Public domain',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeForm(overrides: Partial<SongLibraryForm> = {}): SongLibraryForm {
  return {
    title: 'Amazing Grace',
    lyrics: 'Amazing grace\n\nI once was lost',
    author: 'John Newton',
    language: 'en',
    category: 'Hymns',
    tags: 'grace, assurance',
    key: 'G',
    notes: '',
    copyright: 'Public domain',
    ...overrides,
  }
}

// ── parseLyrics ───────────────────────────────────────────────────

describe('parseLyrics', () => {
  it('splits on blank lines', () => {
    const result = parseLyrics('Stanza one line one\nStanza one line two\n\nStanza two line one')
    expect(result).toHaveLength(2)
    expect(result[0]).toBe('Stanza one line one\nStanza one line two')
    expect(result[1]).toBe('Stanza two line one')
  })

  it('trims leading/trailing whitespace from each stanza', () => {
    const result = parseLyrics('  line one  \n\n  line two  ')
    expect(result[0]).toBe('line one')
    expect(result[1]).toBe('line two')
  })

  it('ignores multiple consecutive blank lines', () => {
    const result = parseLyrics('a\n\n\n\nb')
    expect(result).toHaveLength(2)
  })

  it('returns single stanza when no blank lines', () => {
    const result = parseLyrics('one\ntwo\nthree')
    expect(result).toHaveLength(1)
  })

  it('returns empty array for whitespace-only input', () => {
    expect(parseLyrics('   \n\n  ')).toHaveLength(0)
  })
})

// ── validateSongLibrary ───────────────────────────────────────────

describe('validateSongLibrary', () => {
  it('passes a valid form', () => {
    expect(validateSongLibrary(makeForm())).toEqual({})
  })

  it('requires title', () => {
    const errors = validateSongLibrary(makeForm({ title: '' }))
    expect(errors.title).toBe('required')
  })

  it('requires title non-whitespace', () => {
    const errors = validateSongLibrary(makeForm({ title: '   ' }))
    expect(errors.title).toBe('required')
  })

  it('rejects title over max length', () => {
    const errors = validateSongLibrary(makeForm({ title: 'x'.repeat(201) }))
    expect(errors.title).toBe('too-long')
  })

  it('requires lyrics', () => {
    const errors = validateSongLibrary(makeForm({ lyrics: '' }))
    expect(errors.lyrics).toBe('required')
  })

  it('rejects author over max length', () => {
    const errors = validateSongLibrary(makeForm({ author: 'x'.repeat(121) }))
    expect(errors.author).toBe('too-long')
  })

  it('rejects key over max length', () => {
    const errors = validateSongLibrary(makeForm({ key: 'x'.repeat(21) }))
    expect(errors.key).toBe('too-long')
  })
})

// ── librarySongFromForm ───────────────────────────────────────────

describe('librarySongFromForm', () => {
  it('creates a song from a form', () => {
    const song = librarySongFromForm(makeForm())
    expect(song.title).toBe('Amazing Grace')
    expect(song.author).toBe('John Newton')
    expect(song.language).toBe('en')
    expect(song.tags).toEqual(['grace', 'assurance'])
    expect(song.key).toBe('G')
    expect(song.copyright).toBe('Public domain')
    expect(song.id).toMatch(/^song_/)
    expect(song.createdAt).toBeTruthy()
    expect(song.updatedAt).toBeTruthy()
  })

  it('omits undefined optional fields', () => {
    const song = librarySongFromForm(makeForm({ author: '', category: '', key: '', tags: '', notes: '', copyright: '' }))
    expect(song.author).toBeUndefined()
    expect(song.category).toBeUndefined()
    expect(song.key).toBeUndefined()
    expect(song.tags).toBeUndefined()
    expect(song.notes).toBeUndefined()
    expect(song.copyright).toBeUndefined()
  })

  it('preserves id and createdAt when editing', () => {
    const existing = makeSong()
    const song = librarySongFromForm(makeForm(), existing)
    expect(song.id).toBe(existing.id)
    expect(song.createdAt).toBe(existing.createdAt)
  })

  it('updatedAt changes on edit', () => {
    const existing = makeSong({ updatedAt: '2020-01-01T00:00:00.000Z' })
    const song = librarySongFromForm(makeForm(), existing)
    expect(song.updatedAt).not.toBe(existing.updatedAt)
  })

  it('splits comma-separated tags', () => {
    const song = librarySongFromForm(makeForm({ tags: 'worship, praise, joy' }))
    expect(song.tags).toEqual(['worship', 'praise', 'joy'])
  })
})

// ── formFromLibrarySong ───────────────────────────────────────────

describe('formFromLibrarySong', () => {
  it('round-trips optional fields', () => {
    const song = makeSong()
    const form = formFromLibrarySong(song)
    expect(form.title).toBe(song.title)
    expect(form.author).toBe(song.author)
    expect(form.language).toBe(song.language)
    expect(form.key).toBe(song.key)
    expect(form.tags).toBe('grace, assurance')
    expect(form.copyright).toBe(song.copyright)
  })

  it('defaults undefined fields to empty string', () => {
    const song = makeSong({ author: undefined, language: undefined, category: undefined, key: undefined, tags: undefined, notes: undefined, copyright: undefined })
    const form = formFromLibrarySong(song)
    expect(form.author).toBe('')
    expect(form.language).toBe('')
    expect(form.category).toBe('')
    expect(form.key).toBe('')
    expect(form.tags).toBe('')
    expect(form.notes).toBe('')
    expect(form.copyright).toBe('')
  })
})

// ── createLibrarySongItem ─────────────────────────────────────────

describe('createLibrarySongItem', () => {
  it('creates one slide per stanza', () => {
    const song = makeSong()
    const item = createLibrarySongItem(song)
    const stanzas = parseLyrics(song.lyrics)
    expect(item.slides).toHaveLength(stanzas.length)
  })

  it('slide text matches stanza content', () => {
    const song = makeSong()
    const item = createLibrarySongItem(song)
    const stanzas = parseLyrics(song.lyrics)
    expect(item.slides[0].text).toBe(stanzas[0])
  })

  it('item title matches song title', () => {
    const song = makeSong()
    const item = createLibrarySongItem(song)
    expect(item.title).toBe(song.title)
  })

  it('type is "song"', () => {
    const item = createLibrarySongItem(makeSong())
    expect(item.type).toBe('song')
  })

  it('metadata contains sourceId', () => {
    const song = makeSong()
    const item = createLibrarySongItem(song)
    expect(item.metadata?.sourceId).toBe(song.id)
  })

  it('falls back to full lyrics when no stanzas parsed', () => {
    const song = makeSong({ lyrics: 'single line no blank' })
    const item = createLibrarySongItem(song)
    expect(item.slides).toHaveLength(1)
  })

  it('uses one consistent song background preset for every stanza', () => {
    const song = makeSong()
    const item = createLibrarySongItem(song)
    expect(item.slides[0].background).toMatchObject({ preset: 'violet' })
    expect(item.slides[1].background).toMatchObject({ preset: 'violet' })
  })
})

// ── querySongLibrary ──────────────────────────────────────────────

describe('querySongLibrary', () => {
  const songs: LibrarySong[] = [
    makeSong({ id: '1', title: 'Amazing Grace', author: 'John Newton', language: 'en', category: 'Hymns', tags: ['grace'] }),
    makeSong({ id: '2', title: 'Santo, Santo', author: 'Franz Gruber', language: 'pt', category: 'Natal', tags: ['adoration'] }),
    makeSong({ id: '3', title: 'How Great Thou Art', author: 'Carl Boberg', language: 'en', category: 'Hymns', tags: ['worship'] }),
  ]

  it('returns all songs with empty query', () => {
    expect(querySongLibrary(songs, DEFAULT_LIBRARY_QUERY)).toHaveLength(3)
  })

  it('filters by language', () => {
    const result = querySongLibrary(songs, { ...DEFAULT_LIBRARY_QUERY, language: 'pt' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('2')
  })

  it('filters by category (case-insensitive, diacritic-folded)', () => {
    const result = querySongLibrary(songs, { ...DEFAULT_LIBRARY_QUERY, category: 'Hymns' })
    expect(result).toHaveLength(2)
  })

  it('searches by title', () => {
    const result = querySongLibrary(songs, { ...DEFAULT_LIBRARY_QUERY, search: 'grace' })
    expect(result.some((s) => s.id === '1')).toBe(true)
  })

  it('searches by author', () => {
    const result = querySongLibrary(songs, { ...DEFAULT_LIBRARY_QUERY, search: 'boberg' })
    expect(result.some((s) => s.id === '3')).toBe(true)
  })

  it('searches lyrics content', () => {
    const result = querySongLibrary(songs, { ...DEFAULT_LIBRARY_QUERY, search: 'wretch' })
    expect(result.some((s) => s.id === '1')).toBe(true)
  })

  it('sorts by title ascending', () => {
    const result = querySongLibrary(songs, { ...DEFAULT_LIBRARY_QUERY, sort: 'title' })
    expect(result[0].title).toBe('Amazing Grace')
    expect(result[2].title).toBe('Santo, Santo')
  })

  it('sorts by author', () => {
    const result = querySongLibrary(songs, { ...DEFAULT_LIBRARY_QUERY, sort: 'author' })
    expect(result[0].author).toBe('Carl Boberg')
  })

  it('sorts by updated descending', () => {
    const dated = songs.map((s, i) => ({ ...s, updatedAt: `2026-0${i + 1}-01T00:00:00.000Z` }))
    const result = querySongLibrary(dated, { ...DEFAULT_LIBRARY_QUERY, sort: 'updated' })
    expect(result[0].id).toBe('3')
  })

  it('returns empty array when no matches', () => {
    const result = querySongLibrary(songs, { ...DEFAULT_LIBRARY_QUERY, search: 'xyzzy' })
    expect(result).toHaveLength(0)
  })

  it('diacritic-folds search terms', () => {
    const result = querySongLibrary(songs, { ...DEFAULT_LIBRARY_QUERY, search: 'santo' })
    expect(result.some((s) => s.id === '2')).toBe(true)
  })
})

// ── importFromText ────────────────────────────────────────────────

describe('importFromText', () => {
  it('extracts title from first line', () => {
    const result = importFromText('Amazing Grace\n\nStanza one', 'song.txt')
    expect(result.title).toBe('Amazing Grace')
    expect(result.lyrics).toBe('Stanza one')
  })

  it('strips markdown heading marker', () => {
    const result = importFromText('# Holy Holy Holy\n\nLyrics', 'song.md')
    expect(result.title).toBe('Holy Holy Holy')
  })

  it('uses filename as title when first line is empty', () => {
    const result = importFromText('\n\nLyrics', 'my-song.txt')
    expect(result.title).toBe('my song')
  })

  it('uses full content as lyrics when title-less', () => {
    const result = importFromText('\nOnly lyrics here', 'song.txt')
    expect(result.lyrics).toContain('Only lyrics here')
  })

  it('normalizes Windows line endings', () => {
    const result = importFromText('Title\r\n\r\nLine one\r\nLine two', 'song.txt')
    expect(result.title).toBe('Title')
    expect(result.lyrics).toContain('Line one')
  })
})
