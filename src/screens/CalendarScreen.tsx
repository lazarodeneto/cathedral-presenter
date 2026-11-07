import { useMemo, useRef, useState } from 'react'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Plus,
  Search,
  Users,
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useToasts } from '../store/useToasts'
import { useT } from '../i18n/useT'
import { navigate } from '../hooks/useHashRoute'
import {
  addMonths,
  formatLongDate,
  formatMonthName,
  formatMonthYear,
  formatTime,
  formatWeekdayShort,
  isDateOnWeekday,
  isoDate,
  startOfMonthGrid,
  formatNumericDate,
} from '../utils/dates'
import { flatSlides } from '../store/serviceUtils'
import { CultoFormDialog } from '../components/culto/CultoFormDialog'
import { SCREEN_META, ScreenIcon } from '../components/ScreenIcon'

export function CalendarScreen() {
  const t = useT()
  const locale = useAppStore((state) => state.settings.locale)
  const services = useAppStore((state) => state.services)
  const settings = useAppStore((state) => state.settings)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const selectService = useAppStore((state) => state.selectService)
  const duplicateService = useAppStore((state) => state.duplicateService)
  const push = useToasts((state) => state.push)
  const [viewDate, setViewDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12))
  const [mode, setMode] = useState<'month' | 'list'>('month')
  const [query, setQuery] = useState('')
  const [selectedDate, setSelectedDate] = useState(isoDate(new Date()))
  const dayPanelRef = useRef<HTMLElement>(null)

  // Stacked layout (day panel under the grid): bring the chosen day's panel into view.
  const pickDate = (iso: string) => {
    setSelectedDate(iso)
    const panel = dayPanelRef.current
    if (!panel || !window.matchMedia('(max-width: 820px)').matches) return
    requestAnimationFrame(() => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      panel.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    })
  }
  const [createOpen, setCreateOpen] = useState(false)
  const [createDate, setCreateDate] = useState(isoDate(new Date()))
  const today = isoDate(new Date())

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return services
    return services.filter((service) =>
      `${service.title} ${service.eventType ?? ''} ${service.date} ${formatNumericDate(service.date)}`.toLowerCase().includes(needle),
    )
  }, [query, services])

  const byDate = useMemo(() => {
    const map = new Map<string, typeof services>()
    for (const service of filtered) {
      const entries = map.get(service.date) ?? []
      entries.push(service)
      map.set(service.date, entries)
    }
    for (const entries of map.values()) {
      entries.sort((a, b) => a.time.localeCompare(b.time))
    }
    return map
  }, [filtered])

  const monthStart = startOfMonthGrid(viewDate)
  const previousMonth = addMonths(viewDate, -1)
  const nextMonth = addMonths(viewDate, 1)
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(monthStart)
    date.setDate(monthStart.getDate() + index)
    return date
  })
  const selectedServices = byDate.get(selectedDate) ?? []
  const weekdays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(2026, 9, 4 + index, 12)
    return formatWeekdayShort(date, locale)
  })
  const listServices = [...filtered].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
  const highlightWeekday = settings.highlightWeekday ?? null

  const open = (id: string) => {
    selectService(id)
    navigate(`/service/${id}`)
  }

  const duplicate = (id: string) => {
    const copy = duplicateService(id)
    if (copy) {
      push(t('toast.serviceDuplicated'), 'success')
      open(copy)
    }
  }

  const createOn = (date: string) => {
    setCreateDate(date)
    setCreateOpen(true)
  }

  return (
    <div className="screen calendar-screen" data-tone={SCREEN_META.calendar.tone}>
      <div className="screen-heading">
        <div>
          <ScreenIcon screen="calendar" />
          <h1>{t('calendar.title')}</h1>
          <p>{t('calendar.subtitle')}</p>
        </div>
        <div className="heading-actions">
          <button className="btn btn-secondary" onClick={() => createOn(today)}>
            <Plus size={16} />
            {t('calendar.newService')}
          </button>
        </div>
      </div>

      <div className="calendar-toolbar panel">
        <div className="calendar-nav">
          <button
            className="icon-btn calendar-month-nav"
            onClick={() => setViewDate(previousMonth)}
            aria-label={`${t('common.previous')}: ${formatMonthYear(previousMonth, locale)}`}
            title={`${t('common.previous')}: ${formatMonthYear(previousMonth, locale)}`}
          >
            <ChevronLeft size={19} strokeWidth={2.2} />
            <span className="calendar-month-label">{formatMonthName(previousMonth, locale)}</span>
          </button>
          <h2>{formatMonthYear(viewDate, locale)}</h2>
          <button
            className="icon-btn calendar-month-nav"
            onClick={() => setViewDate(nextMonth)}
            aria-label={`${t('common.next')}: ${formatMonthYear(nextMonth, locale)}`}
            title={`${t('common.next')}: ${formatMonthYear(nextMonth, locale)}`}
          >
            <span className="calendar-month-label">{formatMonthName(nextMonth, locale)}</span>
            <ChevronRight size={19} strokeWidth={2.2} />
          </button>
          <button
            className="btn btn-ghost btn-sm calendar-today-nav"
            title={t('common.today')}
            onClick={() => {
              const now = new Date()
              setViewDate(new Date(now.getFullYear(), now.getMonth(), 1, 12))
              setSelectedDate(isoDate(now))
            }}
          >
            <CalendarDays size={15} aria-hidden="true" />
            {t('common.today')}
          </button>
        </div>
        <div className="calendar-tools">
          <label className="search-field search-field-sm">
            <Search size={15} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('calendar.search')}
            />
          </label>
          <div className="segmented">
            <button className={mode === 'month' ? 'is-active' : ''} onClick={() => setMode('month')}>
              {t('calendar.month')}
            </button>
            <button className={mode === 'list' ? 'is-active' : ''} onClick={() => setMode('list')}>
              {t('calendar.list')}
            </button>
          </div>
        </div>
      </div>

      <div className="calendar-layout">
        <div className="calendar-main panel">
          {mode === 'month' ? (
            <>
              <div className="calendar-weekdays">
                {weekdays.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
              <div className="calendar-grid">
                {cells.map((date) => {
                  const iso = isoDate(date)
                  const entries = byDate.get(iso) ?? []
                  const outside = date.getMonth() !== viewDate.getMonth()
                  const isTodayCell = iso === today
                  const isHighlightedWeekday = isDateOnWeekday(iso, highlightWeekday)
                  return (
                    <div
                      key={iso}
                      className={`calendar-cell ${outside ? 'is-outside' : ''} ${
                        selectedDate === iso ? 'is-selected' : ''
                      } ${isTodayCell ? 'is-today' : ''} ${
                        isHighlightedWeekday ? 'is-highlighted-weekday' : ''
                      }`}
                      onClick={() => pickDate(iso)}
                      role="group"
                      aria-label={formatLongDate(iso, locale)}
                    >
                      <button type="button" className="calendar-day-number" aria-label={formatLongDate(iso, locale)} onDoubleClick={() => createOn(iso)}>{date.getDate()}</button>
                      <span className="calendar-events">
                        {entries.slice(0, 2).map((service) => (
                          <button type="button"
                            key={service.id}
                            aria-label={`${service.title} · ${formatTime(service.time, locale)}`}
                            className={`calendar-event event-${(service.eventType || 'service').toLowerCase().replace(/\s+/g, '-')}`}
                            onClick={(event) => {
                              event.stopPropagation()
                              open(service.id)
                            }}
                          >
                            <span className="calendar-event-time">{formatTime(service.time, locale)}</span>
                            <span className="calendar-event-title">{service.title}</span>
                          </button>
                        ))}
                        {entries.length > 2 && (
                          <span className="calendar-more">+{entries.length - 2}</span>
                        )}
                        {entries.length === 0 && (
                          <button type="button"
                            className="calendar-add-service"
                            aria-label={t('calendar.createOnDate', { date: formatLongDate(iso, locale) })}
                            onClick={(event) => {
                              event.stopPropagation()
                              createOn(iso)
                            }}
                          >
                            <Plus size={16} aria-hidden="true" />
                          </button>
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="calendar-list">
              <div className="calendar-list-head">
                <span>{t('common.date')}</span>
                <span>{t('home.serviceName')}</span>
                <span>{t('common.slides')}</span>
                <span />
              </div>
              {listServices.map((service) => (
                <div key={service.id} className="calendar-list-row">
                  <span className="calendar-list-date">
                    <strong>{service.date.slice(8, 10)}</strong>
                    <span>
                      {new Intl.DateTimeFormat(locale, { month: 'short' }).format(
                        new Date(`${service.date}T12:00:00`),
                      )}
                    </span>
                  </span>
                  <button className="calendar-list-title" onClick={() => open(service.id)}>
                    <strong>{service.title}</strong>
                    <span>
                      {formatLongDate(service.date, locale)} · {formatTime(service.time, locale)} ·{' '}
                      {service.eventType}
                    </span>
                  </button>
                  <span className="calendar-list-count">
                    {flatSlides(service).length} {t('common.slides')}
                  </span>
                  <button className="icon-btn" onClick={() => duplicate(service.id)} aria-label={t('common.duplicate')}>
                    <Copy size={15} />
                  </button>
                </div>
              ))}
              {listServices.length === 0 && <div className="list-empty">{t('calendar.noServices')}</div>}
            </div>
          )}
        </div>

        <aside className="calendar-side" ref={dayPanelRef}>
          <section className="panel day-panel">
            <div className="panel-header">
              <div>
                <h3>{formatLongDate(selectedDate, locale)}</h3>
              </div>
              <button className="icon-btn" onClick={() => createOn(selectedDate)} aria-label={t('calendar.newService')}>
                <Plus size={16} />
              </button>
            </div>
            {selectedServices.length ? (
              <div className="day-services">
                {selectedServices.map((service) => (
                  <button key={service.id} className="day-service" onClick={() => open(service.id)}>
                    <span className="day-service-time">{formatTime(service.time, locale)}</span>
                    <span>
                      <strong>{service.title}</strong>
                      <span>
                        {service.eventType} · {flatSlides(service).length} {t('common.slides')}
                      </span>
                    </span>
                    <ChevronRight size={15} />
                  </button>
                ))}
                <button className="btn btn-ghost btn-sm btn-block" onClick={() => createOn(selectedDate)}>
                  <Plus size={14} />
                  {t('calendar.createOnDate', { date: formatLongDate(selectedDate, locale) })}
                </button>
              </div>
            ) : (
              <div className="day-empty">
                <CalendarDays size={28} />
                <p>{t('calendar.noneOnDate')}</p>
                <button className="btn btn-secondary btn-sm" onClick={() => createOn(selectedDate)}>
                  <Plus size={14} />
                  {t('calendar.createOnDate', { date: formatLongDate(selectedDate, locale) })}
                </button>
              </div>
            )}
          </section>

          <section className="panel calendar-preference">
            <div className="panel-header">
              <div>
                <h3>{t('calendar.highlightTitle')}</h3>
                <p>{t('calendar.highlightHint')}</p>
              </div>
            </div>
            <label className="field calendar-weekday-field">
              <span>{t('calendar.highlightLabel')}</span>
              <select
                value={highlightWeekday === null ? '' : String(highlightWeekday)}
                onChange={(event) =>
                  updateSettings({
                    highlightWeekday: event.target.value === '' ? null : Number(event.target.value),
                  })
                }
              >
                <option value="">{t('common.none')}</option>
                {weekdays.map((day, index) => (
                  <option key={day} value={index}>
                    {day}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section className="panel agenda-panel">
            <div className="panel-header">
              <div>
                <h3>{t('home.upcoming')}</h3>
              </div>
            </div>
            <div className="agenda-list">
              {[...filtered]
                .filter((service) => service.date >= today)
                .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
                .slice(0, 5)
                .map((service) => (
                  <button key={service.id} className="agenda-row" onClick={() => open(service.id)}>
                    <span className="agenda-date">
                      <strong>{service.date.slice(8, 10)}</strong>
                      {new Intl.DateTimeFormat(locale, { month: 'short' }).format(
                        new Date(`${service.date}T12:00:00`),
                      )}
                    </span>
                    <span>
                      <strong>{service.title}</strong>
                      <span>
                        <Clock3 size={12} /> {formatTime(service.time, locale)}
                      </span>
                    </span>
                  </button>
                ))}
            </div>
          </section>

          <section className="panel calendar-stat">
            <span className="eyebrow">{t('calendar.month')}</span>
            <div className="calendar-stat-grid">
              <span>
                <strong>{filtered.filter((service) => service.date.startsWith(isoDate(viewDate).slice(0, 7))).length}</strong>
                {t('calendar.serviceCount', { count: '' }).trim()}
              </span>
              <span>
                <strong>
                  {filtered
                    .filter((service) => service.date.startsWith(isoDate(viewDate).slice(0, 7)))
                    .reduce((total, service) => total + flatSlides(service).length, 0)}
                </strong>
                {t('common.slides')}
              </span>
            </div>
            <div className="calendar-stat-footer">
              <Users size={14} />
              {t('home.connectedDisplays')}: {useAppStore.getState().monitors.filter((monitor) => monitor.status === 'ready').length}
            </div>
          </section>
        </aside>
      </div>

      <CultoFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultDate={createDate}
      />
    </div>
  )
}
