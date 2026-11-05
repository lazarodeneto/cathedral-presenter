import type { LibrarySong, Locale } from '../../types'
import { LOCALES } from '../../types'
import { languageName } from '../../i18n/dictionary'
import { detectLanguage } from '../../utils/detectLanguage'
import { sanitizeSingleLine, sanitizeText } from '../../security/text'
import { newId } from '../../utils/id'
import { LETRAS_GOSPEL_ORIGIN, LETRAS_GOSPEL_PROXY, isAllowedLetrasGospelPath } from './letrasGospelPaths'

/**
 * Song directory from letrasgospel.net. The list of artists and songs comes
 * from the site's public sitemaps (robots.txt only blocks /login); lyrics are
 * fetched one song at a time, only when the operator asks to download one.
 * Every request goes through the app's own proxy (the site sends no CORS).
 */

/** Compact catalogue: artist slugs, and songs as [artist index, song slug]. */
export interface SongDirectory {
  updatedAt: string
  artists: string[]
  songs: [number, string][]
}

export interface DirectoryEntry {
  artistSlug: string
  songSlug: string
  artist: string
  title: string
  url: string
  /** Language guessed from the title; the site is Brazilian, so pt-BR unless the words say otherwise. */
  language: Locale | string
}

export type DirectoryError = 'offline' | 'unavailable' | 'invalid'

