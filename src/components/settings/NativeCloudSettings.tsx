import { useCallback, useEffect, useState } from 'react'
import { Cloud, Download, Link2, Unplug } from 'lucide-react'
import { useT } from '../../i18n/useT'
import { useToasts } from '../../store/useToasts'
import { isCloud, DEFAULT_CLOUD_ORIGIN } from '../../runtime'
type Status = { connected: boolean; online: boolean; name?: string; blocked: boolean; origin: string; error?: string; syncBusy?: boolean }
export async function nativeCloudAction(path: string, body?: object) {
  const response = await fetch(`/api/cloud/${path}`, { method: 'POST', headers: { 'X-Cathedral-Cloud': '1', 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}), signal: AbortSignal.timeout(600000) })
  const data = await response.json(); if (!response.ok) throw new Error(data.reason); return data
}
export function NativeCloudSettings() {
  const t = useT(), push = useToasts((s) => s.push), [status, setStatus] = useState<Status | null>(null), [code, setCode] = useState(''), [busy, setBusy] = useState(false)
  const refresh = useCallback(() => { void fetch('/api/cloud/status', { headers: { 'X-Cathedral-Cloud': '1' } }).then((r) => r.ok ? r.json() : null).then(setStatus).catch(() => {}) }, [])
  useEffect(() => { refresh(); const timer = setInterval(refresh, 5000); return () => clearInterval(timer) }, [refresh])
  if (isCloud) return null
  const run = async (path: string, body?: object) => { setBusy(true); try { const result = await nativeCloudAction(path, body); refresh(); if (path === 'sync') { push(t('cloud.synced'), 'success'); setTimeout(() => window.location.reload(), 1500) } return result } catch (error) { push(t(error instanceof Error && error.message === 'stop-live-before-sync' ? 'workspace.stopLive' : 'cloud.failed'), 'error') } finally { setBusy(false) } }
  return <section className="cloud-settings-section"><h3><Cloud size={18} />{t('cloud.online')}</h3>
    <a href={status?.origin || DEFAULT_CLOUD_ORIGIN} target="_blank" rel="noreferrer">{status?.origin || DEFAULT_CLOUD_ORIGIN}</a>
    <p className="field-hint">{t('cloud.nativeInstructions')}</p>
    {status?.connected ? <><p>{status.name} · {t(status.online ? 'cloud.connected' : 'cloud.notConnected')}</p><div className="output-actions"><button className="btn btn-secondary" disabled={busy} onClick={() => void run('sync', { direction: 'download' })}><Download size={16} />{t('cloud.downloadWorkspace')}</button><button className="btn btn-ghost" disabled={busy} onClick={() => void run('disconnect')}><Unplug size={16} />{t('cloud.disconnect')}</button></div><p className="field-hint">{t('cloud.syncHelp')}</p></> : <form className="cloud-invitation-form" onSubmit={(e) => { e.preventDefault(); void run('connect', { code }) }}><label className="field"><span>{t('cloud.pairCode')}</span><input value={code} autoComplete="off" onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={16} required placeholder="XXXX-XXXX-XXXX" /></label><button className="btn btn-secondary" disabled={busy}><Link2 size={16} />{t('cloud.connect')}</button></form>}
  </section>
}
export function NativeCloudSafety() {
  const t = useT(), [status, setStatus] = useState<Status | null>(null), [busy, setBusy] = useState(false)
  useEffect(() => { if (isCloud || !window.cathedralDesktop) return; let active = true; const check = () => { void fetch('/api/cloud/status', { headers: { 'X-Cathedral-Cloud': '1' } }).then((r) => r.ok ? r.json() : null).then((data) => { if (active) setStatus(data) }).catch(() => {}) }; check(); const timer = setInterval(check, 3000); return () => { active = false; clearInterval(timer) } }, [])
  if (!status?.connected) return null
  return <div className="native-cloud-safety"><Cloud size={16} /><span>{status.name} · {t(status.online ? 'cloud.connected' : 'cloud.notConnected')}</span><button className="btn btn-secondary btn-sm" disabled={busy} onClick={async () => { setBusy(true); try { setStatus(await nativeCloudAction(status.blocked ? 'resume' : 'black')) } finally { setBusy(false) } }}>{t(status.blocked ? 'cloud.resume' : 'cloud.black')}</button></div>
}
