import { AccountMenu } from './AccountMenu'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, Check, ChevronDown, Clock3, Search, TriangleAlert, X } from 'lucide-react'
import type { Locale } from '../types'
import { LOCALE_OPTIONS } from '../i18n/dictionary'
import { useT } from '../i18n/useT'
import { useAppStore } from '../store/useAppStore'
import { navigate, type Route } from '../hooks/useHashRoute'
import { useDialogFocus } from '../hooks/useDialogFocus'
import { useShortcutHandlers } from '../shortcuts/registry'
import { useShortcutLabel } from '../shortcuts/useShortcutLabel'
import { formatClock, formatLongDate, formatToolbarDate } from '../utils/dates'
import { LocaleFlag } from './LocaleFlag'
import { SCREEN_META, type ScreenName } from './ScreenIcon'

const LABELS: Record<string, string> = {
  home: 'nav.home',
  calendar: 'nav.calendar',
  services: 'nav.services',
  bible: 'nav.bible',
  biblemode: 'nav.biblemode',
  songs: 'nav.songs',
  media: 'nav.media',
  templates: 'nav.templates',
  settings: 'nav.settings',
  service: 'editor.currentOutput',
  live: 'live.title',
  output: 'output.role',
}

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
    const destinations = DESTINATIONS.filter((entry) =>
      t(entry.key).toLowerCase().includes(needle),
    )
    const matchedServices = services
      .filter((service) =>
        `${service.title} ${formatLongDate(service.date, locale)}`
          .toLowerCase()
          .includes(needle),
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

/** Language picker: the active language's flag and code, opening a list of all of them. */
function LanguageMenu({ locale, onChange }: { locale: Locale; onChange: (locale: Locale) => void }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const current = LOCALE_OPTIONS.find((option) => option.value === locale) ?? LOCALE_OPTIONS[0]
  const listId = 'topbar-language-list'

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    listRef.current?.focus()
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open])

  const show = () => {
    setActive(Math.max(0, LOCALE_OPTIONS.findIndex((option) => option.value === locale)))
    setOpen(true)
  }

  const close = (focusButton = true) => {
    setOpen(false)
    if (focusButton) buttonRef.current?.focus()
  }

  const choose = (value: Locale) => {
    if (value !== locale) onChange(value)
    close()
  }

  const onListKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
    const last = LOCALE_OPTIONS.length - 1
    const moves: Record<string, number> = {
      ArrowDown: Math.min(last, active + 1),
      ArrowUp: Math.max(0, active - 1),
      Home: 0,
      End: last,
    }
    if (event.key in moves) {
      event.preventDefault()
      setActive(moves[event.key])
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      choose(LOCALE_OPTIONS[active].value)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close()
    } else if (event.key === 'Tab') {
      close(false)
    }
  }

  return (
    <div className="topbar-language" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`topbar-language-trigger ${open ? 'is-open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`${t('settings.language')}: ${current.label}`}
        title={t('settings.language')}
        onClick={() => (open ? close() : show())}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            show()
          }
        }}
      >
        <LocaleFlag locale={current.value} size={18} />
        <span className="topbar-language-code">{current.short}</span>
        <ChevronDown size={13} className="topbar-language-chevron" aria-hidden="true" />
      </button>
      {open && (
        <ul
          ref={listRef}
          id={listId}
          className="topbar-language-menu"
          role="listbox"
          tabIndex={-1}
          aria-label={t('settings.language')}
          aria-activedescendant={`${listId}-${LOCALE_OPTIONS[active].value}`}
          onKeyDown={onListKeyDown}
        >
          {LOCALE_OPTIONS.map((option, index) => (
            <li
              key={option.value}
              id={`${listId}-${option.value}`}
              role="option"
              aria-selected={option.value === locale}
              className={`topbar-language-option ${index === active ? 'is-active' : ''}`}
              onPointerEnter={() => setActive(index)}
              onClick={() => choose(option.value)}
            >
              <LocaleFlag locale={option.value} size={20} />
              <span className="topbar-language-name">
                {option.label.slice(0, -option.short.length).trimEnd()}{' '}
                <span className="topbar-language-region">{option.short}</span>
              </span>
              <Check size={14} strokeWidth={2.4} className="topbar-language-check" aria-hidden="true" />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function TopBar({ route }: { route: Route }) {
  const t = useT()
  const locale = useAppStore((state) => state.settings.locale)
  const setLocale = useAppStore((state) => state.setLocale)
  const activeService = useAppStore((state) =>
    state.services.find((service) => service.id === state.activeServiceId),
  )
  const live = useAppStore((state) => state.live)
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

  const label =
    route.name === 'service' && activeService
      ? formatToolbarDate(activeService.date, locale)
      : route.name === 'output'
        ? t('output.role')
        : t(LABELS[route.name] || 'nav.home')

  // The screen's own icon and tone (a service uses the Services tone) colour the bar.
  const screen = (route.name === 'service' ? 'services' : route.name) as ScreenName
  const meta = SCREEN_META[screen] ?? SCREEN_META.home
  const ScreenGlyph = meta.icon

  return (
    <>
      <header className="topbar" data-tone={meta.tone}>
        <div className="topbar-breadcrumb">
          <span className="topbar-screen-icon tone-chip" data-tone={meta.tone} aria-hidden="true">
            <ScreenGlyph size={15} strokeWidth={2} />
          </span>
          {route.name === 'service' && activeService ? (
            // The rundown already shows the service title; here the screen name and the date.
            <span className="topbar-title-stack">
              <strong>{t('nav.services')}</strong>
              <small>{label}</small>
            </span>
          ) : (
            <strong>{label}</strong>
          )}
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
            title={lastSavedAt ? `${t('status.storageLocal')} · ${formatClock(locale, new Date(lastSavedAt))}` : t('status.storageLocal')}
          >
            <Check size={14} strokeWidth={2.4} aria-hidden="true" />
            {t('status.storageLocal')}
          </span>
          <span className="topbar-clock">
            <Clock3 size={14} aria-hidden="true" />
            {formatClock(locale, clock)}
          </span>
          <span className="topbar-divider" aria-hidden="true" />
          <LanguageMenu locale={locale} onChange={setLocale} />
          <AccountMenu />
        </div>
      </header>
      {commandOpen && <CommandPalette onClose={() => setCommandOpen(false)} />}
    </>
  )
}
