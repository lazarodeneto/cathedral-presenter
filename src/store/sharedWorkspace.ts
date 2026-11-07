import { useAppStore, whenBibleTextsSaved } from './useAppStore'
import { partializeWorkspace, mergeWorkspace } from './workspacePersistence'
import { loadWorkspaceDocument, saveWorkspaceDocument } from './cloudTransfer'
import { isCloud } from '../runtime'
import { preferredLocale } from '../i18n/preferredLocale'

export type WorkspaceStatus = 'loading' | 'saved' | 'saving' | 'offline' | 'conflict'
let status: WorkspaceStatus = 'loading', revision = 0, current = '', pending = '', applying = false, initialized = false, initializationComplete = false, writing = false
const listeners = new Set<() => void>()
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
    useAppStore.setState({ ...merged, settings: { ...merged.settings, locale: preferredLocale() ?? state.settings.locale }, live: state.live, timers: state.timers, testMonitorId: state.testMonitorId })
    current = snapshot()
  } finally { applying = false }
}
async function load() {
  return loadWorkspaceDocument(`/api/workspace${isCloud ? `?revision=${revision}` : ''}`)
}
async function save() {
  if (writing || !pending || status === 'conflict') return
  writing = true; setStatus('saving')
  const document = pending; pending = ''
  try {
    const response = await saveWorkspaceDocument(document, revision)
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
    if (next === current && !writing) { pending = ''; clearTimeout(timer); return }
    if (next === pending) return
    pending = next; clearTimeout(timer); timer = setTimeout(() => void save(), 600)
  })
  initializationComplete = true
  setInterval(() => {
    if (document.hidden || writing || status === 'conflict') return
    if (pending) { void save(); return }
    void load().then((stored) => { if (writing || pending) return; if (!stored.document && stored.revision === 0) { pending = snapshot(); void save(); return }; if (stored.revision !== revision) { if (useAppStore.getState().live) { setStatus('conflict'); return }; revision = stored.revision; if (stored.document) apply(stored.document) }; setStatus('saved') }).catch(() => setStatus('offline'))
  }, 2500)
}
/** Wait until the latest in-memory library is durably saved before a page reload. */
export async function flushSharedWorkspace(): Promise<boolean> {
  if (import.meta.env.MODE === 'test' && !initialized) return true
  await whenBibleTextsSaved()
  const deadline = Date.now() + 30000
  while (Date.now() < deadline) {
    if (status === 'offline' || status === 'conflict') return false
    if (!initializationComplete || writing) { await new Promise((resolve) => setTimeout(resolve, 50)); continue }
    const latest = snapshot()
    if (latest === current && !pending) return true
    pending = latest
    await save()
  }
  return false
}
export async function resolveWorkspaceConflict(choice: 'installation' | 'local') {
  const latest = await loadWorkspaceDocument('/api/workspace'); revision = latest.revision
  if (choice === 'installation') { pending = ''; if (latest.document) apply(latest.document); setStatus('saved') }
  else { pending = snapshot(); setStatus('saving'); await save() }
}
export async function restoreWorkspaceRevision(target: number) {
  const old = await loadWorkspaceDocument(`/api/workspace/revisions/${target}`); if (!old.document) throw new Error('workspace-missing')
  const latest = await loadWorkspaceDocument('/api/workspace'); revision = latest.revision
  apply(old.document); pending = snapshot(); setStatus('saving'); await save()
}

if (import.meta.hot) import.meta.hot.accept(() => window.location.reload())
