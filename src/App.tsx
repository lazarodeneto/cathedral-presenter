import { lazy, Suspense, useEffect } from 'react'
import { navigate, useHashRoute } from './hooks/useHashRoute'
import { useOutputBridge } from './hooks/useOutputBridge'
import { useAppStore } from './store/useAppStore'
import { Sidebar } from './components/Sidebar'
import { MobileNav } from './components/MobileNav'
import { TopBar } from './components/TopBar'
import { ToastHost } from './components/ToastHost'
import { ErrorBoundary } from './components/ErrorBoundary'
import { OutputScreen } from './screens/OutputScreen'

const HomeScreen = lazy(() => import('./screens/HomeScreen').then((module) => ({ default: module.HomeScreen })))
const CalendarScreen = lazy(() =>
  import('./screens/CalendarScreen').then((module) => ({ default: module.CalendarScreen })),
)
const ServicesScreen = lazy(() =>
  import('./screens/ServicesScreen').then((module) => ({ default: module.ServicesScreen })),
)
const BibleScreen = lazy(() =>
  import('./screens/BibleScreen').then((module) => ({ default: module.BibleScreen })),
)
const SongsScreen = lazy(() =>
  import('./screens/SongsScreen').then((module) => ({ default: module.SongsScreen })),
)
const MediaScreen = lazy(() =>
  import('./screens/MediaScreen').then((module) => ({ default: module.MediaScreen })),
)
const TemplatesScreen = lazy(() =>
  import('./screens/TemplatesScreen').then((module) => ({ default: module.TemplatesScreen })),
)
const SettingsScreen = lazy(() =>
  import('./screens/SettingsScreen').then((module) => ({ default: module.SettingsScreen })),
)
const WorkspaceScreen = lazy(() =>
  import('./screens/WorkspaceScreen').then((module) => ({ default: module.WorkspaceScreen })),
)
import { useT } from './i18n/useT'
import { applyTheme } from './utils/branding'
import { installShortcutListener, runShortcutAction, useShortcutHandlers } from './shortcuts/registry'
import { startHistory } from './store/history'
import { webOutputProvider } from './providers/output/WebOutputProvider'
import { useToasts } from './store/useToasts'

function RouteLoading({ label }: { label: string }) {
  return <div className="route-loading" role="status" aria-label={label} />
}

