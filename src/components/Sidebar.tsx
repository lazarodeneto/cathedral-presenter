import { AppName } from './AppName'
import { PanelLeftClose, PanelLeftOpen, Play, RotateCcw, Sparkles } from 'lucide-react'
import { resetLayoutToDefault } from '../store/layoutReset'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useT } from '../i18n/useT'
import { useAppStore } from '../store/useAppStore'
import { navigate, type RouteName } from '../hooks/useHashRoute'
import { BrandMark } from './BrandMark'
import { SCREEN_META, type ScreenName } from './ScreenIcon'
import { flatSlides } from '../store/serviceUtils'
import { formatNumericDate } from '../utils/dates'

const NAV: { name: ScreenName; key: string }[] = [
  { name: 'home', key: 'nav.home' },
  { name: 'services', key: 'nav.services' },
  { name: 'calendar', key: 'nav.calendar' },
  { name: 'bible', key: 'nav.bible' },
  { name: 'biblemode', key: 'nav.biblemode' },
  { name: 'songs', key: 'nav.songs' },
  { name: 'media', key: 'nav.media' },
  { name: 'templates', key: 'nav.templates' },
  { name: 'settings', key: 'nav.settings' },
]

/** True while the CSS shows the icon rail on its own (narrow windows, or the editor on mid-size ones). */
function useAutoRail(editing: boolean): boolean {
  const query = editing ? '(max-width: 1360px)' : '(max-width: 1180px)'
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(query).matches === true)
  useEffect(() => {
    const list = window.matchMedia?.(query)
    if (!list) return
    const update = () => setMatches(list.matches)
    update()
    list.addEventListener('change', update)
    return () => list.removeEventListener('change', update)
  }, [query])
  return matches
}

export function Sidebar({ current }: { current: RouteName }) {
  const navRef = useRef<HTMLElement>(null)
  const highlightRef = useRef<HTMLSpanElement>(null)
  const t = useT()
  const branding = useAppStore((state) => state.branding)
  const services = useAppStore((state) => state.services)
  const activeServiceId = useAppStore((state) => state.activeServiceId)
  const openService = useAppStore((state) => state.selectService)
  // While live, the operator's attention belongs to the live controls: no next-service card or status here.
  const isLive = useAppStore((state) => Boolean(state.live))
  const activeService = services.find((service) => service.id === activeServiceId)
  const slideCount = activeService ? flatSlides(activeService).length : 0
  const collapsedSetting = useAppStore((state) => state.settings.sidebarCollapsed)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const autoRail = useAutoRail(current === 'service')
  const collapsed = collapsedSetting ?? autoRail

  useLayoutEffect(() => {
    const nav = navRef.current
    const highlight = highlightRef.current
    if (!nav || !highlight) return
    const update = () => {
      const active = nav.querySelector<HTMLElement>('.nav-item.is-active')
      if (!active) { nav.classList.remove('has-nav-highlight'); return }
      const parent = nav.getBoundingClientRect()
      const target = active.getBoundingClientRect()
      highlight.style.width = `${target.width}px`
      highlight.style.height = `${target.height}px`
      highlight.style.transform = `translate(${target.left - parent.left}px, ${target.top - parent.top}px)`
      nav.classList.add('has-nav-highlight')
    }
    update()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update)
      return () => window.removeEventListener('resize', update)
    }
    const observer = new ResizeObserver(update)
    observer.observe(nav)
    return () => observer.disconnect()
  }, [current, collapsed])

  const openPresent = () => {
    if (!activeService) {
      navigate('/calendar')
      return
    }
    openService(activeService.id)
    navigate(`/service/${activeService.id}`)
  }

  return (
    <aside className="sidebar" aria-label={branding.appTitle}>
      {/* Decorative only: shown in an installed window, where the OS draws the real controls. */}
      <div className="window-controls" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <button className="brand" onClick={() => navigate('/home')} aria-label={t('nav.home')}>
        <BrandMark branding={branding} size="md" />
        <span className="brand-copy">
          <AppName>{branding.appTitle}</AppName>
          {branding.name.trim() && branding.name !== branding.appTitle && <span>{branding.name}</span>}
        </span>
      </button>

      <div className="sidebar-label">
        <Sparkles size={12} />
        {t('sidebar.localSettings')}
      </div>

      <nav ref={navRef} className="main-nav" aria-label={branding.appTitle}>
        <span ref={highlightRef} className="nav-highlight" aria-hidden="true" />
        {NAV.map(({ name, key }) => {
          const { icon: Icon, tone } = SCREEN_META[name]
          return (
            <button
              key={name}
              data-tone={tone}
              className={`nav-item ${current === name || (current === 'service' && name === 'services') ? 'is-active' : ''}`}
              aria-current={
                current === name || (current === 'service' && name === 'services')
                  ? 'page'
                  : undefined
              }
              aria-label={t(key)}
              onClick={() => navigate(`/${name}`)}
            >
              <span className="nav-app-icon" aria-hidden="true">
                <Icon size={15} strokeWidth={1.9} />
              </span>
              <span>{t(key)}</span>
              {/* Shown on hover only while the menu is the icon rail. */}
              <span className="nav-tooltip" aria-hidden="true">
                {t(key)}
              </span>
            </button>
          )
        })}
      </nav>

      <div className="sidebar-spacer" />

      {!isLive && (
        <div className="sidebar-service">
          <span className="eyebrow">{t('home.upcoming')}</span>
          {activeService ? (
            <>
              <button
                className="sidebar-service-name"
                onClick={() => navigate(`/service/${activeService.id}`)}
              >
                <strong>{activeService.title}</strong>
                <span>
                  {formatNumericDate(activeService.date)} · {slideCount}{' '}
                  {t(slideCount === 1 ? 'common.slide' : 'common.slides')}
                </span>
              </button>
              <button className="btn btn-present btn-block" onClick={openPresent}>
                <Play size={14} fill="currentColor" />
                {activeService ? t('calendar.openService') : t('calendar.newService')}
              </button>
            </>
          ) : (
            <button className="btn btn-secondary btn-block" onClick={() => navigate('/calendar')}>
              {t('calendar.newService')}
            </button>
          )}
        </div>
      )}

      {!isLive && (
        <div className="sidebar-footer">
          <strong>{t('common.version')} 0.1.0</strong>
        </div>
      )}

      <button
        type="button"
        className="sidebar-toggle"
        onClick={() => updateSettings({ sidebarCollapsed: !collapsed })}
        aria-label={t(collapsed ? 'sidebar.expand' : 'sidebar.collapse')}
        aria-expanded={!collapsed}
      >
        {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        <span>{t(collapsed ? 'sidebar.expand' : 'sidebar.collapse')}</span>
        <span className="nav-tooltip" aria-hidden="true">
          {t(collapsed ? 'sidebar.expand' : 'sidebar.collapse')}
        </span>
      </button>
      <button
        type="button"
        className="sidebar-toggle sidebar-reset"
        onClick={() => void resetLayoutToDefault(t('sidebar.resetDone'))}
        aria-label={t('sidebar.reset')}
        title={t('sidebar.resetHint')}
      >
        <RotateCcw size={15} />
        <span>{t('sidebar.reset')}</span>
        <span className="nav-tooltip" aria-hidden="true">
          {t('sidebar.reset')}
        </span>
      </button>
    </aside>
  )
}
