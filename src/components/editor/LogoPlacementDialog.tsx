import { ArrowDownLeft, ArrowDownRight, ArrowUpLeft, ArrowUpRight, Circle, ImageUp, Loader2, Square } from 'lucide-react'
import { useRef, useState } from 'react'
import { useT } from '../../i18n/useT'
import { LOGO_ACCEPT } from '../../utils/logo'
import { Modal } from '../Modal'

export type LogoCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
export type LogoShape = 'square' | 'circle'

export function LogoPlacementDialog({
  open,
  logoUrl,
  onClose,
  onSelect,
  onUpload,
}: {
  open: boolean
  /** The church logo from branding, or null when none is uploaded yet. */
  logoUrl: string | null
  onClose: () => void
  onSelect: (corner: LogoCorner, shape: LogoShape, allSlides: boolean) => void
  /** Uploads and saves a logo to branding; resolves true when it worked. */
  onUpload: (file: File) => Promise<boolean>
}) {
  const t = useT()
  const [shape, setShape] = useState<LogoShape>('square')
  const [allSlides, setAllSlides] = useState(false)
  const [busy, setBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
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
      subtitle={logoUrl ? t('editor.logoPosition') : t('editor.logoMissing')}
      onClose={onClose}
      className="logo-placement-dialog"
    >
      <div className={`logo-source ${logoUrl ? 'has-logo' : ''}`}>
        {logoUrl ? (
          <img src={logoUrl} alt="" className={shape === 'circle' ? 'is-circle' : ''} />
        ) : (
          <span className="christian-cross-icon" aria-hidden="true" />
        )}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
        >
          {busy ? <Loader2 size={14} className="spin" /> : <ImageUp size={14} />}
          {logoUrl ? t('branding.replaceLogo') : t('settings.uploadLogo')}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept={LOGO_ACCEPT}
          hidden
          onChange={async (event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (!file) return
            setBusy(true)
            await onUpload(file)
            setBusy(false)
          }}
        />
      </div>
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
            disabled={!logoUrl}
            onClick={() => {
              onSelect(corner, shape, allSlides)
              onClose()
            }}
          >
            <Icon size={25} />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <label className="logo-all-slides">
        <input type="checkbox" checked={allSlides} onChange={(event) => setAllSlides(event.target.checked)} />
        <span>{t('editor.logoAllSlides')}</span>
      </label>
    </Modal>
  )
}
