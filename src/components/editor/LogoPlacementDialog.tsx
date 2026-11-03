import { ArrowDownLeft, ArrowDownRight, ArrowUpLeft, ArrowUpRight, Circle, Square } from 'lucide-react'
import { useState } from 'react'
import { useT } from '../../i18n/useT'
import { Modal } from '../Modal'

export type LogoCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
export type LogoShape = 'square' | 'circle'

export function LogoPlacementDialog({
  open,
  onClose,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  onSelect: (corner: LogoCorner, shape: LogoShape) => void
}) {
  const t = useT()
  const [shape, setShape] = useState<LogoShape>('square')
  if (!open) return null

  const options: { corner: LogoCorner; icon: typeof ArrowUpLeft; label: string }[] = [
    { corner: 'top-left', icon: ArrowUpLeft, label: t('editor.top') + ' · ' + t('editor.left') },
    { corner: 'top-right', icon: ArrowUpRight, label: t('editor.top') + ' · ' + t('editor.right') },
    { corner: 'bottom-left', icon: ArrowDownLeft, label: t('editor.bottom') + ' · ' + t('editor.left') },
    { corner: 'bottom-right', icon: ArrowDownRight, label: t('editor.bottom') + ' · ' + t('editor.right') },
  ]

  return (
    <Modal
      title={t('settings.logo')}
      subtitle={t('editor.logoPosition')}
      onClose={onClose}
      className="logo-placement-dialog"
    >
      <div className="logo-shape-toggle" role="radiogroup" aria-label={t('editor.shapeType')}>
        <button
          type="button"
          className={shape === 'square' ? 'is-active' : ''}
          onClick={() => setShape('square')}
          role="radio"
          aria-checked={shape === 'square'}
        >
          <Square size={15} />
          {t('editor.square')}
        </button>
        <button
          type="button"
          className={shape === 'circle' ? 'is-active' : ''}
          onClick={() => setShape('circle')}
          role="radio"
          aria-checked={shape === 'circle'}
        >
          <Circle size={15} />
          {t('editor.circle')}
        </button>
      </div>
      <div className="logo-corner-grid">
        {options.map(({ corner, icon: Icon, label }) => (
          <button
            key={corner}
            className="logo-corner-option"
            type="button"
            onClick={() => {
              onSelect(corner, shape)
              onClose()
            }}
          >
            <Icon size={25} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </Modal>
  )
}
