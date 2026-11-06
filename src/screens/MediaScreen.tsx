import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Film,
  Image as ImageIcon,
  Link2,
  Loader2,
  Plus,
  QrCode,
  Trash2,
  Upload,
  SquarePlay,
  Search,
  Tags,
  Tag,
  Pencil,
  Check,
  X,
} from 'lucide-react'
import type { MediaAsset, MediaKind } from '../types'
import { webMediaProvider } from '../providers/media/MediaProvider'
import { makeElement } from '../utils/slides'
import { createMediaItem } from '../utils/slides'
import { useAppStore } from '../store/useAppStore'
import { useToasts } from '../store/useToasts'
import { useT } from '../i18n/useT'
import { navigate } from '../hooks/useHashRoute'
import { Modal } from '../components/Modal'
import { QrComposer } from '../components/editor/QrComposer'
import { qrElement, type QrVariant } from '../providers/media/mediaWorkflow'
import { SCREEN_META, ScreenIcon } from '../components/ScreenIcon'
import { reloadAfterAdd } from '../store/appReload'
import { DateField } from '../components/DateField'
import { DEFAULT_MEDIA_TAGS, filterMedia, mediaSearchKey, normalizeMediaTags, type MediaFilters } from '../utils/mediaTags'
import { MediaStorageControls } from '../components/MediaStorageControls'
import { removeStoredMedia, updateStoredMedia } from '../providers/media/library'
import { mediaTagLabel } from '../i18n/mediaTagLabels'

const emptyFilters: MediaFilters = { query: '', tags: [], kind: '', from: '', to: '', sort: 'newest' }

function errorMessage(reason: string | undefined, t: (key: string) => string): string {
  if (reason === 'virus-detected') return t('storage.virusDetected')
  if (reason === 'scanner-unavailable') return t('storage.scannerUnavailable')
  if (reason === 'sign-in-required') return t('storage.signIn')
  if (reason === 'drive-not-connected' || reason === 'drive-not-configured') return t('storage.cloudSetup')
  if (reason === 'media-service-unavailable' || reason?.startsWith('drive-')) return t('storage.failed')
  switch (reason) {
    case 'too-large':
    case 'file-too-large':
      return t('error.fileTooLarge')
    case 'empty':
      return t('error.emptyFile')
    case 'svg':
      return t('error.svgRejected')
    case 'mime-mismatch':
      return t('error.mimeMismatch')
    case 'unsupported-type':
    case 'unsupported-extension':
      return t('error.unsupportedType')
    case 'private-network':
      return t('error.privateNetwork')
    case 'unsafe-scheme':
      return t('error.unsafeScheme')
    case 'credentials-in-url':
      return t('error.credentialsInUrl')
    case 'unsafe-port':
      return t('error.unsafePort')
    case 'unsafe-media-type':
      return t('error.unsafeMediaType')
    case 'media-kind-mismatch':
      return t('error.mediaKindMismatch')
    case 'unsupported-provider':
      return t('error.unsupportedProvider')
    case 'invalid-video-id':
      return t('error.invalidVideoId')
    default:
      return t('error.invalidUrl')
  }
}

