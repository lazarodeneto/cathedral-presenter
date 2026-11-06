import { BrandMark } from '../components/BrandMark'
import type { Branding, Locale } from '../types'
import { authStrings } from '../i18n/authStrings'
import { ArrowRight } from 'lucide-react'

export function LoginScreen({ branding, locale }: { branding: Branding; locale: Locale }) {
  const t = (key: string) => authStrings[locale][key] ?? authStrings.en[key] ?? key
  return (
    <main className="login-page">
      <section className="login-story" aria-label={branding.appTitle}>
        <div className="login-atmosphere" aria-hidden="true"><span className="login-beam" /><span className="login-beam login-beam-second" /></div>
        <div className="login-brand"><BrandMark branding={branding} size="lg" /><span>{branding.appTitle}<small>{branding.name}</small></span></div>
        <div><h1>{t('auth.intro')}</h1><p>{t('auth.description')}</p></div>
        <p className="login-local">{t('auth.local')}</p>
      </section>
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-card">
          <h2 id="login-title">{t('auth.title')}</h2>
          <p className="login-note">{t('auth.local')}</p>
          <a className="login-submit" href="#/home">{t('auth.offline')}<ArrowRight size={18} aria-hidden="true" /></a>
          <div className="login-account" aria-describedby="login-account-note">
            <button className="login-offline" disabled>{t('auth.signIn')}</button>
            <p id="login-account-note" className="login-note">{t('auth.note')}</p>
          </div>
        </div>
      </section>
    </main>
  )
}
