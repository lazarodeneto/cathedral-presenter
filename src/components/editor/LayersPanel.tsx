import {
  ArrowDown,
  ArrowUp,
  Circle,
  Copy,
  Eye,
  EyeOff,
  Film,
  Image as ImageIcon,
  Layers,
  MessageSquareText,
  QrCode,
  Trash2,
  Type,
  Video,
} from 'lucide-react'
import type { ElementType, Slide, SlideElement } from '../../types'
import { useT } from '../../i18n/useT'

function LayerIcon({ type }: { type: ElementType }) {
  if (type === 'image') return <ImageIcon size={13} />
  if (type === 'video') return <Film size={13} />
  if (type === 'shape') return <Circle size={13} />
  if (type === 'qr') return <QrCode size={13} />
  if (type === 'embed') return <Video size={13} />
  if (type === 'message') return <MessageSquareText size={13} />
  return <Type size={13} />
}

function layerName(element: SlideElement, t: (key: string) => string): string {
  if (element.text?.trim()) return element.text.trim().slice(0, 52)
  if (element.type === 'image') return t('editor.image')
  if (element.type === 'video') return t('editor.video')
  if (element.type === 'shape') return t('editor.shape')
  if (element.type === 'qr') return t('editor.qr')
  if (element.type === 'embed') return t('editor.youtube')
  if (element.type === 'message') return element.text?.split('\n')[0]?.trim() || t('editor.messageBox')
  return t('editor.text')
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
  onReorder: (id: string, action: 'forward' | 'backward' | 'front' | 'back') => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}) {
  const t = useT()
  const layers = [...slide.elements].sort((a, b) => b.zIndex - a.zIndex)

  return (
    <div className="layers-panel">
      <div className="layers-panel-head">
        <span className="eyebrow">{t('editor.layers')}</span>
        <span className="muted-note">{layers.length}</span>
      </div>
      {layers.length ? (
        <div className="layers-list">
          {layers.map((element) => (
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
                  <strong>{layerName(element, t)}</strong>
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
                <button
                  className="icon-btn icon-btn-xs"
                  onClick={() => onReorder(element.id, 'forward')}
                  aria-label={t('editor.bringForward')}
                >
                  <ArrowUp size={12} />
                </button>
                <button
                  className="icon-btn icon-btn-xs"
                  onClick={() => onReorder(element.id, 'backward')}
                  aria-label={t('editor.sendBackward')}
                >
                  <ArrowDown size={12} />
                </button>
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
          ))}
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
