import { useEffect, useRef, useState } from 'react'
import { Copy, Trash2 } from 'lucide-react'
import type { Service } from '../../types'
import { useLocale, useT } from '../../i18n/useT'
import { useAppStore } from '../../store/useAppStore'
import { useToasts } from '../../store/useToasts'
import { navigate } from '../../hooks/useHashRoute'
import { formatLongDate } from '../../utils/dates'
import { isValidDate, isValidTime, MAX_TITLE } from '../../utils/culto'
import { flatSlides } from '../../store/serviceUtils'
import { Modal } from '../Modal'
import { DateField } from '../DateField'

/** Copy a culto with a new title, date and time. The copy is an independent draft. */
export function DuplicateCultoDialog({
  service,
  onClose,
  openAfter = true,
}: {
  service: Service | null
  onClose: () => void
  openAfter?: boolean
}) {
  const t = useT()
  const duplicateService = useAppStore((state) => state.duplicateService)
  const push = useToasts((state) => state.push)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const busy = useRef(false)

  useEffect(() => {
    if (!service) return
    setTitle(`${service.title} — ${t('common.copy')}`)
    setDate(service.date)
    setTime(service.time)
    setSubmitted(false)
    busy.current = false
  }, [service, t])

  if (!service) return null
  const errors = {
    title: !title.trim() ? 'required' : title.trim().length > MAX_TITLE ? 'too-long' : null,
    date: !isValidDate(date) ? 'invalid-date' : null,
    time: !isValidTime(time) ? 'invalid-time' : null,
  }
  const invalid = Object.values(errors).some(Boolean)

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    if (invalid || busy.current) return
    busy.current = true
    const id = duplicateService(service.id, { title, date, time })
    if (!id) {
      busy.current = false
      push(t('culto.saveError.not-found'), 'error')
      return
    }
    push(t('culto.duplicated', { title: title.trim() }), 'success')
    onClose()
    if (openAfter) navigate(`/service/${id}`)
  }

  return (
    <Modal title={t('culto.duplicateTitle')} subtitle={t('culto.duplicateCopy', { title: service.title })} onClose={onClose}>
      <form className="form-stack" onSubmit={submit} noValidate>
        <label className="field">
          <span>{t('home.serviceName')}</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} aria-invalid={submitted && Boolean(errors.title)} autoFocus />
          {submitted && errors.title && (
            <small className="field-error" role="alert">
              {t(`culto.error.${errors.title}`, { max: MAX_TITLE })}
            </small>
          )}
        </label>
        <div className="field-row">
          <label className="field">
            <span>{t('common.date')}</span>
            <DateField value={date} onChange={setDate} aria-invalid={submitted && Boolean(errors.date)} />
            {submitted && errors.date && (
              <small className="field-error" role="alert">
                {t(`culto.error.${errors.date}`)}
              </small>
            )}
          </label>
          <label className="field">
            <span>{t('culto.start')}</span>
            <input type="time" value={time} onChange={(event) => setTime(event.target.value)} aria-invalid={submitted && Boolean(errors.time)} />
            {submitted && errors.time && (
              <small className="field-error" role="alert">
                {t(`culto.error.${errors.time}`)}
              </small>
            )}
          </label>
        </div>
        <p className="field-hint">{t('culto.duplicateNote')}</p>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn btn-primary" type="submit">
            {t('culto.duplicate')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

/**
 * Permanent delete. Names the culto, its date and slide count, and needs the
 * title typed for services that have content, so the wrong one is not removed.
 */
export function DeleteCultoDialog({ service, onClose }: { service: Service | null; onClose: () => void }) {
  const t = useT()
  const locale = useLocale()
  const deleteService = useAppStore((state) => state.deleteService)
  const archiveService = useAppStore((state) => state.archiveService)
  const live = useAppStore((state) => state.live)
  const push = useToasts((state) => state.push)
  const [typed, setTyped] = useState('')
  useEffect(() => setTyped(''), [service?.id])
  if (!service) return null
  const slides = flatSlides(service).length
  const isLive = live?.serviceId === service.id
  const needsTyping = slides > 1
  const matches = typed.trim() === service.title.trim()
  const copyConfirmationText = async () => {
    try {
      await navigator.clipboard.writeText(service.title)
      push(t('toast.copied'), 'success')
    } catch {
      push('Não foi possível copiar o texto', 'error')
    }
  }

  return (
    <Modal title={t('culto.deleteTitle')} onClose={onClose} className="culto-delete">
      <div className="form-stack">
        <div className="culto-delete-target">
          <strong>{service.title}</strong>
          <span>
            {formatLongDate(service.date, locale)} · {service.time} · {t('culto.slideCount', { count: slides })}
          </span>
        </div>
        <p className="modal-copy">{t('culto.deleteCopy')}</p>
        {isLive && (
          <p className="inline-warning" role="alert">
            {t('culto.saveError.live')}
          </p>
        )}
        {needsTyping && !isLive && (
          <label className="field">
            <span className="confirm-copy-label">
              <span>{t('culto.typeToConfirm', { title: service.title })}</span>
              <button
                type="button"
                className="icon-btn icon-btn-xs"
                onClick={() => void copyConfirmationText()}
                aria-label={t('culto.copyConfirmText')}
                title={t('culto.copyConfirmText')}
              >
                <Copy size={14} />
              </button>
            </span>
            <input value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" spellCheck={false} />
          </label>
        )}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
          {service.status !== 'archived' && !isLive && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                if (archiveService(service.id)) push(t('culto.archived', { title: service.title }), 'success')
                else push(t('culto.saveError.not-found'), 'error')
                onClose()
              }}
            >
              {t('culto.archiveInstead')}
            </button>
          )}
          <button
            type="button"
            className="btn btn-danger"
            disabled={isLive || (needsTyping && !matches)}
            onClick={() => {
              if (deleteService(service.id)) {
                push(t('culto.deleted', { title: service.title }), 'success')
                onClose()
                if (window.location.hash.startsWith(`#/service/${service.id}`)) navigate('/services')
              } else {
                push(t('culto.deleteFailed'), 'error')
              }
            }}
          >
            <Trash2 size={14} />
            {t('culto.deleteConfirm')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
