import { MediaStorageControls } from '../MediaStorageControls'
import { useEffect, useRef, useState } from 'react'
import {
  Film,
  Music4,
  Image as ImageIcon,
  Link2,
  Loader2,
  SquarePlay,
  Upload,
  WifiOff,
} from 'lucide-react'
import type { MediaAsset, MediaKind } from '../../types'
import { useAppStore } from '../../store/useAppStore'
import { useToasts } from '../../store/useToasts'
import { useT } from '../../i18n/useT'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { formatBytes } from '../../security/media'
import { mediaStatus } from '../../providers/media/MediaProvider'
import {
  prepareRemoteMedia,
  prepareUploadedMedia,
  prepareYouTubeMedia,
} from '../../providers/media/mediaWorkflow'
import { Modal } from '../Modal'

export type MediaDialogMode = 'image' | 'video' | 'audio' | 'url' | 'youtube'

export function mediaError(reason: string | undefined, t: (key: string) => string): string {
  if (reason === 'virus-detected') return t('storage.virusDetected')
  if (reason === 'scanner-unavailable') return t('storage.scannerUnavailable')
  if (reason === 'sign-in-required') return t('storage.signIn')
  if (reason === 'scan-pending') return t('cloud.scanPending')
  if (reason === 'media-service-unavailable' || reason?.startsWith('drive-')) return t('storage.failed')
  switch (reason) {
    case 'file-too-large':
      return t('error.fileTooLarge')
    case 'empty-file':
      return t('error.emptyFile')
    case 'svg-rejected':
      return t('error.svgRejected')
    case 'mime-mismatch':
      return t('error.mimeMismatch')
    case 'unsupported-type':
    case 'unsupported-extension':
      return t('error.unsupportedType')
    case 'invalid-file-signature':
      return t('error.invalidFileSignature')
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
    case 'read-failed':
      return t('error.readFailed')
    default:
      return t('error.invalidUrl')
  }
}

function Preview({
  asset,
  online,
  onError,
}: {
  asset: MediaAsset
  online: boolean
  onError: (error: boolean) => void
}) {
  const t = useT()
  const [loading, setLoading] = useState(true)
  const status = mediaStatus(asset, online)

  useEffect(() => {
    setLoading(true)
    onError(false)
  }, [asset.id, onError])

  if (status === 'missing' || !asset.source) {
    return (
      <div className="editor-media-state is-missing">
        <ImageIcon size={25} />
        <strong>{t('media.missing')}</strong>
        <span>{t('media.missingHelp')}</span>
      </div>
    )
  }
  if (status === 'unsupported') {
    return (
      <div className="editor-media-state is-error">
        <Film size={25} />
        <strong>{t('media.unsupported')}</strong>
        <span>{t('error.unsupportedType')}</span>
      </div>
    )
  }
  if (status === 'offline') {
    return (
      <div className="editor-media-state is-offline">
        <WifiOff size={25} />
        <strong>{t('media.offline')}</strong>
        <span>{t('editor.onlineOnly')}</span>
      </div>
    )
  }

  return (
    <div className={`editor-media-preview ${loading ? 'is-loading' : ''}`}>
      {loading && (
        <span className="editor-media-loading">
          <Loader2 size={20} className="spin" />
          {t('common.loading')}
        </span>
      )}
      {asset.provider === 'youtube' ? (
        <iframe
          src={asset.source}
          title={asset.name}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false)
            onError(true)
          }}
        />
      ) : asset.kind === 'image' ? (
        <img
          src={asset.source}
          alt={asset.name}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false)
            onError(true)
          }}
        />
      ) : asset.kind === 'audio' ? (
        <audio src={asset.source} controls muted preload="metadata" onLoadedMetadata={() => setLoading(false)} onError={() => { setLoading(false); onError(true) }} />
      ) : (
        <video
          src={asset.source}
          controls
          muted
          playsInline
          onLoadedData={() => setLoading(false)}
          onError={() => {
            setLoading(false)
            onError(true)
          }}
        />
      )}
    </div>
  )
}

