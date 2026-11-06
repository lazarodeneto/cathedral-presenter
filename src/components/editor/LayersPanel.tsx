import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Circle,
  Copy,
  Eye,
  EyeOff,
  Film,
  Image as ImageIcon,
  Layers,
  MessageSquareText,
  Music4,
  QrCode,
  Trash2,
  Type,
  Video,
} from 'lucide-react'
import type { ElementType, Slide, SlideElement } from '../../types'
import { useT } from '../../i18n/useT'
import { CONTENT_LAYER_ID, DEFAULT_CONTENT_Z, hasContentLayer, slideLabel } from '../../utils/slides'

type ReorderAction = 'forward' | 'backward' | 'front' | 'back'

type Layer =
  | { kind: 'element'; id: string; z: number; element: SlideElement }
  | { kind: 'content'; id: string; z: number }

function LayerIcon({ type }: { type: ElementType }) {
  if (type === 'image') return <ImageIcon size={13} />
  if (type === 'video' || type === 'audio') return <Film size={13} />
  if (type === 'shape') return <Circle size={13} />
  if (type === 'qr') return <QrCode size={13} />
  if (type === 'embed') return <Video size={13} />
  if (type === 'message') return <MessageSquareText size={13} />
  return <Type size={13} />
}

function layerName(element: SlideElement, t: (key: string) => string): string {
  if (element.text?.trim()) return element.text.trim().slice(0, 52)
  if (element.type === 'image') return t('editor.image')
  if (element.type === 'audio') return t('editor.audio')
  if (element.type === 'video') return t('editor.video')
  if (element.type === 'shape') return t('editor.shape')
  if (element.type === 'qr') return t('editor.qr')
  if (element.type === 'embed') return t('editor.youtube')
  if (element.type === 'message') return element.text?.split('\n')[0]?.trim() || t('editor.messageBox')
  return t('editor.text')
}

/** What the slide's own text layer is called: the verse, the song's first line, or the slide text. */
function contentLayer(slide: Slide, t: (key: string) => string): { name: string; detail: string } {
  const firstLine = slide.text.split('\n')[0]?.trim().slice(0, 52)
  if (slide.bible) return { name: slideLabel(slide, t('editor.layerSlideText')), detail: t('editor.layerScripture') }
  if (slide.kind === 'lyrics') return { name: firstLine || t('editor.layerLyrics'), detail: t('editor.layerLyrics') }
  return { name: firstLine || t('editor.layerSlideText'), detail: t('editor.layerSlideText') }
}

export function LayersPanel({
  slide,
  selectedElementId,
  onSelect,
  onToggleVisible,
  onReorder,
  onDuplicate,
  onDelete,
}: {
  slide: Slide
  selectedElementId: string | null
  onSelect: (id: string) => void
  onToggleVisible: (element: SlideElement) => void
  onReorder: (id: string, action: ReorderAction) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}) {
  const t = useT()
  // Top of the list is front-most. The slide's own text (lyrics, Scripture, title or body)
  // is a layer too, ordered together with the elements; on equal z the element is in front.
  const layers: Layer[] = slide.elements.map((element) => ({ kind: 'element', id: element.id, z: element.zIndex, element }))
  if (hasContentLayer(slide)) layers.push({ kind: 'content', id: CONTENT_LAYER_ID, z: slide.contentZ ?? DEFAULT_CONTENT_Z })
  layers.sort((a, b) => b.z - a.z || Number(a.kind === 'content') - Number(b.kind === 'content'))
  const content = contentLayer(slide, t)

  const orderButtons = (id: string, name: string) => (
    <>
      <button
        className="icon-btn icon-btn-xs"
        onClick={() => onReorder(id, 'forward')}
        aria-label={`${t('editor.bringForward')}: ${name}`}
        title={t('editor.bringForward')}
      >
        <ArrowUp size={12} />
      </button>
      <button
        className="icon-btn icon-btn-xs"
        onClick={() => onReorder(id, 'backward')}
        aria-label={`${t('editor.sendBackward')}: ${name}`}
        title={t('editor.sendBackward')}
      >
        <ArrowDown size={12} />
      </button>
    </>
  )

  return (
    <div className="layers-panel">
      <div className="layers-panel-head">
        <span className="eyebrow">{t('editor.layers')}</span>
        <span className="muted-note">{layers.length}</span>
      </div>
      {layers.length ? (
        <div className="layers-list">
          {layers.map((layer) => {
            if (layer.kind === 'content') {
              return (
                <div key={layer.id} className="layer-row is-content">
                  <div className="layer-main">
                    <span className="layer-icon">
                      {slide.bible ? <BookOpen size={13} /> : slide.kind === 'lyrics' ? <Music4 size={13} /> : <Type size={13} />}
                    </span>
                    <span className="layer-copy">
                      <strong>{content.name}</strong>
                      <small>
                        {content.detail} · z {layer.z}
                      </small>
                    </span>
                  </div>
                  <div className="layer-actions">{orderButtons(layer.id, content.name)}</div>
                </div>
              )
            }
            const { element } = layer
            const name = layerName(element, t)
            return (
              <div
                key={element.id}
                className={`layer-row ${selectedElementId === element.id ? 'is-selected' : ''} ${
                  element.visible ? '' : 'is-hidden'
                }`}
              >
                <button className="layer-main" onClick={() => onSelect(element.id)}>
                  <span className="layer-icon">
                    <LayerIcon type={element.type} />
                  </span>
                  <span className="layer-copy">
                    <strong>{name}</strong>
                    <small>
                      {element.type} · z {element.zIndex}
                      {element.settings?.missing ? ` · ${t('media.missing')}` : ''}
                    </small>
                  </span>
                </button>
                <div className="layer-actions">
                  <button
                    className="icon-btn icon-btn-xs"
                    onClick={() => onToggleVisible(element)}
                    aria-label={t(element.visible ? 'common.hide' : 'common.show')}
                  >
                    {element.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                  </button>
                  {orderButtons(element.id, name)}
                  <button
                    className="icon-btn icon-btn-xs"
                    onClick={() => onDuplicate(element.id)}
                    aria-label={t('editor.duplicateElement')}
                  >
                    <Copy size={12} />
                  </button>
                  <button
                    className="icon-btn icon-btn-xs danger-text"
                    onClick={() => onDelete(element.id)}
                    aria-label={t('editor.deleteElement')}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="empty-inline layer-empty">
          <Layers size={24} />
          <p>{t('editor.noLayers')}</p>
        </div>
      )}
    </div>
  )
}
