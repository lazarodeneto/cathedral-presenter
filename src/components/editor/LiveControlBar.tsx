import { useState } from 'react'
import {
  ChevronLeft,
  ArrowLeft,
  ChevronRight,
  EyeOff,
  MessageSquare,
  TriangleAlert,
  Search,
  Snowflake,
  Square,
  X,
  Play,
} from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { useToasts } from '../../store/useToasts'
import { useT } from '../../i18n/useT'
import { flatSlides } from '../../store/serviceUtils'
import { SlideRenderer } from '../SlideRenderer'
import { slideLabel } from '../../utils/slides'
import { Modal } from '../Modal'
import { useDialogFocus } from '../../hooks/useDialogFocus'
import { outputFormat } from '../../utils/outputFormats'
import type { ReactNode } from 'react'

/** Previous / Next for a screen that steps through something else (Bible Mode steps verses). */
export interface LiveNavigation {
  onPrevious: () => void
  onNext: () => void
  previousDisabled: boolean
  nextDisabled: boolean
}

export function LiveControlBar({
  navigation,
  showJump = true,
  onBackToService,
}: {
  navigation?: LiveNavigation
  /** "Go to slide" opens the service's slide list; Bible Mode has its own picker. */
  showJump?: boolean
  onBackToService?: () => void
} = {}) {
  const t = useT()
  const live = useAppStore((state) => state.live)
  const services = useAppStore((state) => state.services)
  const branding = useAppStore((state) => state.branding)
  const aspect = outputFormat(useAppStore((state) => state.settings.outputFormat)).aspect
  const nextLive = useAppStore((state) => state.nextLive)
  const prevLive = useAppStore((state) => state.prevLive)
  const jumpLive = useAppStore((state) => state.jumpLive)
  const toggleBlank = useAppStore((state) => state.toggleBlank)
  const toggleFreeze = useAppStore((state) => state.toggleFreeze)
  const setAudienceMessage = useAppStore((state) => state.setAudienceMessage)
  const clearAudienceMessage = useAppStore((state) => state.clearAudienceMessage)
  const push = useToasts((state) => state.push)
  const [messageOpen, setMessageOpen] = useState(false)
  const [messageDraft, setMessageDraft] = useState('')
  const [jumpOpen, setJumpOpen] = useState(false)
  const [jumpQuery, setJumpQuery] = useState('')

  const service = live ? services.find((s) => s.id === live.serviceId) ?? null : null
  const slides = service ? flatSlides(service) : []
  const current = live ? slides.find((s) => s.slide.id === live.currentSlideId) ?? null : null
  const currentIndex = current?.index ?? -1

  if (!live || !service || !current) return null

  const jumpResults = (() => {
    const needle = jumpQuery.trim().toLowerCase()
    if (!needle) return slides
    return slides.filter((entry) =>
      `${entry.item.title} ${entry.section.title} ${slideLabel(entry.slide)} ${entry.slide.text}`
        .toLowerCase()
        .includes(needle),
    )
  })()

  // The alert is on the audience screen: the operator must see that at a glance.
  const alertOn = Boolean(live.messageVisible && live.message)

  const sendMessage = () => {
    setAudienceMessage(messageDraft)
    setMessageOpen(false)
    push(t('toast.messageSent'), 'success')
  }

  return (
    <>
      {alertOn && (
        <div className="live-alert-banner" role="status">
          <TriangleAlert size={18} strokeWidth={2.4} className="live-alert-banner-icon" aria-hidden="true" />
          <strong className="live-alert-banner-title">{t('live.alertOnScreen')}</strong>
          <span className="live-alert-banner-text">{live.message}</span>
          <button
            type="button"
            className="btn btn-sm live-alert-banner-hide"
            onClick={() => {
              clearAudienceMessage()
              push(t('live.alertHidden'), 'info')
            }}
          >
            <EyeOff size={14} />
            {t('live.hideAlert')}
          </button>
        </div>
      )}
      <div className={`live-control-actions ${showJump || onBackToService ? '' : 'is-three'}`}>
        <button
          className={`live-control ${live.blank ? 'is-active' : ''}`}
          disabled={live.modeTransitionPending}
          onClick={() => {
            toggleBlank()
            push(live.blank ? t('toast.unblanked') : t('toast.blanked'), 'info')
          }}
          aria-pressed={live.blank}
        >
          <Square size={17} />
          <span>{t('live.blank')}</span>
        </button>
        <button
          className={`live-control ${live.frozen ? 'is-active' : ''}`}
          disabled={live.modeTransitionPending}
          onClick={() => {
            toggleFreeze()
            push(live.frozen ? t('toast.unfrozen') : t('toast.frozen'), 'info')
          }}
          aria-pressed={live.frozen}
        >
          <Snowflake size={17} />
          <span>{live.frozen ? t('live.unfreeze') : t('live.freeze')}</span>
        </button>
        <button
          className={`live-control ${alertOn ? 'is-alert-on' : ''}`}
          onClick={() => {
            setMessageDraft(live.message ?? '')
            setMessageOpen(true)
          }}
          aria-pressed={alertOn}
        >
          {alertOn ? <TriangleAlert size={17} strokeWidth={2.4} /> : <MessageSquare size={17} />}
          <span>{t('live.message')}</span>
        </button>
        {showJump && (
          <button className="live-control" onClick={() => { setJumpQuery(''); setJumpOpen(true) }}>
            <Search size={17} />
            <span>{t('live.jump')}</span>
          </button>
        )}
        {onBackToService && (
          <button type="button" className="live-control live-control-back" aria-label={t('biblemode.backToService')} onClick={onBackToService}>
            <ArrowLeft size={17} />
            <span>{t('biblemode.service')}</span>
          </button>
        )}
      </div>
      <div className="live-control-bar">
        <button
          className="live-control live-control-nav"
          onClick={() => (navigation ? navigation.onPrevious() : prevLive())}
          disabled={navigation ? navigation.previousDisabled : currentIndex <= 0}
        >
          <ChevronLeft size={20} />
          <span>{t('live.previous')}</span>
        </button>
        <button
          className="live-control live-control-nav live-control-primary"
          onClick={() => (navigation ? navigation.onNext() : nextLive())}
          disabled={navigation ? navigation.nextDisabled : currentIndex >= slides.length - 1}
        >
          <ChevronRight size={22} />
          <span>{t('live.next')}</span>
        </button>
      </div>

      {messageOpen && (
        <Modal
          title={t('live.messageTitle')}
          subtitle={t('live.messageCopy')}
          onClose={() => setMessageOpen(false)}
        >
          <div className="form-stack">
            <label className="field">
              <span>{t('live.message')}</span>
              <textarea
                rows={4}
                value={messageDraft}
                onChange={(e) => setMessageDraft(e.target.value)}
                placeholder={t('live.messagePlaceholder')}
                autoFocus
              />
            </label>
            <div className="modal-actions">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  clearAudienceMessage()
                  setMessageOpen(false)
                  push(t('toast.messageCleared'), 'info')
                }}
              >
                {t('live.clearMessage')}
              </button>
              <button className="btn btn-primary" onClick={sendMessage} disabled={!messageDraft.trim()}>
                {t('live.sendMessage')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {jumpOpen && (
        <div className="jump-backdrop" onMouseDown={() => setJumpOpen(false)}>
          <JumpDialog
            className="jump-panel"
            label={t('live.jump')}
            onClose={() => setJumpOpen(false)}
          >
            <div className="jump-head">
              <div>
                <span className="eyebrow">{t('live.jump')}</span>
                <h2>{service.title}</h2>
              </div>
              <button className="icon-btn" onClick={() => setJumpOpen(false)} aria-label={t('common.close')}>
                <X size={17} />
              </button>
            </div>
            <label className="search-field">
              <Search size={16} />
              <input
                autoFocus
                value={jumpQuery}
                onChange={(e) => setJumpQuery(e.target.value)}
                placeholder={t('live.searchSlides')}
              />
            </label>
            <div className="jump-list">
              {jumpResults.map((entry) => (
                <button
                  key={entry.slide.id}
                  className={`jump-row ${entry.slide.id === current.slide.id ? 'is-current' : ''}`}
                  onClick={() => {
                    jumpLive(entry.slide.id)
                    setJumpOpen(false)
                  }}
                >
                  <span className="jump-number">{entry.index + 1}</span>
                  <span className="jump-thumb">
                    <SlideRenderer slide={entry.slide} branding={branding} aspectRatio={aspect} compact thumbnail />
                  </span>
                  <span className="jump-copy">
                    <strong>{slideLabel(entry.slide, entry.item.title)}</strong>
                    <span>
                      {entry.section.title} · {entry.item.title}
                    </span>
                  </span>
                  <Play size={14} />
                </button>
              ))}
            </div>
          </JumpDialog>
        </div>
      )}
    </>
  )
}

function JumpDialog({
  className,
  label,
  onClose,
  children,
}: {
  className: string
  label: string
  onClose: () => void
  children: ReactNode
}) {
  const dialog = useDialogFocus<HTMLDivElement>(onClose)
  return (
    <div
      ref={dialog.ref}
      className={className}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabIndex={-1}
      onKeyDown={dialog.onKeyDown}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  )
}
