import { useMemo, useState } from 'react'
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  Copy,
  Database,
  History,
  FilePlus2,
  Library,
  Music4,
  Play,
  Plus,
  Sparkles,
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useToasts } from '../store/useToasts'
import { useT } from '../i18n/useT'
import { useIntlLocale } from '../i18n/useT'
import { navigate } from '../hooks/useHashRoute'
import { flatSlides } from '../store/serviceUtils'
import { formatLongDate, formatNumericDate, formatTime, isoDate } from '../utils/dates'
import { getLocalPassageSync } from '../providers/bible/LocalBibleProvider'
import { BrandMark } from '../components/BrandMark'
import { SlideRenderer } from '../components/SlideRenderer'
import { NewServiceDialog } from '../components/NewServiceDialog'
import { serviceReadiness, timeUntilService } from '../utils/serviceReadiness'

function greetingKey(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'home.greetingMorning'
  if (hour < 18) return 'home.greetingAfternoon'
  return 'home.greetingEvening'
}

export function HomeScreen() {
  const t = useT()
  const intlLocale = useIntlLocale()
  const locale = useAppStore((state) => state.settings.locale)
  const branding = useAppStore((state) => state.branding)
  const services = useAppStore((state) => state.services)
  const monitors = useAppStore((state) => state.monitors)
  const live = useAppStore((state) => state.live)
  const settings = useAppStore((state) => state.settings)
  const recentPassages = useAppStore((state) => state.recentPassages)
  const selectService = useAppStore((state) => state.selectService)
  const duplicateService = useAppStore((state) => state.duplicateService)
  const dismissSetup = useAppStore((state) => state.dismissSetup)
  const push = useToasts((state) => state.push)
  const [newServiceOpen, setNewServiceOpen] = useState(false)
  const today = isoDate(new Date())

  const ordered = useMemo(
    () => [...services].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)),
    [services],
  )
  const upcoming = ordered.filter((service) => service.date >= today)
  const hero = upcoming[0] ?? ordered[ordered.length - 1]
  const heroSlides = hero ? flatSlides(hero) : []
  const heroPreview = heroSlides[0]?.slide ?? null
  const upcomingRest = upcoming.filter((service) => service.id !== hero?.id).slice(0, 4)
  const recent = [...services]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .filter((service) => service.id !== hero?.id)
    .slice(0, 3)

  const recentPassage = recentPassages[0]
  const passage = useMemo(() => {
    if (!recentPassage) return null
    try {
      return getLocalPassageSync(recentPassage.reference, recentPassage.translationId)
    } catch {
      return null
    }
  }, [recentPassage])

  const audience = monitors.find((monitor) => monitor.role === 'audience')
  const checklist = [
    {
      key: 'home.setupLogo',
      done: Boolean(branding.logoUrl),
      action: () => navigate('/settings'),
    },
    {
      key: 'home.setupTranslation',
      done: Boolean(settings.defaultTranslationId),
      action: () => navigate('/settings'),
    },
    {
      key: 'home.setupOutput',
      done: Boolean(audience),
      action: () => navigate('/settings/outputs'),
    },
    {
      key: 'home.setupService',
      done: services.length > 0,
      action: () => setNewServiceOpen(true),
    },
  ]
  const completed = checklist.filter((item) => item.done).length

  const heroSongs = hero
    ? hero.items.filter((item) => item.type === 'song' && hero.sections.some((section) => section.itemIds.includes(item.id))).length
    : 0
  const readiness = hero ? serviceReadiness(hero, { hasAudienceOutput: Boolean(audience) }) : null
  const startsIn = hero ? timeUntilService(hero, new Date()) : null

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

  return (
    <div className="screen home-screen">
      <div className="screen-heading home-heading">
        <div>
          <h1>{t(greetingKey())}</h1>
          <p>
            {branding.name.trim() || t('app.name')} · {formatLongDate(today, locale)}
          </p>
        </div>
        <div className="heading-actions">
          {live && (
            <button className="btn btn-live" onClick={() => navigate(`/service/${live.serviceId}`)}>
              <span className="live-dot" />
              {t('live.returnLive')}
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => setNewServiceOpen(true)}>
            <Plus size={16} />
            {t('home.createService')}
          </button>
        </div>
      </div>

      {hero ? (
        <section className="home-hero panel">
          <div className="home-hero-copy">
            {live?.serviceId === hero.id && (
              <div className="hero-kicker">
                <span className="live-chip">
                  <span className="live-dot" />
                  {t('status.live')}
                </span>
              </div>
            )}
            <h2>{hero.title}</h2>
            <div className="hero-meta">
              <span>
                <CalendarDays size={15} />
                {formatLongDate(hero.date, locale)}
              </span>
              <span>
                <Clock3 size={15} />
                {formatTime(hero.time, locale)}
              </span>
              <span>
                <LayersIcon />
                {heroSlides.length} {t(heroSlides.length === 1 ? 'common.slide' : 'common.slides')}
              </span>
            </div>
            <p className="hero-note">
              {hero.notes || t('live.startCopy')}
            </p>
            <div className="hero-actions">
              <button className="btn btn-primary" onClick={() => open(hero.id)}>
                <Play size={15} fill="currentColor" />
                {t('calendar.openService')}
              </button>
              <button className="btn btn-secondary" onClick={() => duplicate(hero.id)}>
                <Copy size={15} />
                {t('common.duplicate')}
              </button>
            </div>
          </div>
          <div className="home-hero-preview">
            <div className="hero-preview-frame">
              <SlideRenderer
                slide={heroPreview}
                branding={branding}
                compact
              />
            </div>
            <div className="hero-preview-foot">
              <span className="hero-preview-caption">
                {t('editor.currentOutput')} · {hero.sections[0]?.title}
              </span>
              <button className="hero-output-status" onClick={() => navigate('/settings/outputs')}>
                <span className={`status-dot status-dot-${audience?.status ?? 'disconnected'}`} />
                {audience
                  ? `${t('output.audience')} · ${audience.name}`
                  : t('live.noAudience')}
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="empty-welcome panel">
          <BrandMark branding={branding} size="lg" />
          <h2>{t('home.noUpcoming')}</h2>
          <p>{t('home.newServiceCopy')}</p>
          <button className="btn btn-primary" onClick={() => setNewServiceOpen(true)}>
            <Plus size={16} />
            {t('home.createService')}
          </button>
        </section>
      )}

      {hero && readiness && (
        <section className="home-pulse" aria-label={hero.title}>
          <div className="home-stats">
            <div className="stat-tile" data-tone="blue">
              <span className="tone-chip" aria-hidden="true">
                <LayersIcon />
              </span>
              <span className="stat-label">{t('home.statSlides')}</span>
              <strong className="stat-value">{heroSlides.length}</strong>
              <span className="stat-hint">{t('home.statSections', { count: hero.sections.length })}</span>
            </div>
            <div className="stat-tile" data-tone="rose">
              <span className="tone-chip" aria-hidden="true">
                <Music4 size={16} />
              </span>
              <span className="stat-label">{t('home.statSongs')}</span>
              <strong className="stat-value">{heroSongs}</strong>
              <span className="stat-hint">{heroSongs === 0 ? t('home.statNoSongs') : t('home.statInService')}</span>
            </div>
            <div className="stat-tile" data-tone="amber">
              <span className="tone-chip" aria-hidden="true">
                <Clock3 size={16} />
              </span>
              <span className="stat-label">{t('home.statStartsIn')}</span>
              <strong className="stat-value">
                {startsIn ? t('home.statDaysHours', { days: startsIn.days, hours: startsIn.hours }) : t('home.statStarted')}
              </strong>
              <span className="stat-hint">
                {formatNumericDate(hero.date)} · {formatTime(hero.time, locale)}
              </span>
            </div>
          </div>
          <div className="panel readiness-panel">
            <ReadinessRing percent={readiness.percent} label={t('home.readyPercent', { percent: readiness.percent })} />
            <div className="readiness-copy">
              <h3>{t('home.readiness')}</h3>
              <p className="readiness-summary">
                {readiness.checks.filter((check) => check.done).length}/{readiness.checks.length}
              </p>
              <ul className="readiness-checks">
                {readiness.checks.map((check) => (
                  <li key={check.key} className={check.done ? 'is-done' : ''}>
                    {check.done ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                    {t(check.key)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      <div className="home-grid">
        <section className="panel home-upcoming">
          <div className="panel-header">
            <div className="panel-title">
              <span className="tone-chip" data-tone="blue" aria-hidden="true">
                <CalendarDays size={16} />
              </span>
              <h3>{t('home.upcoming')}</h3>
            </div>
            <button className="text-link" onClick={() => navigate('/calendar')}>
              {t('common.viewAll')}
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="service-list">
            {upcomingRest.length ? (
              upcomingRest.map((service) => {
                const slides = flatSlides(service)
                return (
                  <button
                    key={service.id}
                    className="service-row"
                    onClick={() => open(service.id)}
                  >
                    <span className="service-date" data-tone="blue">
                      <strong>{service.date.slice(8, 10)}</strong>
                      <span>
                        {new Intl.DateTimeFormat(intlLocale, { month: 'short' }).format(
                          new Date(`${service.date}T12:00:00`),
                        )}
                      </span>
                    </span>
                    <span className="service-row-main">
                      <strong>{service.title}</strong>
                      <span>
                        {formatTime(service.time, locale)} · {slides.length}{' '}
                        {t(slides.length === 1 ? 'common.slide' : 'common.slides')} ·{' '}
                        {service.eventType}
                      </span>
                    </span>
                    <span className={`dot-status ${service.date === today ? 'is-today' : ''}`} />
                    <ChevronRight size={16} className="service-chevron" />
                  </button>
                )
              })
            ) : (
              <div className="list-empty">{t('home.noUpcoming')}</div>
            )}
          </div>
          <button className="panel-footer-action" onClick={() => setNewServiceOpen(true)}>
            <FilePlus2 size={15} />
            {t('home.createService')}
          </button>
        </section>

        <section className="panel home-scripture">
          <div className="panel-header">
            <div className="panel-title">
              <span className="tone-chip" data-tone="amber" aria-hidden="true">
                <BookIcon />
              </span>
              <h3>{t('home.recentPassage')}</h3>
            </div>
            <button className="icon-link" onClick={() => navigate('/bible')} aria-label={t('home.openBible')}>
              <ArrowRight size={16} />
            </button>
          </div>
          {passage ? (
            <button className="scripture-feature" onClick={() => navigate('/bible')}>
              <span className="translation-tag">
                {passage.translationAbbreviation} · {passage.reference}
              </span>
              <blockquote>{passage.verses[0]?.text}</blockquote>
              <span className="scripture-source">
                <Library size={13} />
                {t('bible.localLibrary')}
              </span>
            </button>
          ) : (
            <div className="list-empty">{t('bible.noResults')}</div>
          )}
          <div className="quick-links">
            <button data-tone="amber" onClick={() => navigate('/bible')}>
              <BookIcon />
              {t('home.openBible')}
              <ChevronRight size={14} />
            </button>
            <button data-tone="rose" onClick={() => navigate('/songs')}>
              <MusicIcon />
              {t('songs.title')}
              <ChevronRight size={14} />
            </button>
          </div>
        </section>

        <section className="panel home-recent">
          <div className="panel-header">
            <div className="panel-title">
              <span className="tone-chip" data-tone="violet" aria-hidden="true">
                <History size={16} />
              </span>
              <h3>{t('home.recent')}</h3>
            </div>
          </div>
          <div className="recent-list">
            {recent.length ? (
              recent.map((service) => (
                <button key={service.id} className="recent-row" onClick={() => open(service.id)}>
                  <span className="recent-thumb">
                    <SlideRenderer
                      slide={flatSlides(service)[0]?.slide ?? null}
                      branding={branding}
                      compact
                    />
                  </span>
                  <span>
                    <strong>{service.title}</strong>
                    <span>
                      {formatLongDate(service.date, locale)} · {flatSlides(service).length}{' '}
                      {t('common.slides')}
                    </span>
                  </span>
                  <ChevronRight size={15} />
                </button>
              ))
            ) : (
              <div className="list-empty">{t('home.noRecent')}</div>
            )}
          </div>
        </section>
      </div>

      <div className="home-lower">
        {settings.showSetupChecklist && completed < checklist.length && (
          <section className="panel setup-panel">
            <div className="setup-icon tone-chip" data-tone="violet">
              <Sparkles size={20} />
            </div>
            <div className="setup-copy">
              <div className="setup-title">
                <h3>{t('home.setup')}</h3>
                <span>
                  {completed}/{checklist.length}
                </span>
              </div>
              <p>{t('home.setupCopy')}</p>
              <div className="setup-steps">
                {checklist.map((item) => (
                  <button
                    key={item.key}
                    className={`setup-step ${item.done ? 'is-done' : ''}`}
                    onClick={item.action}
                  >
                    {item.done ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                    {t(item.key)}
                  </button>
                ))}
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={dismissSetup}>
              {t('home.dismiss')}
            </button>
          </section>
        )}

        <section className="panel backup-panel">
          <span className="backup-icon tone-chip" data-tone="cyan">
            <Database size={20} />
          </span>
          <div>
            <h3>{t('home.backup')}</h3>
            <p>{t('home.backupCopy')}</p>
            <span className="muted-note">
              {t('home.lastBackup')}:{' '}
              {settings.lastBackupAt
                ? formatNumericDate(isoDate(new Date(settings.lastBackupAt)))
                : t('common.never')}
            </span>
          </div>
          <div className="backup-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/settings/data')}>
              {t('home.exportBackup')}
            </button>
          </div>
        </section>
      </div>

      <NewServiceDialog open={newServiceOpen} onClose={() => setNewServiceOpen(false)} />
    </div>
  )
}

function ReadinessRing({ percent, label }: { percent: number; label: string }) {
  const radius = 42
  const circumference = 2 * Math.PI * radius
  return (
    <div className="readiness-ring" role="img" aria-label={label}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <linearGradient id="readiness-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" style={{ stopColor: 'rgb(var(--tone-blue-rgb))' }} />
            <stop offset="100%" style={{ stopColor: 'rgb(var(--tone-violet-rgb))' }} />
          </linearGradient>
        </defs>
        <circle className="readiness-track" cx="50" cy="50" r={radius} />
        <circle
          className="readiness-value"
          cx="50"
          cy="50"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent / 100)}
        />
      </svg>
      <strong>{percent}%</strong>
    </div>
  )
}

function LayersIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="2.5" width="9" height="7" rx="1.4" stroke="currentColor" />
      <rect x="5" y="6" width="9" height="7" rx="1.4" stroke="currentColor" />
    </svg>
  )
}

function BookIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 3.5h4.2c.9 0 1.6.7 1.6 1.6v7.4H4.6A1.6 1.6 0 0 1 3 10.9V3.5Z" stroke="currentColor" />
      <path d="M13 3.5H8.8v9h4.4c.4 0 .8-.3.8-.8V4.3c0-.4-.4-.8-.8-.8Z" stroke="currentColor" />
    </svg>
  )
}

function MusicIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6 12V4.2l6-1.2v7.8" stroke="currentColor" />
      <circle cx="4.2" cy="12" r="1.8" stroke="currentColor" />
      <circle cx="10.2" cy="10.8" r="1.8" stroke="currentColor" />
    </svg>
  )
}
