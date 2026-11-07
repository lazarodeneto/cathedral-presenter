import { AppName } from '../components/AppName'
import { LanguageMenu } from '../components/LanguageMenu'
import { LoginCross } from '../components/LoginCross'
import { useState, type FormEvent } from 'react'
import { BrandMark } from '../components/BrandMark'
import { type Branding, type Locale } from '../types'
import { authStrings } from '../i18n/authStrings'
import { authClient } from '../auth/client'
import { cloudStrings } from '../i18n/cloudStrings'

export function LoginScreen({
  branding,
  locale,
  onLocaleChange,
  reducedMotion = false,
  cloud = false,
  cloudReady = true,
  emailReady = false,
}: {
  branding: Branding
  locale: Locale
  onLocaleChange?: (locale: Locale) => void
  reducedMotion?: boolean
  cloud?: boolean
  cloudReady?: boolean
  emailReady?: boolean
}) {
  const t = (key: string) => cloudStrings[locale][key] ?? authStrings[locale][key] ?? authStrings.en[key] ?? key
  const query = new URLSearchParams(window.location.hash.split('?')[1])
  const invitation = query.get('invite') ?? ''
  const resetToken = new URL(window.location.href).searchParams.get('token') ?? query.get('token') ?? ''
  const [recovery, setRecovery] = useState<'forgot' | 'reset' | null>(() => cloud && (resetToken || query.get('mode') === 'reset') ? 'reset' : null)
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
      if (cloud && recovery === 'forgot') {
        if (!emailReady) { setError(t('cloud.noEmail')); return }
        await authClient.requestPasswordReset({ email, redirectTo: `${window.location.origin}/#/login?mode=reset` })
        setError(t('cloud.resetSent')); return
      }
      if (cloud && recovery === 'reset') {
        const reset = await authClient.resetPassword({ newPassword: password, token: resetToken })
        if (reset.error) { setError(t('auth.error')); return }
        setRecovery(null); setSignup(false); setError(t('cloud.passwordChanged')); window.history.replaceState(null, '', '/#/login'); return
      }
      const result = signup
        ? await authClient.signUp.email({
            email,
            password,
            name: String(values.get('name')).trim(),
          }, cloud ? { headers: { 'X-Cathedral-Invitation': invitation } } : undefined)
        : await authClient.signIn.email({ email, password })
      if (result.error) {
        setError(t(signup ? 'auth.signupFailed' : 'auth.invalidCredentials'))
        return
      }
      form.reset()
      if (cloud && signup && !(await authClient.getSession()).data) { setSignup(false); setError(t('cloud.verifyEmail')); return }
      const returnTo = sessionStorage.getItem('cathedral:after-login')
      sessionStorage.removeItem('cathedral:after-login')
      window.location.hash = returnTo && /^\/(?:service\/[A-Za-z0-9_-]+|media|settings(?:\/[a-z-]+)?)$/.test(returnTo) ? returnTo : '/home'
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
            <h1 id="login-title"><AppName maxSize={112} /></h1>
          </div>
          <h2 className="login-mode">
            {t(session ? 'auth.signedIn' : recovery === 'forgot' ? 'cloud.forgot' : recovery === 'reset' ? 'cloud.resetPassword' : signup ? 'auth.createAccount' : 'auth.signIn')}
          </h2>
          {session && <p className="login-note">{session.user?.email}</p>}
          {!session && (
            <>
              <form onSubmit={(event) => void submit(event)} aria-busy={busy}>
                <fieldset disabled={busy || !cloudReady}>
                  {signup && !recovery && (
                    <label>
                      {t('auth.name')}
                      <input name="name" autoComplete="name" required maxLength={100} />
                    </label>
                  )}
                  {recovery !== 'reset' && <label>
                    {t('auth.email')}
                    <input
                      name="email"
                      type="email"
                      autoComplete="username"
                      required
                      maxLength={254}
                    />
                  </label>}
                  {recovery !== 'forgot' && <label>
                    {t(recovery === 'reset' ? 'cloud.newPassword' : 'auth.password')}
                    <input
                      name="password"
                      type="password"
                      autoComplete={signup || recovery === 'reset' ? 'new-password' : 'current-password'}
                      required
                      minLength={signup || recovery === 'reset' ? 12 : 1}
                      maxLength={128}
                      aria-describedby={signup ? 'password-hint' : undefined}
                    />
                  </label>}
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
                    {t(busy ? 'auth.working' : recovery === 'forgot' ? 'cloud.sendReset' : recovery === 'reset' ? 'cloud.resetPassword' : signup ? 'auth.createAccount' : 'auth.signIn')}
                  </button>
                </fieldset>
              </form>
              {(!cloud || invitation || recovery) && <button
                className="login-switch"
                disabled={busy}
                onClick={() => {
                  if (recovery) { setRecovery(null); setSignup(false) } else setSignup(!signup)
                  setError('')
                }}
              >
                {t(recovery ? 'cloud.backToLogin' : signup ? 'auth.haveAccount' : 'auth.newAccount')}
              </button>}
              {cloud && !recovery && !signup && <button className="login-switch" disabled={busy} onClick={() => { setRecovery('forgot'); setError('') }}>{t('cloud.forgot')}</button>}
              {cloud && !invitation && !recovery && <p className="login-note">{t('cloud.invitationOnly')}</p>}
            </>
          )}
          {cloud && !cloudReady && <p className="login-note" role="alert">{t('cloud.unavailable')}</p>}
          {(!cloud || session) && <a className={session ? 'login-submit' : 'login-offline'} href="#/home">
            {t(cloud ? 'cloud.online' : 'auth.offline')}
          </a>}
        </div>
      </section>
    </main>
  )
}
