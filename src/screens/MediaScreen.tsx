import { useRef, useState } from 'react'
import {
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

function errorMessage(reason: string | undefined, t: (key: string) => string): string {
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
  const services = useAppStore((state) => state.services)
  const activeServiceId = useAppStore((state) => state.activeServiceId)
  const mediaLibrary = useAppStore((state) => state.mediaLibrary)
  const addMedia = useAppStore((state) => state.addMedia)
  const removeMedia = useAppStore((state) => state.removeMedia)
  const addItem = useAppStore((state) => state.addItem)
  const push = useToasts((state) => state.push)
  const activeService = services.find((service) => service.id === activeServiceId)
  const fileInput = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
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
  const [selected, setSelected] = useState<MediaAsset | null>(mediaLibrary[0] ?? null)

  const selectedSection = sectionId || activeService?.sections[0]?.id || ''

  const handleFiles = async (files: FileList | File[]) => {
    if (!activeService) {
      push(t('toast.noActiveService'), 'error')
      return
    }
    setUploading(true)
    for (const file of Array.from(files)) {
      const result = await webMediaProvider.registerFile(file)
      if (result.ok && result.asset) {
        addMedia(result.asset)
        setSelected(result.asset)
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
    setSelected(result.asset)
    setUrlOpen(false)
    setUrlValue('')
    setUrlError('')
    push(t('media.urlAdded'), 'success')
  }

  const addYoutube = (event: React.FormEvent) => {
    event.preventDefault()
    const result = webMediaProvider.registerYouTube(youtubeValue)
    if (!result.ok || !result.asset) {
      setYoutubeError(errorMessage(result.reason, t))
      return
    }
    addMedia(result.asset)
    setSelected(result.asset)
    setYoutubeOpen(false)
    setYoutubeValue('')
    setYoutubeError('')
    push(t('media.urlAdded'), 'success')
  }

  const addAssetToService = (asset: MediaAsset) => {
    if (!activeService) {
      push(t('toast.noActiveService'), 'error')
      return
    }
    const isYoutube = /^https:\/\/www\.youtube(?:-nocookie)?\.com\/embed\//.test(asset.source)
    const element = makeElement(isYoutube ? 'embed' : asset.kind === 'video' ? 'video' : 'image', {
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
    <div className="screen media-screen">
      <div className="screen-heading">
        <div>
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

      <input
        ref={fileInput}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime"
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
                {mediaLibrary.length} {t('common.items')}
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
          {mediaLibrary.length ? (
            <div className="media-grid">
              {mediaLibrary.map((asset) => (
                <button
                  key={asset.id}
                  className={`media-card ${selected?.id === asset.id ? 'is-selected' : ''}`}
                  onClick={() => setSelected(asset)}
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
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="media-empty">
              <ImageIcon size={30} />
              <p>{t('media.empty')}</p>
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
                  <video src={selected.source} muted playsInline />
                ) : (
                  <div className="media-missing">
                    <ImageIcon size={24} />
                    <p>{t('media.missingHelp')}</p>
                  </div>
                )}
              </div>
              <h3>{selected.name}</h3>
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
                  {selected.provider === 'youtube' ? t('media.officialEmbed') : selected.provider === 'url' ? t('media.remote') : t('media.localOnly')}
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
                  onClick={() => {
                    removeMedia(selected.id)
                    setSelected(null)
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
              <p>{t('media.empty')}</p>
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