export function MediaScreen() {
  const t = useT()
  const locale = useAppStore((state) => state.settings.locale)
  const services = useAppStore((state) => state.services)
  const activeServiceId = useAppStore((state) => state.activeServiceId)
  const mediaLibrary = useAppStore((state) => state.mediaLibrary)
  const addMedia = useAppStore((state) => state.addMedia)
  const savedTags = useAppStore((state) => state.mediaTags)
  const storeSetMediaTags = useAppStore((state) => state.setMediaTags)
  const renameMedia = useAppStore((state) => state.renameMedia)
  const addMediaTag = useAppStore((state) => state.addMediaTag)
  const removeMedia = useAppStore((state) => state.removeMedia)
  const addItem = useAppStore((state) => state.addItem)
  const push = useToasts((state) => state.push)
  const activeService = services.find((service) => service.id === activeServiceId)
  const fileInput = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [storage, setStorage] = useState<'local' | 'drive'>('local')
  const [dragging, setDragging] = useState(false)
  const [sectionId, setSectionId] = useState(
    activeService?.sections.find((section) => section.title.toLowerCase().includes('message'))?.id ??
      activeService?.sections[0]?.id ??
      '',
  )
  const [urlOpen, setUrlOpen] = useState(false)
  const [urlValue, setUrlValue] = useState('')
  const [urlKind, setUrlKind] = useState<MediaKind>('image')
  const [urlError, setUrlError] = useState('')
  const [youtubeOpen, setYoutubeOpen] = useState(false)
  const [youtubeValue, setYoutubeValue] = useState('')
  const [youtubeError, setYoutubeError] = useState('')
  const [qrOpen, setQrOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(mediaLibrary[0]?.id ?? null)
  const [filters, setFilters] = useState<MediaFilters>(emptyFilters)
  const [tagQuery, setTagQuery] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const allTags = useMemo(() => normalizeMediaTags([...DEFAULT_MEDIA_TAGS, ...savedTags, ...mediaLibrary.flatMap((asset) => asset.tags ?? [])], 300), [savedTags, mediaLibrary])
  const results = useMemo(() => filterMedia(mediaLibrary, filters, locale), [mediaLibrary, filters, locale])
  const selected = results.find((asset) => asset.id === selectedId) ?? (selectedId ? results[0] ?? null : null)
  const matchingTags = allTags.filter((tag) => mediaSearchKey(tag).includes(mediaSearchKey(tagQuery)) || mediaSearchKey(mediaTagLabel(tag, locale)).includes(mediaSearchKey(tagQuery)))
  const newTag = normalizeMediaTags([tagQuery], 1)[0]
  const canCreateTag = Boolean(newTag && !allTags.some((tag) => mediaSearchKey(tag) === mediaSearchKey(newTag)))
  const hasFilters = Boolean(filters.query || filters.tags.length || filters.kind || filters.from || filters.to || filters.sort !== 'newest')
  useEffect(() => { setRenaming(false) }, [selected?.id])
  const setMediaTags = (id: string, tags: string[]) => {
    storeSetMediaTags(id, tags)
    const asset = useAppStore.getState().mediaLibrary.find((item) => item.id === id)
    if (asset) void updateStoredMedia(asset, { tags: normalizeMediaTags(tags, 30) }).catch(() => push(t('storage.failed'), 'error'))
  }
  const saveName = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selected || !draftName.trim() || savingName) return
    setSavingName(true)
    try { await updateStoredMedia(selected, { name: draftName.trim() }); renameMedia(selected.id, draftName.trim()); setRenaming(false); push(t('storage.renamed'), 'success') }
    catch { push(t('storage.failed'), 'error') }
    finally { setSavingName(false) }
  }

  const selectedSection = sectionId || activeService?.sections[0]?.id || ''

  const handleFiles = async (files: FileList | File[]) => {
    if (!activeService) {
      push(t('toast.noActiveService'), 'error')
      return
    }
    setUploading(true)
    for (const file of Array.from(files)) {
      const result = await webMediaProvider.registerFile(file, { storage })
      if (result.ok && result.asset) {
        addMedia(result.asset)
        setSelectedId(result.asset.id)
        push(t('media.uploaded'), 'success')
      } else {
        push(errorMessage(result.reason, t), 'error')
      }
    }
    setUploading(false)
  }

  const addUrl = (event: React.FormEvent) => {
    event.preventDefault()
    const result = webMediaProvider.registerUrl(urlValue, urlKind)
    if (!result.ok || !result.asset) {
      setUrlError(errorMessage(result.reason, t))
      return
    }
    addMedia(result.asset)
    setSelectedId(result.asset.id)
    setUrlOpen(false)
    setUrlValue('')
    setUrlError('')
    void reloadAfterAdd(t('media.urlAdded'))
  }

  const addYoutube = (event: React.FormEvent) => {
    event.preventDefault()
    const result = webMediaProvider.registerYouTube(youtubeValue)
    if (!result.ok || !result.asset) {
      setYoutubeError(errorMessage(result.reason, t))
      return
    }
    addMedia(result.asset)
    setSelectedId(result.asset.id)
    setYoutubeOpen(false)
    setYoutubeValue('')
    setYoutubeError('')
    void reloadAfterAdd(t('media.urlAdded'))
  }

  const addAssetToService = (asset: MediaAsset) => {
    if (!activeService) {
      push(t('toast.noActiveService'), 'error')
      return
    }
    const isYoutube = /^https:\/\/www\.youtube(?:-nocookie)?\.com\/embed\//.test(asset.source)
    const element = makeElement(isYoutube ? 'embed' : asset.kind, {
      text: asset.name,
      source: asset.source,
      width: isYoutube ? 74 : 84,
      height: isYoutube ? 58 : 74,
      x: isYoutube ? 13 : 8,
      y: isYoutube ? 20 : 12,
      settings: {
        fit: isYoutube ? 'contain' : asset.kind === 'video' ? 'contain' : 'cover',
        provider: isYoutube ? 'youtube' : asset.provider,
        providerLabel: isYoutube ? t('media.officialEmbed') : asset.provider === 'url' ? t('media.remote') : t('media.localOnly'),
        onlineOnly: asset.provider === 'url' || asset.provider === 'youtube',
        localOnly: asset.localOnly,
        missing: asset.status === 'missing',
      },
    })
    const item = createMediaItem(asset.name, element)
    addItem(activeService.id, selectedSection, item)
    push(t('toast.mediaAdded'), 'success')
    navigate(`/service/${activeService.id}`)
  }

  const addQrToService = (payload: string, variant: QrVariant) => {
    if (!activeService) {
      push(t('toast.noActiveService'), 'error')
      return
    }
    const item = createMediaItem(t('media.qr'), qrElement(payload, variant))
    addItem(activeService.id, selectedSection, item)
    push(t('toast.qrAdded'), 'success')
    navigate(`/service/${activeService.id}`)
  }

  return (
    <div className="screen media-screen" data-tone={SCREEN_META.media.tone}>
      <div className="screen-heading">
        <div>
          <ScreenIcon screen="media" />
          <h1>{t('media.title')}</h1>
          <p>{t('media.subtitle')}</p>
        </div>
        <div className="heading-actions">
          <button className="btn btn-secondary" onClick={() => setUrlOpen(true)}>
            <Link2 size={15} />
            {t('media.url')}
          </button>
          <button className="btn btn-secondary" onClick={() => setYoutubeOpen(true)}>
            <SquarePlay size={15} />
            {t('media.youtube')}
          </button>
          <button className="btn btn-secondary" onClick={() => setQrOpen(true)}>
            <QrCode size={15} />
            {t('media.qr')}
          </button>
          <button className="btn btn-primary" onClick={() => fileInput.current?.click()}>
            <Upload size={15} />
            {t('media.upload')}
          </button>
        </div>
      </div>

      <MediaStorageControls storage={storage} onStorageChange={setStorage} uploading={uploading} />
      <input
        ref={fileInput}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/wav,audio/ogg,audio/flac,audio/mp4"
        multiple
        hidden
        onChange={(event) => {
          if (event.target.files?.length) void handleFiles(event.target.files)
          event.target.value = ''
        }}
      />

      <div
        className={`media-drop panel ${dragging ? 'is-dragging' : ''}`}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          if (event.dataTransfer.files.length) void handleFiles(event.dataTransfer.files)
        }}
      >
        <span className="drop-icon">
          {uploading ? <Loader2 size={24} className="spin" /> : <Upload size={24} />}
        </span>
        <div>
          <strong>{t('media.chooseFile')}</strong>
          <p>{t('media.uploadHint')}</p>
        </div>
        <button className="btn btn-secondary" onClick={() => fileInput.current?.click()} disabled={uploading}>
          {t('media.upload')}
        </button>
      </div>

      <div className="media-layout">
        <section className="media-library panel">
          <div className="panel-header">
            <div>
              <h3>
                {t('mediaSearch.count', { shown: results.length, total: mediaLibrary.length })}
              </h3>
            </div>
            <label className="inline-select">
              <span>{t('add.destination')}</span>
              <select value={selectedSection} onChange={(event) => setSectionId(event.target.value)}>
                {activeService?.sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.title}
                  </option>
                ))}
                {!activeService && <option value="">{t('add.noService')}</option>}
              </select>
            </label>
          </div>
          <div className="media-filters" aria-label={t('mediaSearch.filters')}>
            <label className="search-field media-filter-search">
              <Search size={16} aria-hidden="true" />
              <input value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} placeholder={t('mediaSearch.search')} aria-label={t('mediaSearch.search')} />
            </label>
            <div className="media-filter-fields">
              <label className="field"><span>{t('mediaSearch.type')}</span><select value={filters.kind} onChange={(event) => setFilters((current) => ({ ...current, kind: event.target.value }))}><option value="">{t('mediaSearch.allTypes')}</option><option value="image">{t('mediaSearch.image')}</option><option value="video">{t('mediaSearch.video')}</option><option value="audio">{t('editor.audio')}</option><option value="youtube">YouTube</option></select></label>
              <div className="field"><span>{t('mediaSearch.from')}</span><DateField aria-label={t('mediaSearch.from')} value={filters.from} onChange={(value) => setFilters((current) => ({ ...current, from: value }))} /></div>
              <div className="field"><span>{t('mediaSearch.to')}</span><DateField aria-label={t('mediaSearch.to')} value={filters.to} onChange={(value) => setFilters((current) => ({ ...current, to: value }))} /></div>
              <label className="field"><span>{t('mediaSearch.sort')}</span><select value={filters.sort} onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value }))}><option value="newest">{t('mediaSearch.newest')}</option><option value="oldest">{t('mediaSearch.oldest')}</option><option value="name">{t('mediaSearch.name')}</option></select></label>
            </div>
            <details className="media-tag-filter">
              <summary><Tags size={15} aria-hidden="true" />{t('mediaSearch.tags')}{filters.tags.length > 0 && <strong>{filters.tags.length}</strong>}</summary>
              <div className="media-tag-choices">
                {allTags.map((tag) => <label key={tag}><input type="checkbox" checked={filters.tags.includes(tag)} onChange={() => setFilters((current) => ({ ...current, tags: current.tags.includes(tag) ? current.tags.filter((item) => item !== tag) : [...current.tags, tag] }))} /><span>{mediaTagLabel(tag, locale)}</span></label>)}
              </div>
            </details>
            {hasFilters && <button type="button" className="text-link media-filter-clear" onClick={() => setFilters(emptyFilters)}>{t('mediaSearch.clear')}</button>}
          </div>
          {results.length ? (
            <div className="media-grid">
              {results.map((asset) => (
                <button
                  key={asset.id}
                  className={`media-card ${selected?.id === asset.id ? 'is-selected' : ''}`}
                  onClick={() => { setSelectedId(asset.id); setTagQuery('') }}
                >
                  <span className="media-thumb">
                    {asset.kind === 'image' && asset.source ? (
                      <img src={asset.source} alt={asset.name} />
                    ) : /^https:\/\/www\.youtube(?:-nocookie)?\.com\/embed\//.test(asset.source) ? (
                      <SquarePlay size={28} />
                    ) : (
                      <Film size={28} />
                    )}
                    <span className="media-kind">
                      {asset.kind === 'video' ? <Film size={12} /> : <ImageIcon size={12} />}
                      {asset.kind}
                    </span>
                  </span>
                  <span className="media-card-body">
                    <strong>{asset.name}</strong>
                    <span>
                      {asset.provider === 'url'
                        ? t('media.remote')
                        : asset.localOnly
                          ? t('media.localOnly')
                          : t('media.library')}
                    </span>
                    {asset.tags?.length ? <span className="media-card-tags">{asset.tags.map((tag) => mediaTagLabel(tag, locale)).join(' · ')}</span> : null}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="media-empty">
              <ImageIcon size={30} />
              <p>{mediaLibrary.length ? t('mediaSearch.noResults') : t('media.empty')}</p>
            </div>
          )}
        </section>

        <aside className="media-inspector panel">
          {selected ? (
            <>
              <div className="media-preview">
                {selected.kind === 'image' && selected.source ? (
                  <img src={selected.source} alt={selected.name} />
                ) : /^https:\/\/www\.youtube(?:-nocookie)?\.com\/embed\//.test(selected.source) ? (
                  <iframe
                    src={selected.source}
                    title={selected.name}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    sandbox="allow-scripts allow-same-origin allow-presentation"
                  />
                ) : selected.source ? (
                  selected.kind === 'audio' ? <audio src={selected.source} controls /> : <video src={selected.source} muted playsInline controls />
                ) : (
                  <div className="media-missing">
                    <ImageIcon size={24} />
                    <p>{t('media.missingHelp')}</p>
                  </div>
                )}
              </div>
              {renaming ? <form className="media-rename" onSubmit={saveName}>
                <label className="field"><span>{t('storage.mediaName')}</span><input autoFocus value={draftName} onFocus={(event) => event.target.select()} onChange={(event) => setDraftName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') setRenaming(false) }} maxLength={120} disabled={savingName} /></label>
                <button type="submit" className="btn btn-primary btn-icon" disabled={savingName || !draftName.trim()} aria-label={t('common.save')} title={t('common.save')}><Check size={16} /></button>
                <button type="button" className="btn btn-secondary btn-icon" disabled={savingName} onClick={() => setRenaming(false)} aria-label={t('common.cancel')} title={t('common.cancel')}><X size={16} /></button>
              </form> : <div className="media-inspector-title"><h3>{selected.name}</h3><button type="button" className="btn btn-ghost btn-icon" aria-label={t('storage.rename')} title={t('storage.rename')} onClick={() => { setDraftName(selected.name); setRenaming(true) }}><Pencil size={15} aria-hidden="true" /></button></div>}
              <div className="media-tags-editor">
                <strong><Tags size={15} aria-hidden="true" />{t('mediaSearch.tags')}</strong>
                <div className="media-selected-tags">
                  {selected.tags?.length ? selected.tags.map((tag) => <span key={tag} className="media-tag-chip">{mediaTagLabel(tag, locale)}</span>) : <span className="media-tag-empty">{t('mediaSearch.noTags')}</span>}
                </div>
                <details key={selected.id} className="media-tag-picker" onToggle={(event) => {
                  if (!event.currentTarget.open) return
                  const editor = event.currentTarget.closest('.media-tags-editor')
                  requestAnimationFrame(() => editor?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }))
                }}>
                  <summary><Tag size={17} aria-hidden="true" /><span>{t('mediaSearch.addTags')}</span><ChevronDown size={15} className="media-tag-picker-chevron" aria-hidden="true" /></summary>
                  <label className="search-field"><Search size={14} aria-hidden="true" /><input value={tagQuery} onChange={(event) => setTagQuery(event.target.value)} placeholder={t('mediaSearch.findTag')} aria-label={t('mediaSearch.findTag')} maxLength={60} /></label>
                  {canCreateTag && <button type="button" className="btn btn-secondary btn-sm media-create-tag" onClick={() => { addMediaTag(newTag); setMediaTags(selected.id, [...(selected.tags ?? []), newTag]); setTagQuery('') }}><Plus size={14} />{t('mediaSearch.create')}: {newTag}</button>}
                  <div className="media-tag-choices">
                    {matchingTags.map((tag) => <label key={tag}><input type="checkbox" checked={normalizeMediaTags(selected.tags ?? []).includes(tag)} onChange={() => { const current = normalizeMediaTags(selected.tags ?? []); setMediaTags(selected.id, current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]) }} /><span>{mediaTagLabel(tag, locale)}</span></label>)}
                  </div>
                </details>
              </div>
              <div className="detail-list">
                <span>
                  <small>{t('media.type')}</small>
                  {selected.kind}
                </span>
                <span>
                  <small>{t('media.size')}</small>
                  {selected.size ? `${(selected.size / 1024 / 1024).toFixed(2)} MB` : 'URL'}
                </span>
                <span>
                  <small>{t('common.provider')}</small>
                  {selected.provider === 'youtube' ? t('media.officialEmbed') : selected.provider === 'url' ? t('media.remote') : t(selected.storage === 'drive' ? 'storage.drive' : 'storage.local')}
                </span>
                <span>
                  <small>{t('media.type')}</small>
                  {selected.status}
                </span>
              </div>
              {selected.status === 'missing' && (
                <div className="inline-warning">{t('media.missingHelp')}</div>
              )}
              <div className="inspector-actions">
                <button
                  className="btn btn-primary btn-block"
                  onClick={() => addAssetToService(selected)}
                  disabled={!activeService}
                >
                  <Plus size={15} />
                  {t('media.addToService')}
                </button>
                {!activeService && (
                  <button className="text-link centered" onClick={() => navigate('/calendar')}>
                    {t('calendar.newService')}
                    <ChevronRight size={14} />
                  </button>
                )}
                {selected.provider === 'url' && selected.kind === 'image' && (
                  <a className="btn btn-ghost btn-block" href={selected.source} target="_blank" rel="noreferrer">
                    <ExternalLink size={14} />
                    {t('media.open')}
                  </a>
                )}
                <button
                  className="btn btn-ghost btn-block danger-text"
                  onClick={async () => {
                    try { await removeStoredMedia(selected); removeMedia(selected.id); setSelectedId(null) }
                    catch { push(t('storage.failed'), 'error') }
                  }}
                >
                  <Trash2 size={14} />
                  {t('media.remove')}
                </button>
              </div>
            </>
          ) : (
            <div className="empty-inline">
              <ImageIcon size={26} />
              <p>{mediaLibrary.length ? t('mediaSearch.noResults') : t('media.empty')}</p>
            </div>
          )}
        </aside>
      </div>

      {urlOpen && (
        <Modal title={t('media.url')} subtitle={t('media.urlHint')} onClose={() => setUrlOpen(false)}>
          <form className="form-stack" onSubmit={addUrl}>
            <label className="field">
              <span>{t('media.type')}</span>
              <select value={urlKind} onChange={(event) => setUrlKind(event.target.value as MediaKind)}>
                <option value="image">{t('media.urlImage')}</option>
                <option value="video">{t('media.urlVideo')}</option>
              </select>
            </label>
            <label className="field">
              <span>{t('common.source')}</span>
              <input
                value={urlValue}
                onChange={(event) => setUrlValue(event.target.value)}
                placeholder="https://example.org/media.jpg"
                autoFocus
              />
            </label>
            {urlError && <div className="inline-error">{urlError}</div>}
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setUrlOpen(false)}>
                {t('common.cancel')}
              </button>
              <button className="btn btn-primary" type="submit">
                {t('common.add')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {youtubeOpen && (
        <Modal title={t('media.youtube')} subtitle={t('media.youtubeHint')} onClose={() => setYoutubeOpen(false)}>
          <form className="form-stack" onSubmit={addYoutube}>
            <label className="field">
              <span>{t('media.youtubeTitle')}</span>
              <input
                value={youtubeValue}
                onChange={(event) => setYoutubeValue(event.target.value)}
                placeholder={t('media.youtubePlaceholder')}
                autoFocus
              />
            </label>
            {youtubeError && <div className="inline-error">{youtubeError}</div>}
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setYoutubeOpen(false)}>
                {t('common.cancel')}
              </button>
              <button className="btn btn-primary" type="submit">
                {t('common.add')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <QrComposer
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        onInsert={addQrToService}
      />
    </div>
  )
}
