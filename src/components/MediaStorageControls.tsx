import { useEffect, useState } from 'react'
import { Cloud, HardDrive, Link2, RefreshCw, ShieldCheck, ShieldAlert } from 'lucide-react'
import { authClient } from '../auth/client'
import { useT } from '../i18n/useT'
import { navigate } from '../hooks/useHashRoute'
import { syncMediaLibrary } from '../providers/media/library'
import { useToasts } from '../store/useToasts'

interface StorageStatus { scanner: { ready: boolean }; drive: { configured: boolean; connected: boolean; canManage: boolean; redirectUri?: string } }
export function MediaStorageControls({ storage, onStorageChange, uploading }: { storage: 'local' | 'drive'; onStorageChange(value: 'local' | 'drive'): void; uploading: boolean }) {
  const t = useT(), push = useToasts((state) => state.push)
  const { data: session } = authClient.useSession()
  const [status, setStatus] = useState<StorageStatus | null>(null)
  const [reason, setReason] = useState('')
  const [clientId, setClientId] = useState(''), [clientSecret, setClientSecret] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    const refresh = () => { void fetch('/api/media/status').then(async (response) => {
      const data = await response.json()
      if (!active) return
      if (!response.ok) { setReason(data.reason ?? 'media-service-unavailable'); return }
      setStatus(data); setReason('')
      await syncMediaLibrary()
    }).catch(() => { if (active) setReason('media-service-unavailable') }) }
    refresh(); window.addEventListener('focus', refresh)
    return () => { active = false; window.removeEventListener('focus', refresh) }
  }, [session?.user.id])
  const connect = async () => {
    setBusy(true)
    try {
      if (window.cathedralDesktop?.openMediaBrowser) {
        await window.cathedralDesktop.openMediaBrowser()
        push(t('storage.inBrowser'), 'info'); setBusy(false); return
      }
      const response = await fetch('/api/media/drive/connect', { method: 'POST', headers: { 'X-Cathedral-Media': '1' } })
      const data = await response.json() as { url?: string; reason?: string }
      if (!response.ok || !data.url || new URL(data.url).origin !== 'https://accounts.google.com') throw new Error(data.reason)
      window.location.assign(data.url)
    } catch { push(t('storage.cloudSetup'), 'error'); setBusy(false) }
  }
  return <section className="media-storage" aria-label={t('storage.title')}>
    <label className="media-storage-destination">
      {storage === 'local' ? <HardDrive size={17} aria-hidden="true" /> : <Cloud size={17} aria-hidden="true" />}
      <span>{t('storage.title')}</span>
      <select value={storage} onChange={(event) => onStorageChange(event.target.value as 'local' | 'drive')} disabled={uploading}>
        <option value="local">{t('storage.local')}</option>
        <option value="drive" disabled={!status?.drive.connected}>{t('storage.drive')}</option>
      </select>
    </label>
    <span className={`media-storage-protection ${status?.scanner.ready ? 'is-ready' : ''}`} role="status">
      {status?.scanner.ready ? <ShieldCheck size={16} aria-hidden="true" /> : <ShieldAlert size={16} aria-hidden="true" />}
      {t(uploading ? 'storage.scanning' : status?.scanner.ready ? 'storage.protected' : reason === 'sign-in-required' ? 'storage.signIn' : status ? 'storage.scannerUnavailable' : 'storage.checking')}
    </span>
    {reason === 'sign-in-required' ? <button className="btn btn-secondary btn-sm" onClick={() => { sessionStorage.setItem('cathedral:after-login', window.location.hash.slice(1)); navigate('/login') }}>{t('auth.signIn')}</button> : status?.drive.connected ? <button className="btn btn-secondary btn-sm" disabled={busy || uploading} onClick={async () => {
      setBusy(true); try { await syncMediaLibrary(true); push(t('storage.synced'), 'success') } catch { push(t('storage.failed'), 'error') } finally { setBusy(false) }
    }}><RefreshCw size={14} aria-hidden="true" />{t('storage.syncDrive')}</button> : <button className="btn btn-secondary btn-sm" disabled={busy || uploading || !status?.drive.configured || !status.drive.canManage} title={t('storage.cloudSetup')} onClick={() => void connect()}><Link2 size={14} aria-hidden="true" />{t('storage.connectDrive')}</button>}
    {status && !status.drive.configured && <p className="media-storage-hint">{t('storage.cloudSetup')}</p>}
    {status?.drive.canManage && !status.drive.configured && <details className="drive-client-setup"><summary>{t('storage.configureDrive')}</summary><form className="form-stack" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true)
      try {
        const response = await fetch('/api/media/drive/config', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Cathedral-Media': '1' }, body: JSON.stringify({ clientId, clientSecret }) })
        if (!response.ok) throw new Error('configuration-failed')
        setClientSecret(''); setStatus({ ...status, drive: { ...status.drive, configured: true } })
      } catch { push(t('storage.failed'), 'error') } finally { setBusy(false) }
    }}><label className="field"><span>{t('storage.clientId')}</span><input value={clientId} onChange={(e) => setClientId(e.target.value)} autoComplete="off" required maxLength={255} /></label><label className="field"><span>{t('storage.clientSecret')}</span><input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} autoComplete="new-password" required maxLength={256} /></label><label className="field"><span>{t('storage.redirectUri')}</span><input readOnly value={status.drive.redirectUri ?? ''} onFocus={(e) => e.target.select()} /></label><button className="btn btn-secondary" disabled={busy}>{t('common.save')}</button></form></details>}

    {reason && reason !== 'sign-in-required' && <p className="media-storage-hint" role="alert">{t('storage.failed')}</p>}
  </section>
}
