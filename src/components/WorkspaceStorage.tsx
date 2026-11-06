import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { initializeSharedWorkspace, workspaceStatus, onWorkspaceStatus, resolveWorkspaceConflict, restoreWorkspaceRevision } from '../store/sharedWorkspace'
import { useT } from '../i18n/useT'
import { useAppStore } from '../store/useAppStore'
import { useToasts } from '../store/useToasts'

export function WorkspaceGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(import.meta.env.MODE === 'test' || window.location.hash.startsWith('#/output/'))
  const t = useT()
  useEffect(() => { if (!ready) void initializeSharedWorkspace().finally(() => setReady(true)) }, [ready])
  return ready ? children : <div className="route-loading" role="status">{t('workspace.loading')}</div>
}
export function WorkspaceNotice() {
  const status = useSyncExternalStore(onWorkspaceStatus, workspaceStatus)
  const live = useAppStore((s) => Boolean(s.live)), t = useT(), push = useToasts((s) => s.push)
  if (status !== 'offline' && status !== 'conflict') return null
  return <aside className="workspace-notice" role="status"><span>{t(`workspace.${status}`)}</span>{status === 'conflict' && <div>{(['installation', 'local'] as const).map((choice) => <button key={choice} className="btn btn-secondary btn-sm" disabled={live} onClick={() => void resolveWorkspaceConflict(choice).catch(() => push(t('workspace.failed'), 'error'))}>{t(`workspace.${choice}`)}</button>)}</div>}</aside>
}
export function WorkspaceRecovery() {
  const [rows, setRows] = useState<{ revision: number; createdAt: string }[]>([]), [busy, setBusy] = useState(false)
  const t = useT(), live = useAppStore((s) => Boolean(s.live)), push = useToasts((s) => s.push)
  const refresh = () => { void fetch('/api/workspace/history', { headers: { 'X-Cathedral-Workspace': '1' } }).then((r) => r.json()).then((data) => setRows(data.revisions ?? [])).catch(() => {}) }
  return <details className="workspace-recovery" onToggle={(e) => { if (e.currentTarget.open) refresh() }}><summary>{t('workspace.history')}</summary><ul>{rows.map((row) => <li key={row.revision}><time dateTime={row.createdAt}>{new Date(row.createdAt).toLocaleString()}</time><button className="btn btn-secondary btn-sm" disabled={live || busy} onClick={async () => { setBusy(true); try { await restoreWorkspaceRevision(row.revision); refresh() } catch { push(t('workspace.failed'), 'error') } finally { setBusy(false) } }}>{t('workspace.restore')}</button></li>)}</ul></details>
}
