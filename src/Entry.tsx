import { preferredLocale, savePreferredLocale } from './i18n/preferredLocale'
import { lazy, Suspense, useEffect, useState } from 'react'
import { LoginScreen } from './screens/LoginScreen'
import { applyTheme, normalizeBranding } from './utils/branding'
import { LOCALES, type Locale } from './types'

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

export function Entry() {
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
