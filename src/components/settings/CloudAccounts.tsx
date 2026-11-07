import { useEffect, useState } from 'react'
import { Copy, MailPlus, ShieldCheck, UserRound, UserRoundX } from 'lucide-react'
import { authClient } from '../../auth/client'
import { useT } from '../../i18n/useT'
import { useToasts } from '../../store/useToasts'
interface CloudUser { id: string; name: string; email: string; role: string }
export function CloudAccounts() {
  const { data: session } = authClient.useSession(), t = useT(), push = useToasts((s) => s.push)
  const [users, setUsers] = useState<CloudUser[]>([]), [email, setEmail] = useState(''), [role, setRole] = useState('operator'), [link, setLink] = useState(''), [busy, setBusy] = useState(false)
  const admin = (session?.user as { role?: string } | undefined)?.role === 'admin'
  useEffect(() => {
    if (!admin) return
    let active = true
    void fetch('/api/admin/users').then((r) => r.ok ? r.json() : Promise.reject()).then((data) => { if (active) setUsers(data.users ?? []) }).catch(() => { if (active) push(t('cloud.failed'), 'error') })
    return () => { active = false }
  }, [admin, push, t])
  if (!admin) return null
  return <section className="cloud-settings-section" aria-label={t('cloud.accounts')}>
    <h3><ShieldCheck size={18} aria-hidden="true" />{t('cloud.accounts')}</h3>
    <form className="cloud-invitation-form" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setLink('')
      try {
        const response = await fetch('/api/admin/invitations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, role }) })
        const result = await response.json(); if (!response.ok || !result.url) throw new Error()
        setLink(result.url); setEmail(''); push(t('cloud.inviteCreated'), 'success')
      } catch { push(t('cloud.failed'), 'error') } finally { setBusy(false) }
    }}>
      <label className="field"><span>{t('auth.email')}</span><input type="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" /></label>
      <label className="field"><span>{t('cloud.role')}</span><select value={role} onChange={(e) => setRole(e.target.value)}><option value="operator">{t('cloud.operator')}</option><option value="admin">{t('cloud.admin')}</option></select></label>
      <button className="btn btn-secondary" disabled={busy}><MailPlus size={16} aria-hidden="true" />{t('cloud.invite')}</button>
    </form>
    {link && <label className="field"><span>{t('cloud.inviteLink')}</span><div className="cloud-copy-row"><input value={link} readOnly onFocus={(e) => e.target.select()} /><button className="icon-btn" aria-label={t('common.copy')} onClick={() => void navigator.clipboard.writeText(link).catch(() => push(t('cloud.failed'), 'error'))}><Copy size={16} /></button></div></label>}
    <ul className="cloud-account-list">{users.map((user) => <li key={user.id}><UserRound size={18} aria-hidden="true" /><div><strong>{user.name}</strong><span>{user.email}</span><small>{t(user.role === 'admin' ? 'cloud.admin' : user.role === 'disabled' ? 'cloud.disabled' : 'cloud.operator')}</small></div>{user.id !== session?.user.id && user.role !== 'disabled' && <button className="btn btn-ghost btn-sm" disabled={busy} onClick={async () => {
      setBusy(true)
      try { const response = await fetch(`/api/admin/users/${user.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'disabled' }) }); if (!response.ok) throw new Error(); setUsers((rows) => rows.map((u) => u.id === user.id ? { ...u, role: 'disabled' } : u)) } catch { push(t('cloud.failed'), 'error') } finally { setBusy(false) }
    }}><UserRoundX size={15} />{t('cloud.revoke')}</button>}</li>)}</ul>
  </section>
}
