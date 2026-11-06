import { PresentationImport } from '../components/PresentationImport'
import { useMemo, useState } from 'react'
import { Archive, ArchiveRestore, CalendarDays, Copy, Pencil, Play, Plus, Search, SlidersHorizontal, Trash2, X } from 'lucide-react'
import type { Service } from '../types'
import { useLocale, useT } from '../i18n/useT'
import { useAppStore } from '../store/useAppStore'
import { useToasts } from '../store/useToasts'
import { navigate } from '../hooks/useHashRoute'
import { formatNumericDateTime, formatToolbarDate } from '../utils/dates'
import { flatSlides } from '../store/serviceUtils'
import {
  DEFAULT_QUERY,
  presentationProblem,
  queryServices,
  SERVICE_TYPE_KEYS,
  SERVICE_TYPES,
  viewCounts,
  type ServiceQuery,
  type ServiceSort,
  type ServiceView,
} from '../utils/culto'
import { CultoFormDialog } from '../components/culto/CultoFormDialog'
import { DeleteCultoDialog, DuplicateCultoDialog } from '../components/culto/CultoDialogs'
import { StatusChip } from '../components/culto/StatusChip'
import { DateField } from '../components/DateField'
import { SortSelect } from '../components/SortSelect'
import { SCREEN_META, ScreenIcon } from '../components/ScreenIcon'

const VIEWS: ServiceView[] = ['upcoming', 'past', 'draft', 'scheduled', 'active', 'archived', 'all']
const SORTS: ServiceSort[] = ['date-asc', 'date-desc', 'title', 'status', 'updated']