export default function App() {
  const route = useHashRoute()
  const t = useT()
  const activeService = useAppStore((state) =>
    state.services.find((service) => service.id === state.activeServiceId),
  )
  const isOutput = route.name === 'output'
  const isLive = route.name === 'live'

  const reducedMotion = useAppStore((state) => state.settings.reducedMotion)
  const reducedTransparency = useAppStore((state) => state.settings.reducedTransparency)
  const glassOpacity = useAppStore((state) => state.settings.glassOpacity ?? 0.8)

  const branding = useAppStore((state) => state.branding)

  useOutputBridge(!isOutput)

  // Keyboard shortcuts: one listener for the whole window, reading the current
  // settings on each key press. Screens register the actions they own.
  useEffect(
    () =>
      installShortcutListener(() => {
        const settings = useAppStore.getState().settings
        return { overrides: settings.shortcutOverrides ?? {}, enabled: settings.shortcutsEnabled }
      }),
    [],
  )
  useEffect(() => (isOutput ? undefined : startHistory()), [isOutput])
  // Presentation keys pressed in an output window arrive here.
  useEffect(() => (isOutput ? undefined : webOutputProvider.onCommand((actionId) => runShortcutAction(actionId))), [isOutput])
  const saveNow = useAppStore((state) => state.saveNow)
  const push = useToasts((state) => state.push)
  useShortcutHandlers(
    'global',
    {
      'app.save': () => {
        saveNow()
        push(t('toast.saved'), 'success')
      },
      'app.songs': () => navigate('/songs'),
      'app.fullscreen': () => {
        void webOutputProvider.requestFullscreen()
      },
    },
    !isOutput,
  )

  // Brand colours and browser tab icon. Output windows apply the theme carried
  // in the output snapshot instead (see OutputScreen).
  useEffect(() => {
    if (!isOutput) applyTheme(branding.theme)
  }, [branding.theme, isOutput])

  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) return
    const custom = branding.logoAsFavicon && branding.logoUrl
    link.type = custom ? branding.logoUrl!.slice(5, branding.logoUrl!.indexOf(';')) : 'image/png'
    link.href = custom ? branding.logoUrl! : '/favicon.png'
  }, [branding.logoAsFavicon, branding.logoUrl])

  useEffect(() => {
    const onStorageError = () => push(t('toast.storageFull'), 'error')
    window.addEventListener('church-presenter:storage-error', onStorageError)
    return () => window.removeEventListener('church-presenter:storage-error', onStorageError)
  }, [push, t])

  useEffect(() => {
    document.body.classList.toggle('reduced-motion', reducedMotion)
    document.body.classList.toggle('reduced-transparency', reducedTransparency)
  }, [reducedMotion, reducedTransparency])

  // Settings → Glass opacity drives one variable that every chrome glass layer reads.
  useEffect(() => {
    document.documentElement.style.setProperty('--glass-opacity', String(glassOpacity))
  }, [glassOpacity])

  // macOS-style active window: chrome dims when the window loses focus. Installed
  // (standalone) windows also show the decorative window controls.
  useEffect(() => {
    const sync = () => document.body.classList.toggle('window-inactive', !document.hasFocus())
    const standalone = window.matchMedia?.('(display-mode: standalone)')
    const syncStandalone = () => document.body.classList.toggle('is-standalone', Boolean(standalone?.matches))
    sync()
    syncStandalone()
    window.addEventListener('focus', sync)
    window.addEventListener('blur', sync)
    standalone?.addEventListener?.('change', syncStandalone)
    return () => {
      window.removeEventListener('focus', sync)
      window.removeEventListener('blur', sync)
      standalone?.removeEventListener?.('change', syncStandalone)
    }
  }, [])

  useEffect(() => {
    document.body.classList.toggle('output-mode', isOutput)
    document.body.classList.toggle('live-mode', isLive)
    return () => {
      document.body.classList.remove('output-mode')
      document.body.classList.remove('live-mode')
    }
  }, [isLive, isOutput])

  useEffect(() => {
    const label = isOutput
      ? route.id === 'confidence'
        ? t('output.confidence')
        : t('output.audience')
      : isLive
        ? t('live.title')
        : route.name === 'service'
          ? activeService?.title ?? branding.appTitle
          : route.name === 'home'
            ? t('nav.home')
            : t(`nav.${route.name}`)
    document.title = `${label} · ${branding.appTitle}`
  }, [activeService, branding.appTitle, isLive, isOutput, route.id, route.name, t])

  useEffect(() => {
    if (!isLive) return
    const liveServiceId = useAppStore.getState().live?.serviceId ?? activeService?.id
    navigate(liveServiceId ? `/service/${liveServiceId}` : '/home')
  }, [activeService?.id, isLive])

  if (isOutput) {
    const role = route.id === 'confidence' ? 'confidence' : 'audience'
    return (
      <div className="output-root">
        <ErrorBoundary>
          <OutputScreen role={role} />
        </ErrorBoundary>
      </div>
    )
  }

  if (isLive) {
    return <RouteLoading label={t('common.loading')} />
  }

  let screen
  switch (route.name) {
    case 'calendar':
      screen = <CalendarScreen />
      break
    case 'services':
      screen = <ServicesScreen />
      break
    case 'bible':
      screen = <BibleScreen />
      break
    case 'songs':
      screen = <SongsScreen />
      break
    case 'media':
      screen = <MediaScreen />
      break
    case 'templates':
      screen = <TemplatesScreen />
      break
    case 'settings':
      screen = <SettingsScreen initialTab={route.segments[1]} />
      break
    case 'service':
      screen = <WorkspaceScreen serviceId={route.id ?? activeService?.id} presentOnOpen={route.segments[2] === 'present'} />
      break
    case 'home':
    default:
      screen = <HomeScreen />
      break
  }

  return (
    <div className={`app-shell ${route.name === 'service' ? 'is-editing' : ''}`}>
      <Sidebar current={route.name} />
      <div className="app-main">
        <TopBar route={route} />
        <main className="app-content">
          <ErrorBoundary key={route.name}>
            <Suspense fallback={<RouteLoading label={t('common.loading')} />}>{screen}</Suspense>
          </ErrorBoundary>
        </main>
      </div>
      <MobileNav current={route.name} />
      <ToastHost />
    </div>
  )
}
