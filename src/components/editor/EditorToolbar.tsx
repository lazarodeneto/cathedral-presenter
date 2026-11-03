import {
  Circle,
  MessageSquareText,
  Copy,
  Eye,
  EyeOff,
  Film,
  Image as ImageIcon,
  ImagePlus,
  Layers,
  Link2,
  Palette,
  Plus,
  QrCode,
  Square,
  SquarePlay,
  Trash2,
  Type,
} from 'lucide-react'
import type { SlideElement } from '../../types'
import { useT } from '../../i18n/useT'
import type { MediaDialogMode } from './EditorMediaDialog'

function ToolButton({
  icon,
  label,
  onClick,
  disabled,
  active,
  title,
  compact,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
  title?: string
  compact?: boolean
}) {
  return (
    <button
      className={`editor-tool ${active ? 'is-active' : ''} ${compact ? 'is-compact' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      aria-label={label}
      type="button"
    >
      {icon}
      {!compact && <span>{label}</span>}
    </button>
  )
}

export function EditorToolbar({
  disabled,
  layersOpen,
  onMedia,
  onLogo,
  logoAvailable,
  onQr,
  onShape,
  onMessage,
  onText,
  onBackground,
  onToggleLayers,
}: {
  disabled: boolean
  layersOpen: boolean
  onMedia: (mode: MediaDialogMode) => void
  onLogo: () => void
  logoAvailable: boolean
  onQr: () => void
  onShape: () => void
  onMessage: () => void
  onText: () => void
  onBackground: () => void
  onToggleLayers: () => void
}) {
  const t = useT()
  return (
    <div className="editor-toolbar" role="toolbar" aria-label={t('editor.element')}>
      <div className="editor-tool-group">
        <ToolButton
          icon={<span className="christian-cross-icon" aria-hidden="true" />}
          label={t('editor.logo')}
          onClick={onLogo}
          disabled={disabled || !logoAvailable}
        />
        <ToolButton icon={<Type size={16} />} label={t('editor.text')} onClick={onText} disabled={disabled} />
        <ToolButton icon={<ImageIcon size={16} />} label={t('editor.image')} onClick={() => onMedia('image')} disabled={disabled} />
        <ToolButton icon={<Film size={16} />} label={t('editor.video')} onClick={() => onMedia('video')} disabled={disabled} />
        <ToolButton icon={<Link2 size={16} />} label={t('editor.url')} onClick={() => onMedia('url')} disabled={disabled} />
      </div>
      <span className="editor-tool-divider" />
      <div className="editor-tool-group">
        <ToolButton icon={<SquarePlay size={16} />} label={t('editor.youtube')} onClick={() => onMedia('youtube')} disabled={disabled} />
        <ToolButton icon={<QrCode size={16} />} label={t('editor.qr')} onClick={onQr} disabled={disabled} />
        <ToolButton icon={<Circle size={16} />} label={t('editor.shape')} onClick={onShape} disabled={disabled} />
        <ToolButton icon={<MessageSquareText size={16} />} label={t('editor.messageBox')} onClick={onMessage} disabled={disabled} />
        <ToolButton icon={<Palette size={16} />} label={t('editor.background')} onClick={onBackground} disabled={disabled} />
        <ToolButton
          icon={<Layers size={16} />}
          label={t('editor.layers')}
          onClick={onToggleLayers}
          disabled={disabled}
          active={layersOpen}
        />
      </div>
    </div>
  )
}

export function ElementActionRail({
  selectedElement,
  onAddContent,
  onAddSlide,
  onFillBackground,
  onToggleVisible,
  onDuplicate,
  onDelete,
}: {
  selectedElement: SlideElement | null
  onAddContent: () => void
  onAddSlide: () => void
  onFillBackground: () => void
  onToggleVisible: () => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const t = useT()
  return (
    <div className="editor-element-actions" role="toolbar" aria-label={t('editor.element')}>
      <ToolButton
        icon={<Plus size={16} />}
        label={t('editor.addContent')}
        onClick={onAddContent}
        compact
      />
      <ToolButton
        icon={<Square size={14} />}
        label={t('editor.addSlide')}
        onClick={onAddSlide}
        compact
      />
      <span className="rail-divider" />
      {selectedElement?.type === 'image' && selectedElement.source && (
        <ToolButton
          icon={<ImagePlus size={16} />}
          label={t('editor.useAsBackground')}
          onClick={onFillBackground}
          compact
        />
      )}
      <ToolButton
        icon={selectedElement?.visible ? <Eye size={16} /> : <EyeOff size={16} />}
        label={t(selectedElement?.visible ? 'common.hide' : 'common.show')}
        onClick={onToggleVisible}
        disabled={!selectedElement}
        compact
      />
      <ToolButton
        icon={<Copy size={16} />}
        label={t('editor.duplicateElement')}
        onClick={onDuplicate}
        disabled={!selectedElement}
        compact
      />
      <ToolButton
        icon={<Trash2 size={16} />}
        label={t('editor.deleteElement')}
        onClick={onDelete}
        disabled={!selectedElement}
        compact
      />
    </div>
  )
}