/** Cultos: every service of this church, with views, search, filters and the full set of actions. */
export function ServicesScreen() {
  const t = useT()
  const locale = useLocale()
  const services = useAppStore((state) => state.services)
  const archiveService = useAppStore((state) => state.archiveService)
  const restoreService = useAppStore((state) => state.restoreService)
  const push = useToasts((state) => state.push)
  const [query, setQuery] = useState<ServiceQuery>(DEFAULT_QUERY)
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [duplicating, setDuplicating] = useState<Service | null>(null)
  const [deleting, setDeleting] = useState<Service | null>(null)

  const results = useMemo(() => queryServices(services, query), [services, query])
  const counts = useMemo(() => viewCounts(services), [services])
  const leaders = useMemo(() => [...new Set(services.map((service) => service.leader).filter(Boolean) as string[])].sort(), [services])
  const filtersActive =
    query.search || query.status || query.type || query.leader || query.from || query.to
  const activeFilterCount = [query.search, query.status, query.type, query.leader, query.from, query.to].filter(Boolean).length
  const update = (patch: Partial<ServiceQuery>) => setQuery((current) => ({ ...current, ...patch }))
  const updatedLabel = (iso: string) => {
    const date = new Date(iso)
    return Number.isNaN(date.getTime()) ? '—' : formatNumericDateTime(date)
  }

  return (
    <div className="screen services-screen" data-tone={SCREEN_META.services.tone}>
      <header className="screen-heading">
        <div>
          <ScreenIcon screen="services" />
          <h1>{t('culto.screenTitle')}</h1>
          <p>{t('culto.screenCopy')}</p>
        </div>
        <div className="heading-actions">
          <PresentationImport />
          <button className="btn btn-secondary" onClick={() => navigate('/calendar')}>
            <CalendarDays size={15} />
            {t('nav.calendar')}
          </button>
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus size={15} />
            {t('culto.newTitle')}
          </button>
        </div>
      </header>

      <div className="services-views" role="tablist" aria-label={t('culto.views')}>
        {VIEWS.map((view) => (
          <button
            key={view}
            role="tab"
            aria-selected={query.view === view}
            className={`services-view ${query.view === view ? 'is-active' : ''}`}
            onClick={() => update({ view })}
          >
            {t(`culto.view.${view}`)}
            <span className="services-view-count">{counts[view]}</span>
          </button>
        ))}
      </div>

      <section className="services-filters panel" aria-label={t('culto.filters')}>
        <div className="services-filter-primary">
          <div className="services-search-group">
            <span className="services-field-label">{t('common.search')}</span>
            <label className="search-field services-search">
              <Search size={15} />
              <input
                type="search"
                value={query.search}
                onChange={(event) => update({ search: event.target.value })}
                placeholder={t('culto.searchPlaceholder')}
                aria-label={t('culto.searchPlaceholder')}
              />
            </label>
          </div>
          <SortSelect value={query.status} label={t('culto.status')} onChange={(status) => update({ status: status as ServiceQuery['status'] })}
            options={[{ value: '', label: t('culto.any') }, ...(['draft', 'scheduled', 'active', 'completed', 'archived'] as const).map((status) => ({ value: status, label: t(`culto.statusName.${status}`) }))]} />
          <SortSelect value={query.type} label={t('event.type')} onChange={(type) => update({ type })}
            options={[{ value: '', label: t('culto.any') }, ...SERVICE_TYPES.map((type) => ({ value: type, label: t(SERVICE_TYPE_KEYS[type]) }))]} />
          <SortSelect value={query.leader} label={t('culto.leader')} onChange={(leader) => update({ leader })}
            options={[{ value: '', label: t('culto.any') }, ...leaders.map((leader) => ({ value: leader, label: leader }))]} />
        </div>
        <div className="services-filter-secondary">
          <fieldset className="services-date-range" aria-label={t('common.date')}>
            <label className="field compact">
              <span>{t('culto.from')}</span>
              <DateField value={query.from} onChange={(from) => update({ from })} />
            </label>
            <label className="field compact">
              <span>{t('culto.to')}</span>
              <DateField value={query.to} onChange={(to) => update({ to })} />
            </label>
          </fieldset>
          <div className="services-sort">
            <SortSelect value={query.sort} label={t('culto.sort')}
              options={SORTS.map((sort) => ({ value: sort, label: t(`culto.sortName.${sort}`) }))}
              onChange={(sort) => update({ sort })} />
          </div>
          {filtersActive && (
            <button
              className="services-clear"
              onClick={() => setQuery({ ...DEFAULT_QUERY, view: query.view, sort: query.sort })}
              aria-label={`${t('songs.clearFilters')}: ${activeFilterCount}`}
            >
              <X size={14} />
              {t('songs.clearFilters')}
              <span>{activeFilterCount}</span>
            </button>
          )}
          {!filtersActive && <SlidersHorizontal className="services-filter-icon" size={16} aria-hidden="true" />}
        </div>
      </section>

      <p className="sr-only" aria-live="polite">
        {t('culto.resultCount', { count: results.length })}
      </p>

      {results.length === 0 ? (
        <div className="services-empty panel">
          <CalendarDays size={28} />
          <h2>{services.length === 0 ? t('culto.emptyTitle') : t('culto.noMatchTitle')}</h2>
          <p>{services.length === 0 ? t('culto.emptyCopy') : t('culto.noMatchCopy')}</p>
          {services.length === 0 ? (
            <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
              <Plus size={15} />
              {t('culto.newTitle')}
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={() => setQuery({ ...DEFAULT_QUERY, view: 'all' })}>
              {t('culto.showAll')}
            </button>
          )}
        </div>
      ) : (
        <ul className="services-list" aria-label={t(`culto.view.${query.view}`)}>
          {results.map((service) => {
            const slideCount = flatSlides(service).length
            const problem = presentationProblem(service)
            return (
              <li key={service.id} className={`service-card panel is-${service.status}`}>
                <button className="service-card-main" onClick={() => navigate(`/service/${service.id}`)}>
                  <span className="service-card-date">
                    <strong>{service.date.slice(8, 10)}</strong>
                    <span>{new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(`${service.date}T12:00:00`))}</span>
                  </span>
                  <span className="service-card-copy">
                    <strong>{service.title}</strong>
                    <span>
                      {formatToolbarDate(service.date, locale)} · {service.time}
                      {service.endTime ? `–${service.endTime}` : ''}
                      {service.eventType ? ` · ${service.eventType}` : ''}
                      {service.leader ? ` · ${service.leader}` : ''}
                      {service.pastor ? ` · ${service.pastor}` : ''}
                      {service.worship ? ` · ${service.worship}` : ''}
                      {service.guests ? ` · ${service.guests}` : ''}
                    </span>
                    <span className="service-card-meta">
                      {t('culto.slideCount', { count: slideCount })} · {t('culto.updatedAt', { when: updatedLabel(service.updatedAt) })}
                    </span>
                  </span>
                  <StatusChip status={service.status} />
                </button>
                <div className="service-card-actions" role="group" aria-label={t('culto.actionsFor', { title: service.title })}>
                  <button
                    className="btn btn-ghost btn-sm service-card-present"
                    onClick={() => navigate(`/service/${service.id}/present`)}
                    disabled={Boolean(problem)}
                    title={problem ? t(`culto.problem.${problem}`) : `${t('editor.present')}: ${service.title}`}
                    aria-label={`${t('editor.present')}: ${service.title}`}
                  >
                    <Play size={14} />
                    {t('editor.present')}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditing(service)} aria-label={`${t('culto.editDetails')}: ${service.title}`} title={`${t('culto.editDetails')}: ${service.title}`}>
                    <Pencil size={14} />
                    {t('culto.editDetails')}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setDuplicating(service)} aria-label={`${t('culto.duplicate')}: ${service.title}`} title={`${t('culto.duplicate')}: ${service.title}`}>
                    <Copy size={14} />
                    {t('culto.duplicate')}
                  </button>
                  {service.status === 'archived' ? (
                    <button
                      className="btn btn-ghost btn-sm"
                      aria-label={`${t('culto.restore')}: ${service.title}`}
                      title={`${t('culto.restore')}: ${service.title}`}
                      onClick={() => {
                        const ok = restoreService(service.id)
                        push(ok ? t('culto.restored', { title: service.title }) : t('culto.saveError.not-found'), ok ? 'success' : 'error')
                      }}
                    >
                      <ArchiveRestore size={14} />
                      {t('culto.restore')}
                    </button>
                  ) : (
                    <button
                      className="btn btn-ghost btn-sm"
                      disabled={service.status === 'active'}
                      aria-label={`${t('culto.archive')}: ${service.title}`}
                      title={`${t('culto.archive')}: ${service.title}`}
                      onClick={() => {
                        if (archiveService(service.id)) push(t('culto.archived', { title: service.title }), 'success')
                        else push(t('culto.saveError.live'), 'error')
                      }}
                    >
                      <Archive size={14} />
                      {t('culto.archive')}
                    </button>
                  )}
                  <button
                    className="btn btn-ghost btn-sm danger-text"
                    aria-label={`${t('common.delete')}: ${service.title}`}
                    title={`${t('common.delete')}: ${service.title}`}
                    onClick={() => setDeleting(service)}
                  >
                    <Trash2 size={14} />
                    {t('common.delete')}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <CultoFormDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <CultoFormDialog open={Boolean(editing)} service={editing} onClose={() => setEditing(null)} />
      <DuplicateCultoDialog service={duplicating} onClose={() => setDuplicating(null)} />
      <DeleteCultoDialog service={deleting} onClose={() => setDeleting(null)} />
    </div>
  )
}
