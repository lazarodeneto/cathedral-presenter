import { useCallback, useEffect, useState } from 'react'
import { Cloud, Download, Link2, Unplug, Upload } from 'lucide-react'
import { useT } from '../../i18n/useT'
import { useToasts } from '../../store/useToasts'
import { isCloud, DEFAULT_CLOUD_ORIGIN } from '../../runtime'
import { ConfirmDialog } from '../Modal'
type Status = { connected: boolean; online: boolean; name?: string; blocked: boolean; origin: string; error?: string; syncBusy?: boolean; syncEnabled?: boolean; syncConflict?: boolean; syncError?: string }
function syncErrorKey(reason?: string) {
  if (reason === 'stop-live-before-sync') return 'workspace.stopLive'
  if (reason === 'workspace-conflict') return 'cloud.syncConflict'
  if (reason === 'media-id-conflict') return 'cloud.syncMediaConflict'
  if (reason === 'media-missing') return 'cloud.syncMediaMissing'
  if (reason === 'virus-detected') return 'storage.virusDetected'
  return 'cloud.syncUnavailable'
}
export async function nativeCloudAction(path: string, body?: object) {
  const response = await fetch(`/api/cloud/${path}`, { method: 'POST', headers: { 'X-Cathedral-Cloud': '1', 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}), signal: AbortSignal.timeout(1200000) })
  const data = await response.json(); if (!response.ok) throw new Error(data.reason); return data
}
export function NativeCloudSettings() {
  const t = useT(), push = useToasts((s) => s.push), [status, setStatus] = useState<Status | null>(null), [code, setCode] = useState(''), [busy, setBusy] = useState(false), [confirmConnect, setConfirmConnect] = useState(false), [confirmSync, setConfirmSync] = useState<'upload' | 'download' | null>(null)
  const refresh = useCallback(() => { void fetch('/api/cloud/status', { headers: { 'X-Cathedral-Cloud': '1' } }).then((r) => r.ok ? r.json() : null).then(setStatus).catch(() => {}) }, [])
  useEffect(() => { refresh(); const timer = setInterval(refresh, 5000); return () => clearInterval(timer) }, [refresh])
  if (isCloud) return null
  const run = async (path: string, body?: { direction?: 'upload' | 'download'; authorized?: boolean; code?: string }) => { setBusy(true); try { const result = await nativeCloudAction(path, body); refresh(); if (path === 'sync') { push(t('cloud.synced'), 'success'); if (body?.direction === 'download') setTimeout(() => window.location.reload(), 1500) } return result } catch (error) { push(t(path === 'sync' ? syncErrorKey(error instanceof Error ? error.message : undefined) : 'cloud.failed'), 'error') } finally { setBusy(false) } }
  return <section className="cloud-settings-section"><h3><Cloud size={18} />{t('cloud.online')}</h3>
    <a href={status?.origin || DEFAULT_CLOUD_ORIGIN} target="_blank" rel="noreferrer">{status?.origin || DEFAULT_CLOUD_ORIGIN}</a>
    <p className="field-hint">{t('cloud.nativeInstructions')}</p>
    {status?.connected ? <><p>{status.name} · {t(status.online ? 'cloud.connected' : 'cloud.notConnected')}</p><div className="output-actions"><button className="btn btn-secondary" disabled={busy || status.syncBusy} onClick={() => setConfirmSync('download')}><Download size={16} />{t('cloud.downloadWorkspace')}</button><button className="btn btn-secondary" disabled={busy || status.syncBusy} onClick={() => setConfirmSync('upload')}><Upload size={16} />{t('cloud.uploadWorkspace')}</button><button className="btn btn-ghost" disabled={busy || status.syncBusy} onClick={() => void run('disconnect')}><Unplug size={16} />{t('cloud.disconnect')}</button></div><p className="field-hint">{t(status.syncEnabled ? 'cloud.syncAutomatic' : 'cloud.syncChoose')}</p>{status.syncConflict && <p className="inline-warning" role="alert">{t('cloud.syncConflict')}</p>}{!status.syncConflict && status.syncError && <p className="inline-warning" role="status">{t(syncErrorKey(status.syncError))}</p>}</> : <form className="cloud-invitation-form" onSubmit={(e) => { e.preventDefault(); setConfirmConnect(true) }}><label className="field"><span>{t('cloud.pairCode')}</span><input value={code} autoComplete="off" onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={16} required placeholder="XXXX-XXXX-XXXX" /></label><button className="btn btn-secondary" disabled={busy}><Link2 size={16} />{t('cloud.connect')}</button></form>}
    <ConfirmDialog open={confirmConnect} title={t('cloud.permissionTitle')} copy={t('cloud.permissionCopy')} confirmLabel={t('cloud.permissionAllow')} tone="primary" onClose={() => setConfirmConnect(false)} onConfirm={() => void run('connect', { code, authorized: true })} />
    <ConfirmDialog open={Boolean(confirmSync)} title={t(confirmSync === 'upload' ? 'cloud.uploadWorkspace' : 'cloud.downloadWorkspace')} copy={t(confirmSync === 'upload' ? 'cloud.syncUploadConfirm' : 'cloud.syncDownloadConfirm')} confirmLabel={t('cloud.sync')} tone="primary" onClose={() => setConfirmSync(null)} onConfirm={() => { if (confirmSync) void run('sync', { direction: confirmSync, authorized: true }) }} />
  </section>
}
export function NativeCloudSafety() {
  const t = useT(), [status, setStatus] = useState<Status | null>(null), [busy, setBusy] = useState(false)
  useEffect(() => { if (isCloud || !window.cathedralDesktop) return; let active = true; const check = () => { void fetch('/api/cloud/status', { headers: { 'X-Cathedral-Cloud': '1' } }).then((r) => r.ok ? r.json() : null).then((data) => { if (active) setStatus(data) }).catch(() => {}) }; check(); const timer = setInterval(check, 3000); return () => { active = false; clearInterval(timer) } }, [])
  if (!status?.connected) return null
  return <div className="native-cloud-safety"><Cloud size={16} /><span>{status.name} · {t(status.online ? 'cloud.connected' : 'cloud.notConnected')}</span><button className="btn btn-secondary btn-sm" disabled={busy} onClick={async () => { setBusy(true); try { setStatus(await nativeCloudAction(status.blocked ? 'resume' : 'black')) } finally { setBusy(false) } }}>{t(status.blocked ? 'cloud.resume' : 'cloud.black')}</button></div>
}
