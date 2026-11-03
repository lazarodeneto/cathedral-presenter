import { useEffect, useRef, useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import type { Service, ServiceStatus, TransitionType } from '../../types'
import { useLocale, useT } from '../../i18n/useT'
import { useAppStore } from '../../store/useAppStore'
import { useToasts } from '../../store/useToasts'
import { navigate } from '../../hooks/useHashRoute'
import {
  DEFAULT_TRANSITION,
  durationMinutes,
  formFromService,
  isValidDate,
  localTimeZone,
  localToday,
  MAX_DESCRIPTION,
  MAX_GUESTS,
  MAX_LEADER,
  MAX_NOTES,
  MAX_PASTOR,
  MAX_TITLE,
  MAX_WORSHIP,
  SERVICE_TYPE_KEYS,
  SERVICE_TYPES,
  TRANSITION_TYPES,
  validateCulto,
  type CultoError,
  type CultoField,
  type CultoForm,
} from '../../utils/culto'
import { formatServiceTitleDate, nextSundayISO } from '../../utils/dates'
import { ConfirmDialog, Modal } from '../Modal'


function emptyForm(date?: string, locale = 'en'): CultoForm {
  const d = date || nextSundayISO(new Date()) || localToday()
  return {
    title: isValidDate(d) ? formatServiceTitleDate(d, locale as Parameters<typeof formatServiceTitleDate>[1]) : '',
    date: d,
    time: '10:00',
    endTime: '11:30',
    eventType: 'Sunday Service',
    status: 'scheduled',
    leader: '',
    pastor: '',
    worship: '',
    guests: '',
    description: '',
    notes: '',
    transition: DEFAULT_TRANSITION,
  }
}

/**
 * Create or edit a culto's details. Validates every field, blocks double
 * submission, asks before discarding edits, and refuses to overwrite changes
 * made elsewhere since the form opened.
 */
export function CultoFormDialog({
  open,
  onClose,
  service,
  defaultDate,
  openAfterCreate = true,
}: {
  open: boolean
  onClose: () => void
  /** Present → edit this service; absent → create a new one. */
  service?: Service | null
  defaultDate?: string
  openAfterCreate?: boolean
}) {
  const t = useT()
  const locale = useLocale()
  const createCulto = useAppStore((state) => state.createCulto)
  const updateCultoDetails = useAppStore((state) => state.updateCultoDetails)
  const latest = useAppStore((state) => (service ? state.services.find((entry) => entry.id === service.id) : undefined))
  const push = useToasts((state) => state.push)
  const editing = Boolean(service)
  const [form, setForm] = useState<CultoForm>(() => (service ? formFromService(service) : emptyForm(defaultDate, locale)))
  const [initial, setInitial] = useState<CultoForm>(form)
  const [version, setVersion] = useState(service?.version ?? 0)
  const [touched, setTouched] = useState<Partial<Record<CultoField, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [conflict, setConflict] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const submitting = useRef(false)
  /** True if the user has explicitly typed in the title field; prevents date-driven auto-fill from overwriting manual input. */
  const titleManuallyEdited = useRef(editing)
  const serviceRef = useRef(service)
  serviceRef.current = service

  useEffect(() => {
    if (!open) return
    const target = serviceRef.current
    const start = target ? formFromService(target) : emptyForm(defaultDate, locale)
    setForm(start)
    setInitial(start)
    setVersion(target?.version ?? 0)
    setTouched({})
    setSubmitted(false)
    setConflict(false)
    submitting.current = false
    titleManuallyEdited.current = Boolean(target)
    // Reset only when the dialog opens or targets another service, not on every store change.
  }, [open, service?.id, defaultDate, locale])

  if (!open) return null

  const errors = validateCulto(form)
  const dirty = JSON.stringify(form) !== JSON.stringify(initial)
  const show = (field: CultoField) => (submitted || touched[field]) && errors[field]
  const maxForField: Partial<Record<CultoField, number>> = {
    title: MAX_TITLE, leader: MAX_LEADER, pastor: MAX_PASTOR, worship: MAX_WORSHIP,
    guests: MAX_GUESTS, description: MAX_DESCRIPTION, notes: MAX_NOTES,
  }
  const message = (field: CultoField, error: CultoError) =>
    t(`culto.error.${error}`, { max: maxForField[field] ?? MAX_NOTES })
  const set = <K extends keyof CultoForm>(key: K, value: CultoForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
    setTouched((current) => ({ ...current, [key]: true }))
  }

  const handleDateChange = (newDate: string) => {
    if (!titleManuallyEdited.current && isValidDate(newDate)) {
      setForm((current) => ({
        ...current,
        date: newDate,
        title: formatServiceTitleDate(newDate, locale),
      }))
      setTouched((current) => ({ ...current, date: true }))
    } else {
      set('date', newDate)
    }
  }

  const handleTitleChange = (value: string) => {
    titleManuallyEdited.current = true
    set('title', value)
  }

  const requestClose = () => {
    if (dirty && !submitting.current) setConfirmDiscard(true)
    else onClose()
  }

  const save = (status?: ServiceStatus) => {
    if (submitting.current) return
    setSubmitted(true)
    const final = status ? { ...form, status } : form
    if (Object.keys(validateCulto(final)).length) {
      push(t('culto.fixErrors'), 'error')
      return
    }
    submitting.current = true
    const result = editing ? updateCultoDetails(service!.id, final, version) : createCulto(final)
    if (!result.ok) {
      submitting.current = false
      if (result.reason === 'conflict') setConflict(true)
      push(t(`culto.saveError.${result.reason}`), 'error')
      return
    }
    push(t(editing ? 'culto.updated' : final.status === 'draft' ? 'culto.createdDraft' : 'culto.created', { title: final.title.trim() }), 'success')
    onClose()
    if (!editing && openAfterCreate) navigate(`/service/${result.id}`)
  }

  const duration = durationMinutes({ time: form.time, endTime: form.endTime || undefined })
  const fieldProps = (field: CultoField) => ({
    'aria-invalid': Boolean(show(field)),
    'aria-describedby': show(field) ? `culto-${field}-error` : undefined,
    onBlur: () => setTouched((current) => ({ ...current, [field]: true })),
  })
  const errorLine = (field: CultoField) =>
    show(field) ? (
      <small id={`culto-${field}-error`} className="field-error" role="alert">
        {message(field, errors[field]!)}
      </small>
    ) : null

  return (
    <>
      <Modal
        title={editing ? t('culto.editTitle') : t('culto.newTitle')}
        subtitle={editing ? service!.title : t('culto.newCopy')}
        onClose={requestClose}
        wide
        className="culto-dialog"
      >
        <form
          className="form-stack culto-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            save()
          }}
        >
          {conflict && (
            <div className="inline-warning culto-conflict" role="alert">
              <TriangleAlert size={15} />
              <span>{t('culto.conflict')}</span>
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  if (!latest) return
                  const fresh = formFromService(latest)
                  setForm(fresh)
                  setInitial(fresh)
                  setVersion(latest.version)
                  setConflict(false)
                }}
              >
                {t('culto.reloadLatest')}
              </button>
            </div>
          )}
          <div className="culto-when">
            <label className="field">
              <span>
                {t('common.date')} <small className="field-required">{t('branding.required')}</small>
              </span>
              <input lang="en-GB" type="date" value={form.date} onChange={(event) => handleDateChange(event.target.value)} {...fieldProps('date')} />
              {errorLine('date')}
            </label>
            <label className="field">
              <span>
                {t('culto.start')} <small className="field-required">{t('branding.required')}</small>
              </span>
              <input type="time" value={form.time} onChange={(event) => set('time', event.target.value)} {...fieldProps('time')} />
              {errorLine('time')}
            </label>
            <label className="field">
              <span>{t('culto.end')}</span>
              <input type="time" value={form.endTime} onChange={(event) => set('endTime', event.target.value)} {...fieldProps('endTime')} />
              {errorLine('endTime')}
            </label>
          </div>
          <p className="field-hint">
            {t('culto.timezone', { zone: localTimeZone() })}
            {duration && duration > 0 ? ` · ${t('culto.duration', { minutes: duration })}` : ''}
          </p>
          <label className="field">
            <span>
              {t('home.serviceName')} <small className="field-required">{t('branding.required')}</small>
            </span>
            <input
              value={form.title}
              maxLength={MAX_TITLE + 20}
              placeholder={t('calendar.defaultTitle')}
              autoFocus
              onChange={(event) => handleTitleChange(event.target.value)}
              {...fieldProps('title')}
            />
            {errorLine('title')}
          </label>
          <div className="field-row">
            <label className="field">
              <span>{t('event.type')}</span>
              <select value={form.eventType} onChange={(event) => set('eventType', event.target.value)}>
                {SERVICE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(SERVICE_TYPE_KEYS[type])}
                  </option>
                ))}
                {form.eventType && !SERVICE_TYPES.includes(form.eventType as (typeof SERVICE_TYPES)[number]) && (
                  <option value={form.eventType}>{form.eventType}</option>
                )}
              </select>
            </label>
            <label className="field">
              <span>{t('culto.status')}</span>
              {form.status === 'archived' || form.status === 'active' ? (
                <input value={t(`culto.statusName.${form.status}`)} readOnly aria-describedby="culto-status-note" />
              ) : (
                <select value={form.status} onChange={(event) => set('status', event.target.value as ServiceStatus)}>
                  <option value="draft">{t('culto.statusName.draft')}</option>
                  <option value="scheduled">{t('culto.statusName.scheduled')}</option>
                  {editing && <option value="completed">{t('culto.statusName.completed')}</option>}
                </select>
              )}
              {(form.status === 'archived' || form.status === 'active') && (
                <small id="culto-status-note" className="field-hint">
                  {t(`culto.statusNote.${form.status}`)}
                </small>
              )}
            </label>
          </div>
          <label className="field">
            <span>{t('culto.leader')}</span>
            <input
              value={form.leader}
              maxLength={MAX_LEADER + 20}
              placeholder={t('culto.leaderPlaceholder')}
              onChange={(event) => set('leader', event.target.value)}
              {...fieldProps('leader')}
            />
            {errorLine('leader')}
          </label>
          <label className="field">
            <span>{t('culto.pastor')}</span>
            <input
              value={form.pastor}
              maxLength={MAX_PASTOR + 20}
              placeholder={t('culto.pastorPlaceholder')}
              onChange={(event) => set('pastor', event.target.value)}
              {...fieldProps('pastor')}
            />
            {errorLine('pastor')}
          </label>
          <label className="field">
            <span>{t('culto.worship')}</span>
            <input
              value={form.worship}
              maxLength={MAX_WORSHIP + 20}
              placeholder={t('culto.worshipPlaceholder')}
              onChange={(event) => set('worship', event.target.value)}
              {...fieldProps('worship')}
            />
            {errorLine('worship')}
          </label>
          <label className="field">
            <span>{t('culto.guests')}</span>
            <input
              value={form.guests}
              maxLength={MAX_GUESTS + 20}
              placeholder={t('culto.guestsPlaceholder')}
              onChange={(event) => set('guests', event.target.value)}
              {...fieldProps('guests')}
            />
            {errorLine('guests')}
          </label>
          <label className="field">
            <span>{t('culto.description')}</span>
            <textarea rows={2} value={form.description} onChange={(event) => set('description', event.target.value)} {...fieldProps('description')} />
            {errorLine('description')}
          </label>
          <label className="field">
            <span>{t('culto.notes')}</span>
            <textarea rows={3} value={form.notes} placeholder={t('culto.notesPlaceholder')} onChange={(event) => set('notes', event.target.value)} {...fieldProps('notes')} />
            {errorLine('notes')}
          </label>
          <div className="field-row">
            <label className="field">
              <span>{t('culto.transition')}</span>
              <select
                value={form.transition.type}
                onChange={(event) => set('transition', { ...form.transition, type: event.target.value as TransitionType })}
              >
                {TRANSITION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`culto.transitionName.${type}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t('culto.transitionDuration')}</span>
              <select
                value={form.transition.durationMs}
                disabled={form.transition.type === 'cut'}
                onChange={(event) => set('transition', { ...form.transition, durationMs: Number(event.target.value) })}
              >
                {[200, 400, 600, 900, 1200, 2000].map((ms) => (
                  <option key={ms} value={ms}>
                    {(ms / 1000).toFixed(1)} s
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={requestClose}>
              {t('common.cancel')}
            </button>
            {!editing && (
              <button type="button" className="btn btn-secondary" onClick={() => save('draft')}>
                {t('culto.saveDraft')}
              </button>
            )}
            <button className="btn btn-primary" type="submit">
              {editing ? t('common.save') : t('culto.create')}
            </button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={confirmDiscard}
        title={t('culto.discardTitle')}
        copy={t('culto.discardCopy')}
        confirmLabel={t('branding.discardChanges')}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={() => onClose()}
      />
    </>
  )
}
