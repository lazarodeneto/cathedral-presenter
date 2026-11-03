import { useMemo, useState } from 'react'
import { Copy, ExternalLink, QrCode } from 'lucide-react'
import { useT } from '../../i18n/useT'
import { useToasts } from '../../store/useToasts'
import {
  type QrInput,
  type QrVariant,
  openPayload,
  qrPayloadFor,
} from '../../providers/media/mediaWorkflow'
import { Modal } from '../Modal'
import { QrImage } from '../SlideRenderer'

const EMPTY: QrInput = {
  variant: 'url',
  value: '',
  eventTitle: '',
  eventDate: '',
  eventLocation: '',
  contactName: '',
  contactOrganization: '',
  contactEmail: '',
  contactPhone: '',
}

export function QrComposer({
  open,
  onClose,
  onInsert,
}: {
  open: boolean
  onClose: () => void
  onInsert: (payload: string, variant: QrVariant) => void
}) {
  const t = useT()
  const push = useToasts((state) => state.push)
  const [input, setInput] = useState<QrInput>(EMPTY)
  const result = useMemo(() => qrPayloadFor(input), [input])
  const payload = result.ok ? result.payload : ''

  if (!open) return null

  const update = (patch: Partial<QrInput>) => setInput((current) => ({ ...current, ...patch }))

  const test = async () => {
    if (!payload) return
    if (input.variant === 'url' && openPayload(payload)) return
    try {
      await navigator.clipboard.writeText(payload)
      push(t('toast.copied'), 'success')
    } catch {
      push(t('error.readFailed'), 'error')
    }
  }

  return (
    <Modal
      title={t('media.qrTitle')}
      subtitle={t('media.qrWarning')}
      onClose={() => {
        onClose()
        setInput(EMPTY)
      }}
      wide
      className="qr-composer"
    >
      <div className="qr-composer-layout">
        <div className="qr-composer-preview">
          <div className={`qr-composer-code ${!payload ? 'is-empty' : ''}`}>
            {payload ? <QrImage payload={payload} /> : <QrCode size={42} />}
          </div>
          <span className="eyebrow">{t('common.preview')}</span>
          <p>{payload ? t('media.qrTest') : t('media.qrHint')}</p>
        </div>
        <div className="form-stack">
          <div className="segmented qr-variant-tabs">
            {(['url', 'text', 'event', 'contact'] as const).map((variant) => (
              <button
                key={variant}
                type="button"
                className={input.variant === variant ? 'is-active' : ''}
                onClick={() => update({ variant })}
              >
                {t(
                  variant === 'url'
                    ? 'media.qrUrl'
                    : variant === 'text'
                      ? 'media.qrText'
                      : variant === 'event'
                        ? 'media.qrEvent'
                        : 'editor.qrContact',
                )}
              </button>
            ))}
          </div>

          {input.variant === 'url' && (
            <label className="field">
              <span>{t('media.qrPayload')}</span>
              <input
                value={input.value}
                onChange={(event) => update({ value: event.target.value })}
                placeholder="https://example.org/event"
                autoFocus
              />
            </label>
          )}

          {input.variant === 'text' && (
            <label className="field">
              <span>{t('media.qrPayload')}</span>
              <textarea
                rows={5}
                value={input.value}
                onChange={(event) => update({ value: event.target.value })}
                placeholder={t('media.qrHint')}
              />
            </label>
          )}

          {input.variant === 'event' && (
            <>
              <label className="field">
                <span>{t('media.qrEventTitle')}</span>
                <input
                  value={input.eventTitle}
                  onChange={(event) => update({ eventTitle: event.target.value })}
                  autoFocus
                />
              </label>
              <div className="field-grid">
                <label className="field">
                  <span>{t('media.qrEventDate')}</span>
                  <input
                    value={input.eventDate}
                    onChange={(event) => update({ eventDate: event.target.value })}
                  />
                </label>
                <label className="field">
                  <span>{t('media.qrEventLocation')}</span>
                  <input
                    value={input.eventLocation}
                    onChange={(event) => update({ eventLocation: event.target.value })}
                  />
                </label>
              </div>
            </>
          )}

          {input.variant === 'contact' && (
            <>
              <div className="field-grid">
                <label className="field">
                  <span>{t('editor.qrContactName')}</span>
                  <input
                    value={input.contactName}
                    onChange={(event) => update({ contactName: event.target.value })}
                    autoFocus
                  />
                </label>
                <label className="field">
                  <span>{t('editor.qrContactOrganization')}</span>
                  <input
                    value={input.contactOrganization}
                    onChange={(event) => update({ contactOrganization: event.target.value })}
                  />
                </label>
              </div>
              <div className="field-grid">
                <label className="field">
                  <span>{t('editor.qrContactEmail')}</span>
                  <input
                    type="email"
                    value={input.contactEmail}
                    onChange={(event) => update({ contactEmail: event.target.value })}
                  />
                </label>
                <label className="field">
                  <span>{t('editor.qrContactPhone')}</span>
                  <input
                    type="tel"
                    value={input.contactPhone}
                    onChange={(event) => update({ contactPhone: event.target.value })}
                  />
                </label>
              </div>
            </>
          )}

          {input.variant === 'url' && input.value.trim() && !result.ok && (
            <div className="inline-error">{t('error.invalidUrl')}</div>
          )}
          {input.variant !== 'url' && !result.ok && (
            <div className="inline-error">{t('error.invalidPayload')}</div>
          )}

          <div className="qr-composer-actions">
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => void test()} disabled={!payload}>
              {input.variant === 'url' ? <ExternalLink size={14} /> : <Copy size={14} />}
              {t('media.qrTest')}
            </button>
            <button
              className="btn btn-primary"
              type="button"
              disabled={!result.ok}
              onClick={() => {
                onInsert(payload, input.variant)
                setInput(EMPTY)
                onClose()
              }}
            >
              <QrCode size={14} />
              {t('media.addElement')}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
