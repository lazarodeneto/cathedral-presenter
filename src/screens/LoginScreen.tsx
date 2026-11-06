import { useState, type FormEvent } from 'react'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import { BrandMark } from '../components/BrandMark'
import { useAppStore } from '../store/useAppStore'
import { useT } from '../i18n/useT'
import { navigate } from '../hooks/useHashRoute'

export function LoginScreen() {
  const t = useT()
  const branding = useAppStore((state) => state.branding)
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState(false)
  function submit(event: FormEvent) {
    event.preventDefault()
    setMessage(true)
  }
  return (
    <main className="login-page">
      <section className="login-story" aria-label={branding.appTitle}>
        <div className="login-atmosphere" aria-hidden="true"><span className="login-beam" /><span className="login-beam login-beam-second" /></div>
        <div className="login-brand"><BrandMark branding={branding} size="lg" /><span>{branding.appTitle}</span></div>
        <div><p className="login-eyebrow">{branding.name}</p><h1>{t('auth.intro')}</h1><p>{t('auth.description')}</p></div>
        <p className="login-local">{t('auth.local')}</p>
      </section>
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-card">
          <h2 id="login-title">{t('auth.title')}</h2>
          <p className="login-note">{t('auth.note')}</p>
          <form onSubmit={submit}>
            <label htmlFor="login-email">{t('auth.email')}</label>
            <input id="login-email" name="email" type="email" autoComplete="username" required />
            <label htmlFor="login-password">{t('auth.password')}</label>
            <div className="login-password"><input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required /><button type="button" aria-label={t(showPassword ? 'auth.hide' : 'auth.show')} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
            {message && <p role="status" className="login-note">{t('auth.unavailable')}</p>}
            <button className="login-submit" type="submit">{t('auth.signIn')}<ArrowRight size={18} /></button>
          </form>
          <button className="login-offline" onClick={() => navigate('/home')}>{t('auth.offline')}<ArrowRight size={16} /></button>
        </div>
      </section>
    </main>
  )
}
