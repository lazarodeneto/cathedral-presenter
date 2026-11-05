import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { AlignLeft, ArrowLeft, CheckCircle2, ChevronRight, Download, LoaderCircle, Mic2, Music4, RefreshCw, Search, TriangleAlert } from 'lucide-react'
import {
  DirectoryFailure,
  downloadDirectorySong,
  fetchDirectory,
  artistRepertoire,
  artistSongCounts,
  searchArtists,
  searchSongs,
  searchLyrics,
  titleFromSlug,
  type DirectoryEntry,
  type SongDirectory,
} from '../../providers/songs/letrasGospel'
import { loadSongDirectory, saveSongDirectory } from '../../store/songDirectoryStore'
import { reloadAfterAdd } from '../../store/appReload'
import { useAppStore } from '../../store/useAppStore'
import { useToasts } from '../../store/useToasts'
import { languageName } from '../../i18n/dictionary'
import { intlLocale } from '../../utils/dates'
import { useLocale, useT } from '../../i18n/useT'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { Modal } from '../Modal'

const RESULT_LIMIT = 100

type DirectoryMode = 'songs' | 'artists' | 'lyrics'

/**
 * Search every artist and song on letrasgospel.net (catalogue kept in
 * IndexedDB) and download a chosen song into the local song library.
 */
