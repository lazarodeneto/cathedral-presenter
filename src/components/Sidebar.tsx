import { Play, Sparkles } from 'lucide-react'
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
  { name: 'songs', key: 'nav.songs' },
  { name: 'media', key: 'nav.media' },
  { name: 'templates', key: 'nav.templates' },
  { name: 'settings', key: 'nav.settings' },
]

export function Sidebar({ current }: { current: RouteName }) {
  const t = useT()
  const branding = useAppStore((state) => state.branding)
  const services = useAppStore((state) => state.services)
  const activeServiceId = useAppStore((state) => state.activeServiceId)
  const openService = useAppStore((state) => state.selectService)
  const activeService = services.find((service) => service.id === activeServiceId)
  const slideCount = activeService ? flatSlides(activeService).length : 0

  const openPresent = () => {
    if (!activeService) {
      navigate('/calendar')
      return
    }
    openService(activeService.id)
    navigate(`/service/${activeService.id}`)
  }

  return (
    <aside className="sidebar">
      {/* Decorative only: shown in an installed window, where the OS draws the real controls. */}
      <div className="window-controls" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <button className="brand" onClick={() => navigate('/home')} aria-label={t('nav.home')}>
        <BrandMark branding={branding} size="md" />
        <span className="brand-copy">
          <strong>{branding.appTitle}</strong>
          <span>{branding.name.trim() || t('app.subtitle')}</span>
        </span>
      </button>

      <div className="sidebar-label">
        <Sparkles size={12} />
        {t('sidebar.localSettings')}
      </div>

      <nav className="main-nav" aria-label={branding.appTitle}>
        {NAV.map(({ name, key }) => {
          const { icon: Icon, tone } = SCREEN_META[name]
          return (
          <button
            key={name}
            data-tone={tone}
            className={`nav-item ${current === name || (current === 'service' && name === 'services') ? 'is-active' : ''}`}
            aria-current={current === name || (current === 'service' && name === 'services') ? 'page' : undefined}
            aria-label={t(key)}
            title={t(key)}
            onClick={() => navigate(`/${name}`)}
          >
            <Icon size={18} strokeWidth={1.7} />
            <span>{t(key)}</span>
          </button>
          )
        })}
      </nav>

      <div className="sidebar-spacer" />

      <div className="sidebar-service">
        <span className="eyebrow">{t('home.upcoming')}</span>
        {activeService ? (
          <>
            <button className="sidebar-service-name" onClick={() => navigate(`/service/${activeService.id}`)}>
              <strong>{activeService.title}</strong>
              <span>
                {formatNumericDate(activeService.date)} · {slideCount} {t(slideCount === 1 ? 'common.slide' : 'common.slides')}
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

      <div className="sidebar-footer">
        <span className="status-dot status-dot-ready" />
        <div>
          <strong>{t('status.offlineReady')}</strong>
          <span>{t('status.storageLocal')}</span>
        </div>
      </div>
    </aside>
  )
}
