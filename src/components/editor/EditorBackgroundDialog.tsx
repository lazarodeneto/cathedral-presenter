import { useRef, useState } from 'react'
import { Image as ImageIcon, Loader2, Trash2, Upload } from 'lucide-react'
import type { Slide } from '../../types'
import { BACKGROUND_PRESETS } from '../../data/templates'
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useT'
import { prepareUploadedMedia } from '../../providers/media/mediaWorkflow'
import { Modal } from '../Modal'

export function EditorBackgroundDialog({
  open,
  slide,
  serviceId,
  itemId,
  onClose,
}: {
  open: boolean
  slide: Slide | null
  serviceId: string
  itemId: string
  onClose: () => void
}) {
  const t = useT()
  const setSlideBackground = useAppStore((state) => state.setSlideBackground)
  const addMedia = useAppStore((state) => state.addMedia)
  const library = useAppStore((state) => state.mediaLibrary)
  const fileInput = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  if (!open || !slide) return null

  const background = slide.background
  const images = library.filter((asset) => asset.kind === 'image' && asset.status === 'ready')
  const [positionX, positionY] = (background.backgroundPosition ?? '50% 50%')
    .split(' ')
    .map((value) => Number.parseInt(value, 10))
  const zoom = background.backgroundZoom ?? 100

  const upload = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    setError('')
    const result = await prepareUploadedMedia(file)
    if (!result.ok || !result.asset) {
      setError(t('error.unsupportedType'))
      setUploading(false)
      return
    }
    addMedia(result.asset)
    setSlideBackground(serviceId, itemId, slide.id, {
      type: 'image',
      source: result.asset.source,
      overlay: 0.46,
      backgroundPosition: '50% 50%',
      backgroundZoom: 100,
      tone: 'dark',
    })
    setUploading(false)
  }

  return (
    <Modal
      title={t('editor.background')}
      subtitle={t('editor.backgroundPreset')}
      onClose={onClose}
      wide
      className="editor-background-dialog"
    >
      <div className="background-dialog-preview">
        <div className={`preset-swatch bg-${background.preset ?? 'graphite'}`}>
          <span />
        </div>
        <div>
          <strong>{t('editor.backgroundPreset')}</strong>
          <span className="muted-note">{background.preset ?? background.type}</span>
        </div>
      </div>

      <div className="preset-grid is-wide">
        {BACKGROUND_PRESETS.map((preset) => (
          <button
            key={preset.id}
            className={`preset-swatch bg-${preset.id} ${
              background.type === 'preset' && background.preset === preset.id ? 'is-active' : ''
            }`}
            onClick={() =>
              setSlideBackground(serviceId, itemId, slide.id, {
                type: 'preset',
                preset: preset.id,
                tone: preset.tone,
              })
            }
            aria-label={t(preset.nameKey)}
          >
            <span />
          </button>
        ))}
      </div>

      <div
        className="editor-background-upload"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          void upload(event.dataTransfer.files[0])
        }}
      >
        <ImageIcon size={20} />
        <div>
          <strong>{t('editor.backgroundImage')}</strong>
          <span>{t('editor.dropHint')}</span>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          type="button"
        >
          {uploading ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
          {uploading ? t('media.uploading') : t('media.upload')}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
          hidden
          onChange={(event) => {
            void upload(event.target.files?.[0])
            event.target.value = ''
          }}
        />
      </div>

      {images.length > 0 && (
        <div className="editor-background-library">
          <span className="eyebrow">{t('media.library')}</span>
          <div className="editor-background-thumbs">
            {images.slice(0, 8).map((asset) => (
              <button
                key={asset.id}
                onClick={() =>
                  setSlideBackground(serviceId, itemId, slide.id, {
                    type: 'image',
                    source: asset.source,
                    overlay: background.overlay ?? 0.46,
                    backgroundPosition: background.backgroundPosition ?? '50% 50%',
                    backgroundZoom: background.backgroundZoom ?? 100,
                    tone: 'dark',
                  })
                }
              >
                <img src={asset.source} alt={asset.name} />
              </button>
            ))}
          </div>
        </div>
      )}

      {background.type === 'image' && (
        <>
          <label className="field">
            <span>
              {t('editor.overlay')} · {Math.round((background.overlay ?? 0.46) * 100)}%
            </span>
            <input
              type="range"
              min={0}
              max={0.85}
              step={0.02}
              value={background.overlay ?? 0.46}
              onChange={(event) =>
                setSlideBackground(serviceId, itemId, slide.id, {
                  ...background,
                  overlay: Number(event.target.value),
                })
              }
            />
          </label>
          <div className="background-position-fields">
            <label className="field compact">
              <span>{t('editor.horizontal')} · {positionX}%</span>
              <input
                type="range"
                min={0}
                max={100}
                value={positionX}
                onChange={(event) =>
                  setSlideBackground(serviceId, itemId, slide.id, {
                    ...background,
                    backgroundPosition: event.target.value + '% ' + positionY + '%',
                  })
                }
              />
            </label>
            <label className="field compact">
              <span>{t('editor.vertical')} · {positionY}%</span>
              <input
                type="range"
                min={0}
                max={100}
                value={positionY}
                onChange={(event) =>
                  setSlideBackground(serviceId, itemId, slide.id, {
                    ...background,
                    backgroundPosition: positionX + '% ' + event.target.value + '%',
                  })
                }
              />
            </label>
          </div>
          <label className="field compact">
            <span>{t('common.zoom')} · {zoom}%</span>
            <input
              type="range"
              min={100}
              max={200}
              step={5}
              value={zoom}
              onChange={(event) =>
                setSlideBackground(serviceId, itemId, slide.id, {
                  ...background,
                  backgroundZoom: Number(event.target.value),
                })
              }
            />
          </label>
        </>
      )}

      {error && <div className="inline-error">{error}</div>}

      <div className="modal-actions">
        {background.type === 'image' && (
          <button
            className="btn btn-ghost btn-sm danger-text"
            onClick={() => {
              setSlideBackground(serviceId, itemId, slide.id, {
                type: 'preset',
                preset: 'graphite',
                tone: 'dark',
              })
            }}
            type="button"
          >
            <Trash2 size={14} />
            {t('editor.removeBackground')}
          </button>
        )}
        <button className="btn btn-primary" onClick={onClose}>
          {t('common.done')}
        </button>
      </div>
    </Modal>
  )
}
