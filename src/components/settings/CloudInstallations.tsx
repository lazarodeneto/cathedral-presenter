import { useCallback, useEffect, useState } from 'react'
import { Monitor, Link2, RefreshCw, Unplug, Copy } from 'lucide-react'
import { authClient } from '../../auth/client'
import { useT } from '../../i18n/useT'
import { useToasts } from '../../store/useToasts'
import { COMPUTER_KEY, selectCloudComputer } from '../../providers/output/CloudOutputRelay'
import { DesktopDownloads } from '../DesktopDownloads'
type Computer = { id: string; name: string; connected: boolean; platform: string; revoked: boolean; expiresAt: string; canScan: boolean }
export function CloudInstallations() {
  const t = useT(), push = useToasts((s) => s.push), { data: session } = authClient.useSession()
  const admin = (session?.user as { role?: string })?.role === 'admin'
  const [rows, setRows] = useState<Computer[]>([]), [chosen, setChosen] = useState(() => localStorage.getItem(COMPUTER_KEY) || ''), [name, setName] = useState(''), [scan, setScan] = useState(true), [code, setCode] = useState(''), [expires, setExpires] = useState(''), [busy, setBusy] = useState(false)
  const refresh = useCallback(async () => { try { const r = await fetch('/api/installations'); if (!r.ok) throw new Error(); const data = await r.json(); setRows(data.installations || []) } catch { push(t('cloud.failed'), 'error') } }, [push,t])
  useEffect(() => { void refresh(); const timer = setInterval(() => void refresh(), 15000); return () => clearInterval(timer) }, [refresh])
  return <section className="cloud-settings-section">
    <h3><Monitor size={18} />{t('cloud.computers')}</h3>
    <p className="field-hint">{t('cloud.downloadApp')}</p>
    <DesktopDownloads />
    <label className="field"><span>{t('cloud.outputComputer')}</span><select value={chosen} onChange={(e) => { setChosen(e.target.value); selectCloudComputer(e.target.value) }}><option value="">{t('cloud.chooseComputer')}</option>{rows.filter((c) => !c.revoked).map((c) => <option key={c.id} value={c.id}>{c.name} · {c.platform === 'darwin' ? 'macOS' : c.platform === 'win32' ? 'Windows' : 'Linux'} · {t(c.connected ? 'cloud.connected' : 'cloud.notConnected')}</option>)}</select></label>
    <button className="btn btn-ghost btn-sm" onClick={() => void refresh()}><RefreshCw size={14} />{t('hardware.refresh')}</button>
    {admin && <><form className="cloud-invitation-form" onSubmit={async (event) => { event.preventDefault(); setBusy(true); setCode(''); try { const response = await fetch('/api/installations/pair', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, canScan: scan }) }); const data = await response.json(); if (!response.ok) throw new Error(); setCode(data.code); setExpires(data.expiresAt) } catch { push(t('cloud.failed'), 'error') } finally { setBusy(false) } }}>
      <label className="field"><span>{t('cloud.computerName')}</span><input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required /></label>
      <label className="checkbox-row"><input type="checkbox" checked={scan} onChange={(e) => setScan(e.target.checked)} />{t('cloud.scanOnComputer')}</label>
      <button className="btn btn-secondary" disabled={busy}><Link2 size={16} />{t('cloud.pair')}</button>
    </form>{code && <div className="cloud-pair-code" role="status"><strong>{code}</strong><button className="icon-btn" aria-label={t('common.copy')} onClick={() => void navigator.clipboard.writeText(code)}><Copy size={16} /></button><p>{t('cloud.codeInstructions')} · {new Date(expires).toLocaleTimeString()}</p></div>}
    <ul className="cloud-account-list">{rows.filter((c) => !c.revoked).map((c) => <li key={c.id}><Monitor size={18} /><div><strong>{c.name}</strong><span>{t(c.connected ? 'cloud.connected' : 'cloud.notConnected')}</span></div><button className="btn btn-ghost btn-sm" disabled={busy} onClick={async () => { setBusy(true); try { const r = await fetch(`/api/installations/${c.id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } }); if (!r.ok) throw new Error(); await refresh() } catch { push(t('cloud.failed'), 'error') } finally { setBusy(false) } }}><Unplug size={14} />{t('cloud.revoke')}</button></li>)}</ul></>}
  </section>
}
