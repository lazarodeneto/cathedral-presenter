import { preferredLocale, savePreferredLocale } from './i18n/preferredLocale'
import { lazy, Suspense, useEffect, useState } from 'react'
import { LoginScreen } from './screens/LoginScreen'
import { applyTheme, normalizeBranding } from './utils/branding'
import { LOCALES, type Locale } from './types'
import { authClient } from './auth/client'
import { isCloud } from './runtime'
import { cloudStrings } from './i18n/cloudStrings'

// Account entry does not need the editor store, Bible libraries or full dictionaries.
const Workspace = lazy(() => import('./App'))

function readEntrySettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('church-presenter:workspace:v1') ?? '{}')
    const state = saved?.state
    const locale: Locale =
      preferredLocale() ??
      (LOCALES.includes(state?.settings?.locale) ? state.settings.locale : 'en')
    return {
      branding: normalizeBranding(state?.branding),
      locale,
      reducedMotion: state?.settings?.reducedMotion === true,
      reducedTransparency: state?.settings?.reducedTransparency === true,
    }
  } catch {
    return {
      branding: normalizeBranding(undefined),
      locale: preferredLocale() ?? ('en' as Locale),
      reducedMotion: false,
      reducedTransparency: false,
    }
  }
}

function LocalEntry() {
  const [login, setLogin] = useState(() => window.location.hash.split('?')[0] === '#/login')
  const [settings, setSettings] = useState(readEntrySettings)
  useEffect(() => {
    const update = () => {
      const isLogin = window.location.hash.split('?')[0] === '#/login'
      if (isLogin) setSettings(readEntrySettings())
      setLogin(isLogin)
    }
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])
  useEffect(() => {
    if (!login) {
      const locale = preferredLocale()
      if (locale)
        void import('./store/useAppStore').then(({ useAppStore }) => {
          if (useAppStore.getState().settings.locale !== locale)
            useAppStore.getState().setLocale(locale)
        })
      return
    }
    applyTheme(settings.branding.theme)
    document.documentElement.lang = settings.locale
    document.title = 'Cathedral Presenter'
    document.body.classList.toggle('reduced-motion', settings.reducedMotion)
    document.body.classList.toggle('reduced-transparency', settings.reducedTransparency)
  }, [login, settings])
  return login ? (
    <LoginScreen
      reducedMotion={settings.reducedMotion}
      branding={settings.branding}
      locale={settings.locale}
      onLocaleChange={(locale) => {
        savePreferredLocale(locale)
        setSettings((current) => ({ ...current, locale }))
      }}
    />
  ) : (
    <Suspense
      fallback={
        <div className="route-loading" role="status" aria-label={settings.branding.appTitle} />
      }
    >
      <Workspace />
    </Suspense>
  )
}

function CloudEntry() {
  const { data: session, isPending } = authClient.useSession()
  const [settings, setSettings] = useState(readEntrySettings)
  const [health, setHealth] = useState<{ configured: boolean; emailReady?: boolean } | null>(null)
  const [login, setLogin] = useState(() => window.location.hash.startsWith('#/login'))
  useEffect(() => {
    let active = true
    const check = () => { void fetch('/api/app-health', { signal: AbortSignal.timeout(15000) }).then(async (r) => {
      const data = await r.json(); if (active) setHealth(r.ok ? data : { configured: false })
    }).catch(() => { if (active) setHealth({ configured: false }) }) }
    check(); window.addEventListener('focus', check)
    const hash = () => setLogin(window.location.hash.startsWith('#/login'))
    window.addEventListener('hashchange', hash)
    const expired = () => { void authClient.signOut().finally(() => { window.location.hash = '/login' }) }
    window.addEventListener('cathedral:session-expired', expired)
    return () => { active = false; window.removeEventListener('focus', check); window.removeEventListener('hashchange', hash); window.removeEventListener('cathedral:session-expired', expired) }
  }, [])
  useEffect(() => { applyTheme(settings.branding.theme); document.documentElement.lang = settings.locale; document.title = 'Cathedral Presenter' }, [settings.branding.theme, settings.locale])
  if (isPending || !health) return <div className="route-loading" role="status" aria-label={settings.branding.appTitle} />
  if (!session || login || !health.configured) return <LoginScreen branding={settings.branding} locale={settings.locale} cloud cloudReady={health.configured} emailReady={health.emailReady} reducedMotion={settings.reducedMotion} onLocaleChange={(locale) => { savePreferredLocale(locale); setSettings((s) => ({ ...s, locale })) }} />
  return <Suspense fallback={<div className="route-loading" role="status" aria-label={cloudStrings[settings.locale]['cloud.online']} />}><Workspace /></Suspense>
}
export function Entry() { return isCloud ? <CloudEntry /> : <LocalEntry /> }