export function SongDirectoryPanel({ onClose }: { onClose: () => void }) {
  const t = useT()
  const locale = useLocale()
  const online = useOnlineStatus()
  const librarySongs = useAppStore((state) => state.librarySongs)
  const createLibrarySong = useAppStore((state) => state.createLibrarySong)
  const push = useToasts((state) => state.push)

  const [directory, setDirectory] = useState<SongDirectory | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [refreshing, setRefreshing] = useState<{ done: number; total: number } | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<DirectoryMode>('songs')
  const [artist, setArtist] = useState<string | null>(null)
  const [lyricResults, setLyricResults] = useState<DirectoryEntry[]>([])
  const [lyricSearching, setLyricSearching] = useState(false)
  const [lyricError, setLyricError] = useState(false)
  const deferredQuery = useDeferredValue(query)

  useEffect(() => {
    const q = deferredQuery.trim()
    setLyricResults([])
    setLyricError(false)
    if (mode !== 'lyrics' || q.length < 2 || !online) { setLyricSearching(false); return }
    const controller = new AbortController()
    setLyricSearching(true)
    const timer = window.setTimeout(() => {
      void searchLyrics(q.slice(0, 120), controller.signal)
        .then((results) => { if (!controller.signal.aborted) setLyricResults(results) })
        .catch(() => { if (!controller.signal.aborted) setLyricError(true) })
        .finally(() => { if (!controller.signal.aborted) setLyricSearching(false) })
    }, 300)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [deferredQuery, mode, online])

  useEffect(() => {
    let alive = true
    void loadSongDirectory().then((saved) => {
      if (!alive) return
      setDirectory(saved)
      setLoaded(true)
    })
    return () => {
      alive = false
    }
  }, [])

  const counts = useMemo(() => (directory ? artistSongCounts(directory) : []), [directory])
  const songResults = useMemo(
    () => (directory && mode === 'songs' ? searchSongs(directory, deferredQuery, RESULT_LIMIT) : []),
    [directory, deferredQuery, mode],
  )
  const artistResults = useMemo(
    () => (directory && mode === 'artists' ? searchArtists(directory, deferredQuery, RESULT_LIMIT, counts) : []),
    [directory, deferredQuery, mode, counts],
  )
  const repertoire = useMemo(() => (directory && artist ? artistRepertoire(directory, artist) : null), [directory, artist])
  // In song mode, an artist whose name matches the query is offered as a shortcut.
  const artistShortcut = useMemo(
    () => (directory && mode === 'songs' ? searchArtists(directory, deferredQuery, 1, counts)[0] : undefined),
    [directory, deferredQuery, mode, counts],
  )
  const downloadedUrls = useMemo(() => new Set(librarySongs.map((song) => song.notes).filter(Boolean)), [librarySongs])
  const number = useMemo(() => new Intl.NumberFormat(intlLocale(locale)), [locale])
  const date = useMemo(() => new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: 'medium' }), [locale])

  const failureMessage = (error: unknown, key: string, values: Record<string, string> = {}) => {
    if (error instanceof DirectoryFailure && error.reason === 'offline') return t('songDirectory.offline')
    if (error instanceof DirectoryFailure && error.reason === 'unavailable' && !online) return t('songDirectory.offline')
    return t(key, values)
  }

  const refresh = async () => {
    setRefreshing({ done: 0, total: 0 })
    try {
      const next = await fetchDirectory({ onProgress: (done, total) => setRefreshing({ done, total }) })
      await saveSongDirectory(next)
      setDirectory(next)
      push(t('songDirectory.updated', { songs: number.format(next.songs.length) }), 'success')
    } catch (error) {
      push(failureMessage(error, 'songDirectory.failed'), 'error')
    } finally {
      setRefreshing(null)
    }
  }

  const download = async (entry: DirectoryEntry) => {
    setDownloading(entry.url)
    try {
      const song = await downloadDirectorySong(entry)
      createLibrarySong(song)
      await reloadAfterAdd(t('songDirectory.downloaded', { title: song.title }), 'success', { kind: 'song', id: song.id })
    } catch (error) {
      push(failureMessage(error, 'songDirectory.downloadFailed', { title: entry.title }), 'error')
      setDownloading(null)
    }
  }

  const busy = refreshing !== null || downloading !== null

  /** One song row. `showArtist` links the artist name to their repertoire. */
  const renderSong = (entry: DirectoryEntry, showArtist: boolean) => {
    const added = downloadedUrls.has(entry.url)
    const language = languageName(entry.language, locale)
    return (
      <li key={entry.url} className="bible-admin-row">
        <span className="song-directory-lang" title={`${language} · ${t('songDirectory.languageGuess')}`}>
          {entry.language.toUpperCase()}
        </span>
        <span className="bible-admin-copy">
          <strong>{entry.title}</strong>
          <small>
            {showArtist ? (
              <button type="button" className="text-link song-directory-artist-link" onClick={() => setArtist(entry.artistSlug)}>
                {entry.artist}
              </button>
            ) : null}
            {showArtist ? ' · ' : ''}
            {language}
          </small>
        </span>
        {added ? (
          <span className="badge badge-quiet">
            <CheckCircle2 size={13} />
            {t('songDirectory.inLibrary')}
          </span>
        ) : (
          <button
            className="btn btn-secondary btn-sm"
            type="button"
            disabled={busy || !online}
            onClick={() => void download(entry)}
            aria-label={`${t('songDirectory.download')}: ${entry.title} · ${entry.artist}`}
          >
            {downloading === entry.url ? <LoaderCircle size={14} className="spin" /> : <Download size={14} />}
            {t('songDirectory.download')}
          </button>
        )}
      </li>
    )
  }

  return (
    <Modal title={t('songDirectory.title')} subtitle={t('songDirectory.subtitle')} onClose={onClose} wide className="song-directory-dialog">
      <div className="song-directory">
        <p className="included-bibles-notice" role="note">
          <TriangleAlert size={15} aria-hidden="true" />
          <span>{t('songDirectory.notice')}</span>
        </p>

        <div className="song-directory-bar">
          <span className="song-directory-stats">
            {directory
              ? t('songDirectory.stats', {
                  artists: number.format(directory.artists.length),
                  songs: number.format(directory.songs.length),
                  date: date.format(new Date(directory.updatedAt)),
                })
              : loaded
                ? t('songDirectory.empty')
                : ''}
          </span>
          <button className="btn btn-secondary btn-sm" type="button" disabled={busy || !online} onClick={() => void refresh()}>
            {refreshing ? <LoaderCircle size={14} className="spin" /> : <RefreshCw size={14} />}
            {refreshing && refreshing.total > 0
              ? t('songDirectory.refreshing', { done: String(refreshing.done), total: String(refreshing.total) })
              : t('songDirectory.refresh')}
          </button>
        </div>
        {!online ? <p className="song-directory-hint">{t('songDirectory.offline')}</p> : null}

        {loaded ? (
          artist && repertoire ? (
            <div className="song-directory-artist">
              <div className="song-directory-artist-head">
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => setArtist(null)}>
                  <ArrowLeft size={14} />
                  {t('songDirectory.back')}
                </button>
                <span className="bible-admin-copy">
                  <strong>{titleFromSlug(artist)}</strong>
                  <small>{t('songDirectory.songCount', { count: number.format(repertoire.own.length) })}</small>
                </span>
              </div>
              <ul className="bible-admin-list song-directory-list" aria-label={titleFromSlug(artist)}>
                {repertoire.own.map((entry) => renderSong(entry, false))}
              </ul>
              {repertoire.featured.length > 0 ? (
                <>
                  <h4 className="song-directory-subhead">
                    {t('songDirectory.featured', { count: number.format(repertoire.featured.length) })}
                  </h4>
                  <ul className="bible-admin-list song-directory-list is-featured" aria-label={t('songDirectory.featuredLabel')}>
                    {repertoire.featured.map((entry) => renderSong(entry, true))}
                  </ul>
                </>
              ) : null}
            </div>
          ) : (
            <>
              <div className="song-directory-tabs" role="tablist" aria-label={t('songDirectory.title')}>
                {(['songs', 'artists', 'lyrics'] as const).map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    role="tab"
                    aria-selected={mode === entry}
                    className={`song-directory-tab ${mode === entry ? 'is-active' : ''}`}
                    onClick={() => setMode(entry)}
                  >
                    {entry === 'songs' ? <Music4 size={14} /> : entry === 'artists' ? <Mic2 size={14} /> : <AlignLeft size={14} />}
                    {t(entry === 'songs' ? 'songDirectory.tabSongs' : entry === 'artists' ? 'songDirectory.tabArtists' : 'library.scope.lyrics')}
                  </button>
                ))}
              </div>
              <label className="search-field">
                <Search size={16} />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t(mode === 'songs' ? 'songDirectory.searchSongs' : mode === 'artists' ? 'songDirectory.searchArtists' : 'library.searchIn.lyrics')}
                  aria-label={t(mode === 'songs' ? 'songDirectory.searchSongs' : mode === 'artists' ? 'songDirectory.searchArtists' : 'library.searchIn.lyrics')}
                />
              </label>
              {mode === 'songs' && artistShortcut ? (
                <button type="button" className="song-directory-shortcut" onClick={() => setArtist(artistShortcut.slug)}>
                  <Mic2 size={14} />
                  <span>
                    {t('songDirectory.artistShortcut', {
                      name: artistShortcut.name,
                      count: number.format(artistShortcut.songCount),
                    })}
                  </span>
                  <ChevronRight size={14} />
                </button>
              ) : null}
              {!deferredQuery.trim() ? (
                <p className="song-directory-hint">
                  {t(mode === 'songs' ? 'songDirectory.hintSongs' : mode === 'artists' ? 'songDirectory.hintArtists' : 'library.searchIn.lyrics')}
                </p>
              ) : mode === 'lyrics' ? (
                lyricSearching ? <p className="song-directory-hint" role="status">{t('songDirectory.searchingLyrics')}</p>
                  : lyricError ? <p className="song-directory-hint" role="alert">{t('songDirectory.failed')}</p>
                    : deferredQuery.trim().length < 2 ? <p className="song-directory-hint">{t('songDirectory.lyricsMinimum')}</p>
                      : lyricResults.length === 0 ? <p className="song-directory-hint">{t('songDirectory.noResults', { query: deferredQuery.trim() })}</p>
                        : <ul className="bible-admin-list song-directory-list" aria-label={t('library.scope.lyrics')}>{lyricResults.map((entry) => renderSong(entry, true))}</ul>
              ) : mode === 'songs' ? (
                songResults.length === 0 ? (
                  <p className="song-directory-hint">{t('songDirectory.noResults', { query: deferredQuery.trim() })}</p>
                ) : (
                  <ul className="bible-admin-list song-directory-list" aria-label={t('songDirectory.tabSongs')}>
                    {songResults.map((entry) => renderSong(entry, true))}
                  </ul>
                )
              ) : artistResults.length === 0 ? (
                <p className="song-directory-hint">{t('songDirectory.noArtists', { query: deferredQuery.trim() })}</p>
              ) : (
                <ul className="bible-admin-list song-directory-list" aria-label={t('songDirectory.tabArtists')}>
                  {artistResults.map((entry) => (
                    <li key={entry.slug}>
                      <button type="button" className="bible-admin-row song-directory-artist-row" onClick={() => setArtist(entry.slug)}>
                        <span className="song-directory-lang" aria-hidden="true">
                          <Mic2 size={15} />
                        </span>
                        <span className="bible-admin-copy">
                          <strong>{entry.name}</strong>
                          <small>{t('songDirectory.songCount', { count: number.format(entry.songCount) })}</small>
                        </span>
                        <ChevronRight size={16} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {(mode === 'songs' ? songResults.length : artistResults.length) === RESULT_LIMIT ? (
                <p className="song-directory-hint">{t('songDirectory.more', { count: String(RESULT_LIMIT) })}</p>
              ) : null}
            </>
          )
        ) : null}
      </div>
    </Modal>
  )
}
