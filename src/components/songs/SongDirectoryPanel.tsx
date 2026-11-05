import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Download, LoaderCircle, RefreshCw, Search, TriangleAlert } from 'lucide-react'
import {
  DirectoryFailure,
  downloadDirectorySong,
  fetchDirectory,
  searchDirectory,
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
  const deferredQuery = useDeferredValue(query)

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

  const results = useMemo(
    () => (directory ? searchDirectory(directory, deferredQuery, RESULT_LIMIT) : []),
    [directory, deferredQuery],
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
      await reloadAfterAdd(t('songDirectory.downloaded', { title: song.title }))
    } catch (error) {
      push(failureMessage(error, 'songDirectory.downloadFailed', { title: entry.title }), 'error')
      setDownloading(null)
    }
  }

  const busy = refreshing !== null || downloading !== null

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

        {directory ? (
          <>
            <label className="search-field">
              <Search size={16} />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('songDirectory.search')}
                aria-label={t('songDirectory.search')}
              />
            </label>
            {!deferredQuery.trim() ? (
              <p className="song-directory-hint">{t('songDirectory.hint')}</p>
            ) : results.length === 0 ? (
              <p className="song-directory-hint">{t('songDirectory.noResults', { query: deferredQuery.trim() })}</p>
            ) : (
              <ul className="bible-admin-list song-directory-list" aria-label={t('songDirectory.title')}>
                {results.map((entry) => {
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
                          {entry.artist} · {language}
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
                })}
              </ul>
            )}
            {results.length === RESULT_LIMIT ? (
              <p className="song-directory-hint">{t('songDirectory.more', { count: String(RESULT_LIMIT) })}</p>
            ) : null}
          </>
        ) : null}
      </div>
    </Modal>
  )
}