export class DirectoryFailure extends Error {
  constructor(public readonly reason: DirectoryError) {
    super(reason)
  }
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const MAX_SONGS = 200_000

async function getText(path: string, signal?: AbortSignal): Promise<string> {
  if (!isAllowedLetrasGospelPath(path)) throw new DirectoryFailure('invalid')
  let response: Response
  try {
    response = await fetch(`${LETRAS_GOSPEL_PROXY}${path}`, { signal, credentials: 'same-origin' })
  } catch {
    throw new DirectoryFailure(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'unavailable')
  }
  if (!response.ok) throw new DirectoryFailure('unavailable')
  return response.text()
}

/** The site paths listed in a sitemap or sitemap index, without the origin. */
export function readSitemapPaths(xml: string): string[] {
  const paths: string[] = []
  const pattern = /<loc>\s*([^<\s]+)\s*<\/loc>/g
  for (let match = pattern.exec(xml); match; match = pattern.exec(xml)) {
    const url = match[1].replace(/&amp;/g, '&')
    if (!url.startsWith(`${LETRAS_GOSPEL_ORIGIN}/`)) continue
    paths.push(url.slice(LETRAS_GOSPEL_ORIGIN.length + 1).replace(/\/$/, ''))
  }
  return paths
}

/** Builds the catalogue from the artist sitemap and the song sitemaps. */
export function buildDirectory(artistPaths: string[], songPaths: string[], updatedAt = new Date().toISOString()): SongDirectory {
  const artists: string[] = []
  const index = new Map<string, number>()
  const artistIndex = (slug: string) => {
    let position = index.get(slug)
    if (position === undefined) {
      position = artists.length
      artists.push(slug)
      index.set(slug, position)
    }
    return position
  }
  for (const path of artistPaths) if (SLUG.test(path)) artistIndex(path)

  const seen = new Set<string>()
  const songs: [number, string][] = []
  for (const path of songPaths) {
    const [artist, song, extra] = path.split('/')
    if (extra !== undefined || !SLUG.test(artist ?? '') || !SLUG.test(song ?? '')) continue
    if (song === 'discografia' || seen.has(path) || songs.length >= MAX_SONGS) continue
    seen.add(path)
    songs.push([artistIndex(artist), song])
  }
  return { updatedAt, artists, songs }
}

/** Downloads the sitemaps and builds the catalogue. `onProgress(done, total)` counts sitemaps. */
export async function fetchDirectory({
  onProgress,
  signal,
}: { onProgress?: (done: number, total: number) => void; signal?: AbortSignal } = {}): Promise<SongDirectory> {
  const index = readSitemapPaths(await getText('sitemaps/sitemap.xml', signal)).filter((path) =>
    /^sitemaps\/(artistas|musicas_\d+)\.xml$/.test(path),
  )
  if (!index.includes('sitemaps/artistas.xml')) throw new DirectoryFailure('invalid')
  const total = index.length + 1
  let done = 1
  onProgress?.(done, total)

  const artistPaths: string[] = []
  const songPaths: string[] = []
  for (const sitemap of index) {
    const paths = readSitemapPaths(await getText(sitemap, signal))
    if (sitemap === 'sitemaps/artistas.xml') artistPaths.push(...paths)
    else songPaths.push(...paths)
    done += 1
    onProgress?.(done, total)
  }
  const directory = buildDirectory(artistPaths, songPaths)
  if (directory.songs.length === 0) throw new DirectoryFailure('invalid')
  return directory
}

/** "coracao-peregrino" → "Coracao Peregrino". The real title comes with the download. */
export function titleFromSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/** Site default: the catalogue is Brazilian, so pt-BR unless the title is clearly another language. */
export const DIRECTORY_DEFAULT_LANGUAGE: Locale = 'pt-BR'

export function titleLanguage(slug: string): Locale | string {
  const detected = detectLanguage(slug.replace(/-/g, ' '), { minHits: 2 })
  return detected.locale ?? detected.other ?? DIRECTORY_DEFAULT_LANGUAGE
}

export function directoryEntry(directory: SongDirectory, [artist, song]: [number, string]): DirectoryEntry {
  const artistSlug = directory.artists[artist] ?? ''
  return {
    artistSlug,
    songSlug: song,
    artist: titleFromSlug(artistSlug),
    title: titleFromSlug(song),
    url: `${LETRAS_GOSPEL_ORIGIN}/${artistSlug}/${song}`,
    language: titleLanguage(song),
  }
}

/** Search the provider's lyric snippets without downloading the catalogue's lyrics. */
export async function searchLyrics(query: string, signal?: AbortSignal): Promise<DirectoryEntry[]> {
  const response = await fetch(`${LETRAS_GOSPEL_PROXY}search?q=${encodeURIComponent(query.trim())}`, { signal, credentials: 'same-origin' })
  if (!response.ok) throw new DirectoryFailure('unavailable')
  const data: unknown = await response.json()
  const snippets = (data && typeof data === 'object' && 'snippets' in data && Array.isArray(data.snippets)) ? data.snippets : []
  const seen = new Set<string>()
  return snippets.flatMap((item: unknown) => {
    if (!item || typeof item !== 'object' || !('link' in item) || typeof item.link !== 'string') return []
    let url: URL
    try { url = new URL(item.link) } catch { return [] }
    const path = url.pathname.replace(/^\/+|\/+$/g, '')
    if (url.origin !== LETRAS_GOSPEL_ORIGIN || url.search || url.hash || !isAllowedLetrasGospelPath(path) || path.split('/').length !== 2 || seen.has(path)) return []
    seen.add(path)
    const [artistSlug, songSlug] = path.split('/')
    const entry = directoryEntry({ updatedAt: '', artists: [artistSlug], songs: [] }, [0, songSlug])
    if ('lyric_title' in item && typeof item.lyric_title === 'string') {
      const separator = item.lyric_title.lastIndexOf(' - ')
      if (separator > 0) {
        entry.title = sanitizeSingleLine(item.lyric_title.slice(0, separator))
        entry.artist = sanitizeSingleLine(item.lyric_title.slice(separator + 3))
      }
    }
    return [entry]
  })
}

/** Lower-case words without accents, as in the site's slugs. */
export function searchKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Songs whose title contains every word of the query (titles only; artists
 * have their own search). Titles that start with the query come first.
 */
export function searchSongs(directory: SongDirectory, query: string, limit = 100): DirectoryEntry[] {
  const key = searchKey(query)
  if (!key) return []
  const words = key.split(' ')
  const ranked: { rank: number; song: [number, string] }[] = []
  let leading = 0
  for (const song of directory.songs) {
    const title = song[1].replace(/-/g, ' ')
    if (!words.every((word) => title.includes(word))) continue
    const rank = title.startsWith(key) ? 0 : 1
    ranked.push({ rank, song })
    if (rank === 0 && ++leading >= limit) break
  }
  ranked.sort((a, b) => a.rank - b.rank || a.song[1].localeCompare(b.song[1]))
  return ranked.slice(0, limit).map((entry) => directoryEntry(directory, entry.song))
}

export interface DirectoryArtist {
  slug: string
  name: string
  songCount: number
}

/** Songs per artist index, counted once per catalogue. */
export function artistSongCounts(directory: SongDirectory): number[] {
  const counts = new Array<number>(directory.artists.length).fill(0)
  for (const [artist] of directory.songs) counts[artist] = (counts[artist] ?? 0) + 1
  return counts
}

/** Artists whose name contains every word; names that start with the query first, then the largest repertoires. */
export function searchArtists(directory: SongDirectory, query: string, limit = 100, counts = artistSongCounts(directory)): DirectoryArtist[] {
  const key = searchKey(query)
  if (!key) return []
  const words = key.split(' ')
  return directory.artists
    .map((slug, index) => ({ slug, key: slug.replace(/-/g, ' '), index }))
    .filter((artist) => words.every((word) => artist.key.includes(word)))
    .map((artist) => ({ ...artist, rank: artist.key.startsWith(key) ? 0 : 1, songCount: counts[artist.index] ?? 0 }))
    .sort((a, b) => a.rank - b.rank || b.songCount - a.songCount || a.key.localeCompare(b.key))
    .slice(0, limit)
    .map(({ slug, songCount }) => ({ slug, name: titleFromSlug(slug), songCount }))
}

/**
 * One artist's repertoire: their own songs, and songs by others that credit
 * them ("part", "feat", "participacao" in the title), both sorted by title.
 */
export function artistRepertoire(directory: SongDirectory, slug: string): { own: DirectoryEntry[]; featured: DirectoryEntry[] } {
  const index = directory.artists.indexOf(slug)
  const name = slug.replace(/-/g, ' ')
  // Slugs hold only a-z, 0-9 and spaces once dashes are replaced, so the name needs no escaping.
  const credit = new RegExp(`\\b(part|feat|ft|participacao|com) ${name}\\b`)
  const own: DirectoryEntry[] = []
  const featured: DirectoryEntry[] = []
  for (const song of directory.songs) {
    if (song[0] === index) own.push(directoryEntry(directory, song))
    else if (credit.test(song[1].replace(/-/g, ' '))) featured.push(directoryEntry(directory, song))
  }
  const byTitle = (a: DirectoryEntry, b: DirectoryEntry) => a.songSlug.localeCompare(b.songSlug)
  return { own: own.sort(byTitle), featured: featured.sort(byTitle) }
}

/** The lyrics block: text lines from <br>, a blank line between stanzas. */
function lyricsFrom(element: Element): string {
  let text = ''
  const walk = (node: Node) => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) text += child.textContent ?? ''
      else if (child.nodeName === 'BR') text += '\n'
      else if (child.nodeName === 'SCRIPT' || child.nodeName === 'STYLE') return
      else {
        const block = /^(P|DIV)$/.test(child.nodeName)
        if (block && text && !text.endsWith('\n\n')) text += '\n\n'
        walk(child)
        if (block) text += '\n\n'
      }
    })
  }
  walk(element)
  return text
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function structuredData(doc: Document): { title?: string; artist?: string; language?: string } {
  for (const script of Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))) {
    try {
      const data = JSON.parse(script.textContent ?? '') as {
        '@type'?: string
        name?: unknown
        inLanguage?: unknown
        byArtist?: { name?: unknown }
      }
      if (data['@type'] === 'MusicRecording') {
        return {
          language: typeof data.inLanguage === 'string' ? data.inLanguage : undefined,
          title: typeof data.name === 'string' ? data.name : undefined,
          artist: typeof data.byArtist?.name === 'string' ? data.byArtist.name : undefined,
        }
      }
    } catch {
      // Not JSON we can read; fall back to the page headings.
    }
  }
  return {}
}

