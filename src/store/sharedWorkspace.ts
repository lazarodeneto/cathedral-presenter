import { useAppStore, whenBibleTextsSaved } from './useAppStore'
import { partializeWorkspace, mergeWorkspace } from './workspacePersistence'

export type WorkspaceStatus = 'loading' | 'saved' | 'saving' | 'offline' | 'conflict'
let status: WorkspaceStatus = 'loading', revision = 0, current = '', pending = '', applying = false, initialized = false, writing = false
const listeners = new Set<() => void>()
const headers = { 'X-Cathedral-Workspace': '1', 'Content-Type': 'application/json' }
function setStatus(value: WorkspaceStatus) { status = value; for (const listener of listeners) listener() }
export const workspaceStatus = () => status
export const onWorkspaceStatus = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
function snapshot() {
  const state = useAppStore.getState(), all = partializeWorkspace(state)
  // Navigation is local to each operator. Durable content and preferences are shared.
  const { activeServiceId: _a, selectedItemId: _b, selectedSlideId: _c, selectedElementId: _d, monitors: _m, lastSavedAt: _t, ...document } = all
  return JSON.stringify({ ...document, customBibles: state.customBibles })
}
function apply(document: unknown) {
  applying = true
  try {
    const state = useAppStore.getState()
    const merged = mergeWorkspace({ ...(document as object), activeServiceId: state.activeServiceId, selectedItemId: state.selectedItemId, selectedSlideId: state.selectedSlideId, selectedElementId: state.selectedElementId }, state)
    useAppStore.setState({ ...merged, live: state.live, timers: state.timers, testMonitorId: state.testMonitorId })
    current = snapshot()
  } finally { applying = false }
}
async function load() {
  const response = await fetch('/api/workspace', { headers, signal: AbortSignal.timeout(6000) })
  if (!response.ok) throw new Error('workspace-unavailable')
  return response.json() as Promise<{ revision: number; document: unknown }>
}
async function save() {
  if (writing || !pending || status === 'conflict') return
  writing = true; setStatus('saving')
  const document = pending; pending = ''
  try {
    const response = await fetch('/api/workspace', { method: 'PUT', headers, body: JSON.stringify({ expectedRevision: revision, document: JSON.parse(document) }), signal: AbortSignal.timeout(10000) })
    if (response.status === 409) { pending ||= document; setStatus('conflict'); return }
    if (!response.ok) throw new Error('workspace-save-failed')
    revision = (await response.json()).revision
    current = document; setStatus('saved')
  } catch { pending ||= document; setStatus('offline') }
  finally { writing = false }
  if (pending && status !== 'offline') void save()
}
export async function initializeSharedWorkspace() {
  if (initialized || import.meta.env.MODE === 'test') return
  initialized = true
  await whenBibleTextsSaved()
  current = snapshot()
  try {
    const stored = await load(); revision = stored.revision
    if (stored.document) {
      // Preserve the complete previous browser library before migration; never discard it silently.
      const previous = localStorage.getItem('cathedral:shared-workspace-migrated')
      if (!previous && current !== JSON.stringify(stored.document)) localStorage.setItem('cathedral:pre-shared-workspace', localStorage.getItem('church-presenter:workspace:v1') ?? current)
      apply(stored.document)
    } else if (!document.hidden) { pending = current; await save() }
    localStorage.setItem('cathedral:shared-workspace-migrated', '1')
    if (status !== 'offline' && status !== 'conflict') setStatus('saved')
  } catch { setStatus('offline') }
  let timer: ReturnType<typeof setTimeout>
  useAppStore.subscribe(() => {
    if (applying) return
    const next = snapshot()
    if (next === current || next === pending) return
    pending = next; clearTimeout(timer); timer = setTimeout(() => void save(), 600)
  })
  setInterval(() => {
    if (document.hidden || writing || status === 'conflict') return
    if (pending) { void save(); return }
    void load().then((stored) => { if (writing || pending) return; if (!stored.document && stored.revision === 0) { pending = snapshot(); void save(); return }; if (stored.revision !== revision) { if (useAppStore.getState().live) { setStatus('conflict'); return }; revision = stored.revision; if (stored.document) apply(stored.document) }; setStatus('saved') }).catch(() => setStatus('offline'))
  }, 2500)
}
export async function resolveWorkspaceConflict(choice: 'installation' | 'local') {
  const latest = await load(); revision = latest.revision
  if (choice === 'installation') { pending = ''; if (latest.document) apply(latest.document); setStatus('saved') }
  else { pending = snapshot(); setStatus('saving'); await save() }
}
export async function restoreWorkspaceRevision(target: number) {
  const response = await fetch(`/api/workspace/revisions/${target}`, { headers })
  if (!response.ok) throw new Error('workspace-unavailable')
  const old = await response.json(); if (!old.document) throw new Error('workspace-missing')
  apply(old.document); pending = snapshot(); await save()
}

if (import.meta.hot) import.meta.hot.accept(() => window.location.reload())
