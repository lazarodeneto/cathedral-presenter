import { useEffect, useRef, useState } from 'react'
import { useT } from '../i18n/useT'
import { useAppStore } from '../store/useAppStore'
import { useToasts } from '../store/useToasts'
import { navigate } from '../hooks/useHashRoute'
import { formatServiceTitleDate, nextSundayISO, todayISO } from '../utils/dates'
import { Modal } from './Modal'

export function NewServiceDialog({
  open,
  onClose,
  defaultDate,
}: {
  open: boolean
  onClose: () => void
  defaultDate?: string
}) {
  const t = useT()
  const locale = useAppStore((state) => state.settings.locale)
  const createService = useAppStore((state) => state.createService)
  const push = useToasts((state) => state.push)
  const [date, setDate] = useState(defaultDate || nextSundayISO(new Date()) || todayISO())
  const [title, setTitle] = useState(() => formatServiceTitleDate(date, locale))
  const [time, setTime] = useState('10:00')
  const [eventType, setEventType] = useState('Sunday Service')
  const titleManuallyEdited = useRef(false)

  useEffect(() => {
    if (!open) return
    const initialDate = defaultDate || nextSundayISO(new Date()) || todayISO()
    setDate(initialDate)
    setTitle(formatServiceTitleDate(initialDate, locale))
    titleManuallyEdited.current = false
  }, [defaultDate, locale, open])

  if (!open) return null

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const id = createService({
      title: title.trim() || formatServiceTitleDate(date, locale),
      date: date || todayISO(),
      time: time || '10:00',
      eventType,
    })
    push(t('toast.serviceCreated'), 'success')
    onClose()
    navigate(`/service/${id}`)
  }

  return (
    <Modal
      title={t('home.newServiceTitle')}
      subtitle={t('home.newServiceCopy')}
      onClose={onClose}
    >
      <form className="form-stack" onSubmit={submit}>
        <label className="field">
          <span>{t('common.date')}</span>
          <input
            type="date"
            lang="en-GB"
            value={date}
            onChange={(event) => {
              const nextDate = event.target.value
              setDate(nextDate)
              if (!titleManuallyEdited.current && nextDate) {
                setTitle(formatServiceTitleDate(nextDate, locale))
              }
            }}
            autoFocus
          />
        </label>
        <label className="field">
          <span>{t('home.serviceName')}</span>
          <input
            value={title}
            onChange={(event) => {
              titleManuallyEdited.current = true
              setTitle(event.target.value)
            }}
            placeholder={t('calendar.defaultTitle')}
          />
        </label>
        <label className="field">
          <span>{t('common.time')}</span>
          <input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
        </label>
        <label className="field">
          <span>{t('event.type')}</span>
          <select value={eventType} onChange={(event) => setEventType(event.target.value)}>
            <option value="Sunday Service">{t('event.sundayService')}</option>
            <option value="Bible Study">{t('event.bibleStudy')}</option>
            <option value="Youth">{t('event.youth')}</option>
            <option value="Class">{t('event.class')}</option>
            <option value="Special Service">{t('event.specialService')}</option>
            <option value="Prayer Meeting">{t('event.prayerMeeting')}</option>
          </select>
        </label>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn btn-primary" type="submit">
            {t('home.createService')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
