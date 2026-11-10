import { onWorkspaceStatus, workspaceStatus } from '../store/sharedWorkspace'
import { isCloud } from '../runtime'
import { AccountMenu } from './AccountMenu'
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { CalendarDays, Check, Clock3, Search, TriangleAlert, X } from 'lucide-react'
import { useT } from '../i18n/useT'
import { useAppStore } from '../store/useAppStore'
import { navigate, type Route } from '../hooks/useHashRoute'
import { useDialogFocus } from '../hooks/useDialogFocus'
import { useShortcutHandlers } from '../shortcuts/registry'
import { useShortcutLabel } from '../shortcuts/useShortcutLabel'
import { formatClock, formatLongDate, intlLocale } from '../utils/dates'
import { LanguageMenu } from './LanguageMenu'
import { SCREEN_META, type ScreenName } from './ScreenIcon'

const DESTINATIONS = [
  { path: '/home', key: 'nav.home', icon: 'house' },
  { path: '/services', key: 'nav.services', icon: 'calendar' },
  { path: '/calendar', key: 'nav.calendar', icon: 'calendar' },
  { path: '/bible', key: 'nav.bible', icon: 'book' },
  { path: '/biblemode', key: 'nav.biblemode', icon: 'book' },
  { path: '/songs', key: 'nav.songs', icon: 'music' },
  { path: '/media', key: 'nav.media', icon: 'image' },
  { path: '/templates', key: 'nav.templates', icon: 'template' },
  { path: '/settings', key: 'nav.settings', icon: 'settings' },
]

function formatLiveDate(date: Date, locale: Parameters<typeof intlLocale>[0]): string {
  const parts = new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  const weekday = value('weekday').replace(/-feira$/, '').replace(/\.$/, '')
  const month = value('month').replace(/\.$/, '')
  const dateLabel = `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${value('day')} ${month} ${value('year')}`
  return dateLabel
}

function formatLiveTime(date: Date) {
  return {
    hours: String(date.getHours()).padStart(2, '0'),
    minutes: String(date.getMinutes()).padStart(2, '0'),
    seconds: String(date.getSeconds()).padStart(2, '0'),
  }
}

/** A destination's section icon in its tone, as in the sidebar. */
function CommandIcon({ path }: { path: string }) {
  const meta = SCREEN_META[path.slice(1) as ScreenName]
  if (!meta) return <span className="command-icon" />
  const Icon = meta.icon
  return (
    <span className="command-icon tone-chip" data-tone={meta.tone} aria-hidden="true">
      <Icon size={14} />
    </span>
  )
}

function CommandPalette({ onClose }: { onClose: () => void }) {
  const t = useT()
  const locale = useAppStore((state) => state.settings.locale)
  const services = useAppStore((state) => state.services)
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const destinations = DESTINATIONS.filter((entry) => t(entry.key).toLowerCase().includes(needle))
    const matchedServices = services
      .filter((service) =>
        `${service.title} ${formatLongDate(service.date, locale)}`.toLowerCase().includes(needle),
      )
      .slice(0, 5)
    return { destinations, matchedServices }
  }, [query, services, t, locale])

  const dialog = useDialogFocus<HTMLDivElement>(onClose)

  const open = (path: string) => {
    navigate(path)
    onClose()
  }

  return (
    <div className="modal-backdrop command-backdrop" onMouseDown={onClose}>
      <div
        ref={dialog.ref}
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label={t('common.search')}
        tabIndex={-1}
        onKeyDown={dialog.onKeyDown}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="command-input">
          <Search size={18} />
          <input
            autoFocus
            aria-label={t('common.search')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('common.search')}
          />
          <button className="icon-btn" onClick={onClose} aria-label={t('common.close')}>
            <X size={16} />
          </button>
        </div>
        <div className="command-results">
          <span className="eyebrow">{t('common.settings')}</span>
          {filtered.destinations.map((entry) => (
            <button key={entry.path} className="command-row" onClick={() => open(entry.path)}>
              <CommandIcon path={entry.path} />
              <span>{t(entry.key)}</span>
              <span className="command-hint">↵</span>
            </button>
          ))}
          {filtered.matchedServices.length > 0 && (
            <>
              <span className="eyebrow command-section">{t('home.upcoming')}</span>
              {filtered.matchedServices.map((service) => (
                <button
                  key={service.id}
                  className="command-row"
                  onClick={() => open(`/service/${service.id}`)}
                >
                  <span className="command-icon">
                    <CalendarDays size={15} />
                  </span>
                  <span>{service.title}</span>
                  <span className="command-hint">{formatLongDate(service.date, locale)}</span>
                </button>
              ))}
            </>
          )}
          {filtered.destinations.length === 0 && filtered.matchedServices.length === 0 && (
            <div className="command-empty">{t('common.none')}</div>
          )}
        </div>
      </div>
    </div>
  )
}