export function EditorMediaDialog({
  open,
  mode,
  onClose,
  onInsert,
}: {
  open: boolean
  mode: MediaDialogMode
  onClose: () => void
  onInsert: (asset: MediaAsset) => void
}) {
  const t = useT()
  const online = useOnlineStatus()
  const library = useAppStore((state) => state.mediaLibrary)
  const addMedia = useAppStore((state) => state.addMedia)
  const push = useToasts((state) => state.push)
  const fileInput = useRef<HTMLInputElement>(null)
  const [storage, setStorage] = useState<'local' | 'drive'>('local')
  const [kind, setKind] = useState<MediaKind>(mode === 'audio' ? 'audio' : mode === 'video' ? 'video' : 'image')
  const [selected, setSelected] = useState<MediaAsset | null>(null)
  const [urlValue, setUrlValue] = useState('')
  const [youtubeValue, setYoutubeValue] = useState('')
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [previewError, setPreviewError] = useState(false)

  useEffect(() => {
    if (!open) return
    setKind(mode === 'audio' ? 'audio' : mode === 'video' || mode === 'youtube' ? 'video' : 'image')
    setSelected(null)
    setError('')
    setUrlValue('')
    setYoutubeValue('')
    setPreviewError(false)
  }, [mode, open])

  if (!open) return null

  const youtubeMode = mode === 'youtube'
  const filtered = library.filter((asset) =>
    youtubeMode ? asset.provider === 'youtube' : asset.kind === kind && asset.provider !== 'youtube',
  )

  const uploadFiles = async (files: FileList | File[]) => {
    setUploading(true)
    setError('')
    const accepted: MediaAsset[] = []
    for (const file of Array.from(files)) {
      let result: Awaited<ReturnType<typeof prepareUploadedMedia>>
      try { result = await prepareUploadedMedia(file, { storage }) } catch { result = { ok: false, reason: 'read-failed' } }
      if (!result.ok || !result.asset) {
        setError(mediaError(result.reason, t))
        continue
      }
      addMedia(result.asset)
      accepted.push(result.asset)
    }
    if (accepted.length) {
      setSelected(accepted[0])
      push(t('media.uploaded'), 'success')
    }
    setUploading(false)
  }

  const previewUrl = () => {
    setError('')
    const result = prepareRemoteMedia(urlValue, kind)
    if (!result.ok || !result.asset) {
      setError(mediaError(result.reason, t))
      setSelected(null)
      return
    }
    setSelected(result.asset)
  }

  const previewYoutube = () => {
    setError('')
    const result = prepareYouTubeMedia(youtubeValue)
    if (!result.ok || !result.asset) {
      setError(mediaError(result.reason, t))
      setSelected(null)
      return
    }
    setSelected(result.asset)
  }

  const insert = () => {
    if (!selected || previewError) return
    if (!library.some((asset) => asset.id === selected.id)) addMedia(selected)
    onInsert(selected)
    onClose()
  }

  const title = youtubeMode
    ? t('media.youtube')
    : mode === 'audio' ? t('editor.audio') : mode === 'video'
      ? t('editor.video')
      : mode === 'url'
        ? t('media.url')
        : t('editor.image')

  return (
    <Modal
      title={title}
      subtitle={
        youtubeMode
          ? t('media.youtubeHint')
          : mode === 'url'
            ? t('media.urlHint')
            : mode === 'audio' ? t('editor.audio') : mode === 'video'
              ? t('media.uploadHint')
              : t('editor.dropHint')
      }
      onClose={onClose}
      wide
      className="editor-media-dialog"
    >
      {youtubeMode ? (
        <div className="editor-media-remote">
          <form
            className="editor-media-url-row"
            onSubmit={(event) => {
              event.preventDefault()
              previewYoutube()
            }}
          >
            <label className="field">
              <span>{t('media.youtubeTitle')}</span>
              <input
                value={youtubeValue}
                onChange={(event) => setYoutubeValue(event.target.value)}
                placeholder={t('media.youtubePlaceholder')}
                autoFocus
              />
            </label>
            <button className="btn btn-secondary" type="submit">
              <SquarePlay size={15} />
              {t('common.preview')}
            </button>
          </form>
          <div className="editor-provider-note">
            <SquarePlay size={15} />
            <span>
              <strong>YouTube</strong> · {t('media.officialEmbed')}
            </span>
            <span>{t('media.youtubeHint')}</span>
          </div>
          {error && <div className="inline-error">{error}</div>}
        </div>
      ) : mode === 'url' ? (
        <div className="editor-media-remote">
          <div className="segmented segmented-sm editor-kind-switch">
            {(['image', 'video', 'audio'] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={kind === value ? 'is-active' : ''}
                onClick={() => {
                  setKind(value)
                  setSelected(null)
                  setError('')
                }}
              >
                {value === 'image' ? <ImageIcon size={13} /> : value === 'audio' ? <Music4 size={13} /> : <Film size={13} />}
                {t(value === 'audio' ? 'editor.audio' : value === 'image' ? 'media.urlImage' : 'media.urlVideo')}
              </button>
            ))}
          </div>
          <form
            className="editor-media-url-row"
            onSubmit={(event) => {
              event.preventDefault()
              previewUrl()
            }}
          >
            <label className="field">
              <span>{t('common.source')}</span>
              <input
                value={urlValue}
                onChange={(event) => setUrlValue(event.target.value)}
                placeholder={
                  kind === 'image'
                    ? 'https://example.org/media.jpg'
                    : 'https://example.org/media.mp4'
                }
                autoFocus
              />
            </label>
            <button className="btn btn-secondary" type="submit">
              <Link2 size={15} />
              {t('common.preview')}
            </button>
          </form>
          {error && <div className="inline-error">{error}</div>}
        </div>
      ) : (
        <div className="editor-media-browser">
          <MediaStorageControls storage={storage} onStorageChange={setStorage} uploading={uploading} />
          <div
            className={`editor-media-drop ${dragging ? 'is-dragging' : ''}`}
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDragging(false)
              if (event.dataTransfer.files.length) void uploadFiles(event.dataTransfer.files)
            }}
          >
            <span className="editor-media-drop-icon">
              {uploading ? <Loader2 size={22} className="spin" /> : <Upload size={22} />}
            </span>
            <div>
              <strong>{uploading ? t('media.uploading') : t('media.chooseFile')}</strong>
              <span>{t('editor.dropHint')}</span>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              type="button"
            >
              {t('media.upload')}
            </button>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept={
              kind === 'image'
                ? 'image/png,image/jpeg,image/webp,image/gif,image/avif'
                : kind === 'audio' ? 'audio/mpeg,audio/wav,audio/ogg,audio/flac,audio/mp4,.mp3,.wav,.m4a,.flac,.ogg' : 'video/mp4,video/webm,video/quicktime,.mp4,.mov,.m4v,.webm'
            }
            multiple
            hidden
            onChange={(event) => {
              if (event.target.files?.length) void uploadFiles(event.target.files)
              event.target.value = ''
            }}
          />
          {error && <div className="inline-error" role="alert">{error}</div>}
          <div className="editor-media-browser-head">
            <span className="eyebrow">{t('media.library')}</span>
            <div className="segmented segmented-sm">
              {(['image', 'video', 'audio'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={kind === value ? 'is-active' : ''}
                  onClick={() => {
                    setKind(value)
                    setSelected(null)
                  }}
                >
                  {value === 'image' ? <ImageIcon size={12} /> : value === 'audio' ? <Music4 size={12} /> : <Film size={12} />}
                  {t(value === 'audio' ? 'editor.audio' : value === 'image' ? 'editor.image' : 'editor.video')}
                </button>
              ))}
            </div>
          </div>
          {filtered.length ? (
            <div className="editor-media-grid">
              {filtered.map((asset) => {
                const status = mediaStatus(asset, online)
                return (
                  <button
                    key={asset.id}
                    className={`editor-media-card ${selected?.id === asset.id ? 'is-selected' : ''}`}
                    onClick={() => {
                      setSelected(asset)
                      setPreviewError(false)
                    }}
                  >
                    <span className="editor-media-thumb">
                      {asset.kind === 'image' && asset.source && status === 'ready' ? (
                        <img src={asset.source} alt="" />
                      ) : asset.kind === 'video' ? (
                        <Film size={22} />
                      ) : (
                        <ImageIcon size={22} />
                      )}
                      {status !== 'ready' && (
                        <span className={`editor-media-badge is-${status}`}>
                          {t(
                            status === 'offline'
                              ? 'media.offline'
                              : status === 'missing'
                                ? 'media.missing'
                                : 'media.unsupported',
                          )}
                        </span>
                      )}
                    </span>
                    <span className="editor-media-card-copy">
                      <strong>{asset.name}</strong>
                      <small>
                        {asset.provider === 'upload'
                          ? t('media.localOnly')
                          : t('media.remote')}
                        {asset.size ? ` · ${formatBytes(asset.size)}` : ''}
                      </small>
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="editor-media-empty">
              <ImageIcon size={25} />
              <span>{t('media.empty')}</span>
            </div>
          )}
        </div>
      )}

      {selected && (
        <div className="editor-media-selection">
          <Preview asset={selected} online={online} onError={setPreviewError} />
          <div className="editor-media-selection-copy">
            <span className={`badge ${online ? 'badge-success' : 'badge-warning'}`}>
              {selected.provider === 'youtube'
                ? t('media.officialEmbed')
                : selected.provider === 'url'
                  ? t('media.remote')
                  : t('media.localOnly')}
            </span>
            <strong>{selected.name}</strong>
            <span>
              {selected.kind} · {selected.size ? formatBytes(selected.size) : 'URL'}
            </span>
            {selected.localOnly && <span>{t('media.sessionOnly')}</span>}
            {mediaStatus(selected, online) === 'offline' && (
              <span className="inline-warning">{t('editor.onlineOnly')}</span>
            )}
            {previewError && (
              <span className="inline-error">{t('media.unsupported')}</span>
            )}
          </div>
        </div>
      )}

      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>
          {t('common.cancel')}
        </button>
        <button
          className="btn btn-primary"
          onClick={insert}
          disabled={!selected || previewError || mediaStatus(selected, online) === 'missing'}
        >
          <Upload size={14} />
          {t('media.addElement')}
        </button>
      </div>
    </Modal>
  )
}
