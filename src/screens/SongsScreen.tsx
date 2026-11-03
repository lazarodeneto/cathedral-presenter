import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronRight,
  Filter,
  Music4,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import type { LibrarySong, Locale } from '../types'
import { languageName } from '../i18n/dictionary'
import { useAppStore } from '../store/useAppStore'
import { useToasts } from '../store/useToasts'
import { useLocale, useT } from '../i18n/useT'
import { navigate } from '../hooks/useHashRoute'
import { createLibrarySongItem, DEFAULT_LIBRARY_QUERY, querySongLibrary, parseLyrics, type SongLibraryQuery, type SongLibrarySort } from '../utils/songLibrary'
import { SlideRenderer } from '../components/SlideRenderer'
import { LibrarySongFormDialog } from '../components/songs/LibrarySongFormDialog'
import { DeleteLibrarySongDialog } from '../components/songs/DeleteLibrarySongDialog'
import { SCREEN_META, ScreenIcon } from '../components/ScreenIcon'

export function SongsScreen() {
  const t = useT()
  const locale = useLocale()
  const services = useAppStore((state) => state.services)
  const activeServiceId = useAppStore((state) => state.activeServiceId)
  const branding = useAppStore((state) => state.branding)
  const addItem = useAppStore((state) => state.addItem)
  const librarySongs = useAppStore((state) => state.librarySongs)
  const push = useToasts((state) => state.push)
  const activeService = services.find((service) => service.id === activeServiceId)

  const [libQuery, setLibQuery] = useState<SongLibraryQuery>(DEFAULT_LIBRARY_QUERY)
  const [selectedLibId, setSelectedLibId] = useState<string>('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<LibrarySong | null>(null)
  const [deleting, setDeleting] = useState<LibrarySong | null>(null)

  const [sectionId, setSectionId] = useState(
    activeService?.sections.find((section) => section.title.toLowerCase().includes('worship'))?.id ??
      activeService?.sections[0]?.id ??
      '',
  )

  const activeSectionsRef = useRef(activeService?.sections)
  activeSectionsRef.current = activeService?.sections

  useEffect(() => {
    const sections = activeSectionsRef.current ?? []
    const defaults =
      sections.find((section) => section.title.toLowerCase().includes('worship'))?.id ??
      sections[0]?.id ??
      ''
    setSectionId(defaults)
  }, [activeService?.id])

  const libResults = useMemo(() => querySongLibrary(librarySongs, libQuery), [librarySongs, libQuery])
  const selectedLib = libResults.find((song) => song.id === selectedLibId) ?? libResults[0] ?? null
  const libPreviewItem = useMemo(() => (selectedLib ? createLibrarySongItem(selectedLib) : null), [selectedLib])

  // Auto-select first result when library results change
  useEffect(() => {
    setSelectedLibId((current) => libResults.some((s) => s.id === current) ? current : libResults[0]?.id ?? '')
  }, [libResults])

  const clearLibFilters = () => {
    setLibQuery(DEFAULT_LIBRARY_QUERY)
  }

  const addLibToService = () => {
    if (!selectedLib || !activeService) {
      push(t('toast.noActiveService'), 'error')
      return
    }
    const item = createLibrarySongItem(selectedLib)
    addItem(activeService.id, sectionId || activeService.sections[0]?.id || '', item)
    push(t('toast.contentAdded'), 'success')
    navigate(`/service/${activeService.id}`)
  }

  const libFiltersActive = libQuery.search || libQuery.language || libQuery.category

  const libCategories = useMemo(() => [...new Set(librarySongs.map((s) => s.category).filter(Boolean) as string[])].sort(), [librarySongs])

  return (
    <div className="screen songs-screen" data-tone={SCREEN_META.songs.tone}>
      <div className="screen-heading">
        <div>
          <ScreenIcon screen="songs" />
          <h1>{t('songs.title')}</h1>
          <p>{t('library.subtitle')}</p>
        </div>
        <div className="heading-actions">
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus size={15} />
            {t('library.newSong')}
          </button>
        </div>
      </div>

      <div className="library-layout">
          <aside className="song-list panel">
            <label className="search-field">
              <Search size={16} />
              <input
                value={libQuery.search}
                onChange={(e) => setLibQuery((q) => ({ ...q, search: e.target.value }))}
                placeholder={t('library.search')}
              />
            </label>
            <div className="song-filter-panel">
              <div className="song-filter-head">
                <span className="eyebrow">
                  <Filter size={12} />
                  {t('songs.filters')}
                </span>
                {libFiltersActive && (
                  <button className="text-link song-clear" onClick={clearLibFilters}>
                    {t('songs.clearFilters')}
                  </button>
                )}
              </div>
              <label className="song-language">
                <span>{t('songs.language')}</span>
                <select value={libQuery.language} onChange={(e) => setLibQuery((q) => ({ ...q, language: e.target.value as Locale | '' }))}>
                  <option value="">{t('songs.allLanguages')}</option>
                  {[...new Set(librarySongs.map((s) => s.language).filter(Boolean) as Locale[])].sort().map((lang) => (
                    <option key={lang} value={lang}>{languageName(lang, locale)}</option>
                  ))}
                </select>
              </label>
              {libCategories.length > 0 && (
                <label className="song-language">
                  <span>{t('library.field.category')}</span>
                  <select value={libQuery.category} onChange={(e) => setLibQuery((q) => ({ ...q, category: e.target.value }))}>
                    <option value="">{t('common.all')}</option>
                    {libCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </label>
              )}
              <label className="song-language">
                <span>{t('library.sort')}</span>
                <select value={libQuery.sort} onChange={(e) => setLibQuery((q) => ({ ...q, sort: e.target.value as SongLibrarySort }))}>
                  {(['title', 'author', 'updated', 'created'] as SongLibrarySort[]).map((sort) => (
                    <option key={sort} value={sort}>{t(`library.sortName.${sort}`)}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="side-section">
              <span className="eyebrow song-result-count">
                {t('library.title')}
                <small>{t('songs.resultCount', { count: libResults.length })}</small>
              </span>
              {librarySongs.length === 0 ? (
                <div className="empty-inline">
                  <Music4 size={24} />
                  <p>{t('library.emptyMessage')}</p>
                  <button className="btn btn-primary btn-sm" onClick={() => setCreateOpen(true)}>
                    <Plus size={13} />
                    {t('library.newSong')}
                  </button>
                </div>
              ) : libResults.length === 0 ? (
                <div className="empty-inline">
                  <Music4 size={24} />
                  <p>{t('library.noResults')}</p>
                  {libFiltersActive && (
                    <button className="text-link" onClick={clearLibFilters}>
                      {t('songs.clearFilters')}
                    </button>
                  )}
                </div>
              ) : (
                libResults.map((song) => (
                  <button
                    key={song.id}
                    className={`song-row ${selectedLib?.id === song.id ? 'is-selected' : ''}`}
                    onClick={() => setSelectedLibId(song.id)}
                  >
                    <span className="song-row-icon">
                      <Music4 size={16} />
                    </span>
                    <span>
                      <strong>{song.title}</strong>
                      <span>{song.author ?? t('library.noAuthor')}{song.key ? ` · ${song.key}` : ''}</span>
                    </span>
                    {song.language && <span className="song-row-lang">{song.language.toUpperCase()}</span>}
                    <ChevronRight size={14} />
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className="song-detail panel">
            {selectedLib ? (
              <>
                <div className="song-hero">
                  <div>
                    <span className="eyebrow">{t('library.myLibrary')}</span>
                    <h2>{selectedLib.title}</h2>
                    <p>
                      {[selectedLib.author, selectedLib.key ? `${t('songs.key')} ${selectedLib.key}` : ''].filter(Boolean).join(' · ')}
                    </p>
                    <div className="song-tags">
                      {selectedLib.language && <span className="badge badge-amber">{selectedLib.language.toUpperCase()}</span>}
                      {selectedLib.category && <span className="badge badge-quiet">{selectedLib.category}</span>}
                      <span className="badge badge-quiet">
                        {t('library.stanzaCount', { count: parseLyrics(selectedLib.lyrics).length })}
                      </span>
                      {(selectedLib.tags ?? []).map((tag) => (
                        <span key={tag} className="badge badge-quiet">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="song-preview-frame">
                    <SlideRenderer
                      slide={libPreviewItem?.slides[0] ?? null}
                      branding={branding}
                      compact
                    />
                  </div>
                </div>

                <div className="song-body">
                  <div className="song-lyrics">
                    <span className="eyebrow">{t('songs.lyrics')}</span>
                    {parseLyrics(selectedLib.lyrics).map((stanza, index) => (
                      <div key={index} className="stanza">
                        <span className="stanza-index">{index + 1}</span>
                        <p>{stanza}</p>
                      </div>
                    ))}
                  </div>
                  <aside className="song-meta">
                    {selectedLib.copyright && (
                      <div className="license-box">
                        <span className="eyebrow">{t('library.field.copyright')}</span>
                        <p>{selectedLib.copyright}</p>
                      </div>
                    )}
                    {selectedLib.notes && (
                      <div className="license-box">
                        <span className="eyebrow">{t('library.field.notes')}</span>
                        <p>{selectedLib.notes}</p>
                      </div>
                    )}
                    <div className="song-add">
                      <label className="field">
                        <span>{t('add.destination')}</span>
                        <select value={sectionId} onChange={(event) => setSectionId(event.target.value)}>
                          {activeService?.sections.map((section) => (
                            <option key={section.id} value={section.id}>
                              {section.title}
                            </option>
                          ))}
                          {!activeService && <option value="">{t('add.noService')}</option>}
                        </select>
                      </label>
                      <button
                        className="btn btn-primary btn-block"
                        onClick={addLibToService}
                        disabled={!activeService}
                      >
                        <Plus size={15} />
                        {t('songs.add')}
                      </button>
                      {!activeService && (
                        <button className="text-link centered" onClick={() => navigate('/calendar')}>
                          {t('calendar.newService')}
                          <ChevronRight size={14} />
                        </button>
                      )}
                    </div>
                    <div className="library-song-actions">
                      <button className="btn btn-secondary btn-block" onClick={() => setEditing(selectedLib)}>
                        <Pencil size={14} />
                        {t('library.editSong')}
                      </button>
                      <button className="btn btn-ghost btn-block danger-text" onClick={() => setDeleting(selectedLib)}>
                        <Trash2 size={14} />
                        {t('common.delete')}
                      </button>
                    </div>
                  </aside>
                </div>
              </>
            ) : (
              <div className="empty-inline">
                {librarySongs.length === 0 ? (
                  <>
                    <Music4 size={28} />
                    <p>{t('library.emptyDetail')}</p>
                    <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
                      <Plus size={15} />
                      {t('library.newSong')}
                    </button>
                  </>
                ) : (
                  <>
                    <Music4 size={28} />
                    <p>{t('songs.previewEmpty')}</p>
                  </>
                )}
              </div>
            )}
          </section>
      </div>

      <LibrarySongFormDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <LibrarySongFormDialog open={Boolean(editing)} song={editing} onClose={() => setEditing(null)} />
      <DeleteLibrarySongDialog song={deleting} onClose={() => setDeleting(null)} />
    </div>
  )
}
