import { LanguageMenu } from '../components/LanguageMenu'
import { LoginCross } from '../components/LoginCross'
import { useState, type FormEvent } from 'react'
import { BrandMark } from '../components/BrandMark'
import { type Branding, type Locale } from '../types'
import { authStrings } from '../i18n/authStrings'
import { authClient } from '../auth/client'

export function LoginScreen({
  branding,
  locale,
  onLocaleChange,
  reducedMotion = false,
}: {
  branding: Branding
  locale: Locale
  onLocaleChange?: (locale: Locale) => void
  reducedMotion?: boolean
}) {
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
      <div className="login-language">
        <LanguageMenu
          locale={locale}
          onChange={(value) => onLocaleChange?.(value)}
          label={t('auth.language')}
        />
      </div>
      <div className="login-story" aria-hidden="true">
        <LoginCross reducedMotion={reducedMotion} />
      </div>
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-card">
          <div className="login-brand">
            <BrandMark branding={branding} size="lg" />
            <h1 id="login-title">Cathedral Presenter</h1>
          </div>
          <h2 className="login-mode">
            {t(session ? 'auth.signedIn' : signup ? 'auth.createAccount' : 'auth.signIn')}
          </h2>
          {session && <p className="login-note">{session.user?.email}</p>}
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
          </a>
        </div>
      </section>
    </main>
  )
}