export interface ParsedSongPage {
  title: string
  artist: string
  lyrics: string
  /** From the lyrics; then the page's own inLanguage; then pt-BR. */
  language: Locale | string
}

function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

/** Reads title, artist and lyrics from a song page. Null when the page has no lyrics. */
export function parseSongPage(html: string, entry?: Pick<DirectoryEntry, 'title' | 'artist'>): ParsedSongPage | null {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const block = doc.querySelector('.musica-letra')
  if (!block) return null
  const lyrics = sanitizeText(lyricsFrom(block), 20_000)
  if (!lyrics) return null
  const data = structuredData(doc)
  const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? ''
  const [ogSong, ogArtist] = ogTitle.split('|')[0].split(' - ').map((part) => part.trim())
  const title = sanitizeSingleLine(data.title || doc.querySelector('h1')?.textContent || ogSong || entry?.title, 200)
  const artist = sanitizeSingleLine(data.artist || ogArtist || entry?.artist, 200)
  if (!title) return null
  // The site marks every page pt-BR, even English songs, so the lyrics decide first.
  // Short or mixed lyrics may not say enough; then the title, then the page, then pt-BR.
  const detected = detectLanguage(lyrics)
  const fromTitle = detectLanguage(title, { minHits: 2 })
  const language =
    detected.locale ??
    detected.other ??
    fromTitle.locale ??
    fromTitle.other ??
    (isLocale(data.language) ? data.language : DIRECTORY_DEFAULT_LANGUAGE)
  return { title, artist, lyrics, language }
}

export const LETRAS_GOSPEL_TAG = 'letrasgospel'

/** Downloads one song page and turns it into a library song. */
export async function downloadDirectorySong(entry: DirectoryEntry, signal?: AbortSignal): Promise<LibrarySong> {
  const html = await getText(`${entry.artistSlug}/${entry.songSlug}`, signal)
  const parsed = parseSongPage(html, entry)
  if (!parsed) throw new DirectoryFailure('invalid')
  const now = new Date().toISOString()
  const supported = isLocale(parsed.language)
  return {
    id: newId('song'),
    title: parsed.title,
    lyrics: parsed.lyrics,
    author: parsed.artist || undefined,
    // Languages the app has no locale for are kept as a readable tag instead.
    language: supported ? (parsed.language as Locale) : undefined,
    tags: supported ? [LETRAS_GOSPEL_TAG] : [LETRAS_GOSPEL_TAG, languageName(parsed.language, 'pt-BR')],
    notes: entry.url,
    copyright: 'Letra: letrasgospel.net',
    createdAt: now,
    updatedAt: now,
  }
}
