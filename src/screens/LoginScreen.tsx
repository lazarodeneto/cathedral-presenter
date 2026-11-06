import { useState, type FormEvent } from 'react'
import { BrandMark } from '../components/BrandMark'
import type { Branding, Locale } from '../types'
import { authStrings } from '../i18n/authStrings'
import { authClient } from '../auth/client'
import { ArrowRight } from 'lucide-react'

export function LoginScreen({ branding, locale }: { branding: Branding; locale: Locale }) {
  const t = (key: string) => authStrings[locale][key] ?? authStrings.en[key] ?? key
  const [signup, setSignup] = useState(
    () => new URLSearchParams(window.location.hash.split('?')[1]).get('mode') === 'signup',
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const { data: session } = authClient.useSession()
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    setBusy(true)
    setError('')
    try {
      const email = String(values.get('email')).trim()
      const password = String(values.get('password'))
      const result = signup
        ? await authClient.signUp.email({
            email,
            password,
            name: String(values.get('name')).trim(),
          })
        : await authClient.signIn.email({ email, password })
      if (result.error) {
        setError(t(signup ? 'auth.signupFailed' : 'auth.invalidCredentials'))
        return
      }
      form.reset()
      window.location.hash = '/home'
    } catch {
      setError(t('auth.error'))
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="login-page">
      <section className="login-story" aria-label={branding.appTitle}>
        <div className="login-atmosphere" aria-hidden="true">
          <span className="login-beam" />
          <span className="login-beam login-beam-second" />
        </div>
        <div className="login-brand">
          <BrandMark branding={branding} size="lg" />
          <span>
            {branding.appTitle}
            <small>{branding.name}</small>
          </span>
        </div>
        <div>
          <h1>{t('auth.intro')}</h1>
          <p>{t('auth.description')}</p>
        </div>
        <p className="login-local">{t('auth.local')}</p>
      </section>
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-card">
          <h2 id="login-title">
            {t(session ? 'auth.signedIn' : signup ? 'auth.createAccount' : 'auth.title')}
          </h2>
          <p className="login-note">{session?.user?.email || t('auth.shared')}</p>
          {!session && (
            <>
              <form onSubmit={(event) => void submit(event)} aria-busy={busy}>
                <fieldset disabled={busy}>
                  {signup && (
                    <label>
                      {t('auth.name')}
                      <input name="name" autoComplete="name" required maxLength={100} />
                    </label>
                  )}
                  <label>
                    {t('auth.email')}
                    <input
                      name="email"
                      type="email"
                      autoComplete="username"
                      required
                      maxLength={254}
                    />
                  </label>
                  <label>
                    {t('auth.password')}
                    <input
                      name="password"
                      type="password"
                      autoComplete={signup ? 'new-password' : 'current-password'}
                      required
                      minLength={signup ? 12 : 1}
                      maxLength={128}
                      aria-describedby={signup ? 'password-hint' : undefined}
                    />
                  </label>
                  {signup && (
                    <p id="password-hint" className="login-note">
                      {t('auth.passwordHint')}
                    </p>
                  )}
                  {error && (
                    <p role="alert" className="login-error">
                      {error}
                    </p>
                  )}
                  <button className="login-submit" type="submit">
                    {t(busy ? 'auth.working' : signup ? 'auth.createAccount' : 'auth.signIn')}
                    <ArrowRight size={18} aria-hidden="true" />
                  </button>
                </fieldset>
              </form>
              <button
                className="login-switch"
                disabled={busy}
                onClick={() => {
                  setSignup(!signup)
                  setError('')
                }}
              >
                {t(signup ? 'auth.haveAccount' : 'auth.newAccount')}
              </button>
            </>
          )}
          <a className={session ? 'login-submit' : 'login-offline'} href="#/home">
            {t('auth.offline')}
            <ArrowRight size={18} aria-hidden="true" />
          </a>
        </div>
      </section>
    </main>
  )
}