export function TopBar({ route }: { route: Route }) {
  const t = useT()
  const locale = useAppStore((state) => state.settings.locale)
  const setLocale = useAppStore((state) => state.setLocale)
  const live = useAppStore((state) => state.live)
  const sharedStatus = useSyncExternalStore(onWorkspaceStatus, workspaceStatus)
  const lastSavedAt = useAppStore((state) => state.lastSavedAt)
  const clearAudienceMessage = useAppStore((state) => state.clearAudienceMessage)
  const [clock, setClock] = useState(() => new Date())
  const [commandOpen, setCommandOpen] = useState(false)

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useShortcutHandlers('global', { 'app.search': () => setCommandOpen(true) })
  const searchKey = useShortcutLabel('app.search')

  const dateLabel = formatLiveDate(clock, locale)
  const timeLabel = formatLiveTime(clock)

  // The screen's own icon and tone (a service uses the Services tone) colour the bar.
  const screen = (route.name === 'service' ? 'services' : route.name) as ScreenName
  const meta = SCREEN_META[screen] ?? SCREEN_META.home

  return (
    <>
      <header className="topbar" data-tone={meta.tone}>
        <div className="topbar-breadcrumb">
          <span className="topbar-live-datetime">
            <span><CalendarDays size={14} aria-hidden="true" />{dateLabel}</span>
            <span aria-hidden="true"> - </span>
            <span>
              <Clock3 size={14} aria-hidden="true" />
              {timeLabel.hours}h {timeLabel.minutes}m {timeLabel.seconds}s
            </span>
          </span>
          {live && (
            <button className="live-chip" onClick={() => navigate(`/service/${live.serviceId}`)}>
              <span className="live-dot" />
              {t('status.live')}
            </button>
          )}
          {live?.messageVisible && live.message && (
            <button
              type="button"
              className="topbar-alert-chip"
              onClick={() => clearAudienceMessage()}
              title={`${live.message} — ${t('live.hideAlert')}`}
              aria-label={`${t('live.alertOnScreen')}: ${live.message}. ${t('live.hideAlert')}`}
            >
              <TriangleAlert size={14} strokeWidth={2.6} aria-hidden="true" />
              <span>{t('live.alertOnScreen')}</span>
              <X size={13} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="topbar-center">
          <button
            className="command-trigger"
            onClick={() => setCommandOpen(true)}
            aria-label={t('common.search')}
            aria-haspopup="dialog"
          >
            <Search size={14} />
            <span>{t('common.search')}</span>
            {searchKey && <kbd>{searchKey}</kbd>}
          </button>
        </div>
        <div className="topbar-actions">
          <span
            className="topbar-status"
            title={
              isCloud ? t(sharedStatus === 'saved' ? 'cloud.workspaceSaved' : sharedStatus === 'saving' ? 'workspace.saving' : sharedStatus === 'conflict' ? 'cloud.workspaceConflict' : 'cloud.workspaceOffline') : lastSavedAt
                ? `${t('status.storageLocal')} · ${formatClock(locale, new Date(lastSavedAt))}`
                : t('status.storageLocal')
            }
          >
            <Check size={14} strokeWidth={2.4} aria-hidden="true" />
            {t(sharedStatus === 'saved' ? (isCloud ? 'cloud.workspaceSaved' : 'workspace.saved') : sharedStatus === 'saving' ? 'workspace.saving' : isCloud ? (sharedStatus === 'conflict' ? 'cloud.workspaceConflict' : 'cloud.workspaceOffline') : 'status.storageLocal')}
          </span>
          <span className="topbar-divider" aria-hidden="true" />
          <LanguageMenu locale={locale} onChange={setLocale} label={t('settings.language')} />
          <AccountMenu />
        </div>
      </header>
      {commandOpen && <CommandPalette onClose={() => setCommandOpen(false)} />}
    </>
  )
}
