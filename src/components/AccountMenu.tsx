import { useEffect, useRef, useState } from 'react'
import { BrandMark } from './BrandMark'
import { authClient } from '../auth/client'
import { useAppStore } from '../store/useAppStore'
import { useT } from '../i18n/useT'
import { navigate } from '../hooks/useHashRoute'

export function AccountMenu() {
  const t = useT()
  const branding = useAppStore((state) => state.branding)
  const { data: session, isPending } = authClient.useSession()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    root.current?.querySelector<HTMLButtonElement>('.account-popover button')?.focus()
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  async function logout() {
    setBusy(true)
    setError(false)
    try {
      const result = await authClient.signOut()
      if (result.error) {
        setError(true)
        return
      }
      setOpen(false)
      navigate('/login')
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }
  function go(path: string) {
    setOpen(false)
    navigate(path)
  }
  return (
    <div
      className="account-menu"
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.key === 'Escape') {
          setOpen(false)
          trigger.current?.focus()
        }
      }}
    >
      <button
        ref={trigger}
        className="avatar"
        onClick={() => setOpen(!open)}
        aria-label={t('auth.account')}
        aria-expanded={open}
        aria-controls={open ? 'account-popover' : undefined}
      >
        <BrandMark branding={branding} size="sm" />
      </button>
      {open && (
        <div
          id="account-popover"
          className="account-popover"
          role="region"
          aria-label={t('auth.account')}
        >
          <strong>{session?.user?.name || t('auth.localAccount')}</strong>
          <p>{session?.user?.email || t('auth.local')}</p>
          <button onClick={() => go('/settings')}>{t('nav.settings')}</button>
          {!session && (
            <>
              <button disabled={isPending} onClick={() => go('/login')}>
                {t('auth.signIn')}
              </button>
              <button disabled={isPending} onClick={() => go('/login?mode=signup')}>
                {t('auth.createAccount')}
              </button>
            </>
          )}
          {session && (
            <button disabled={busy} onClick={() => void logout()}>
              {t(busy ? 'auth.working' : 'auth.signOut')}
            </button>
          )}
          {error && <p role="alert">{t('auth.error')}</p>}
        </div>
      )}
    </div>
  )
}
