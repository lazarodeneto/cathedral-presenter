import { ControllerPairing } from '../components/settings/ControllerPairing'
import { OutputProfileEditor } from '../components/settings/OutputProfileEditor'
import { WorkspaceRecovery } from '../components/WorkspaceStorage'
import { HardwareOutputs } from '../components/settings/HardwareOutputs'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BookOpen,
  Check,
  Database,
  Download,
  ExternalLink,
  Keyboard,
  Link2,
  Monitor,
  Projector,
  Radio,
  Palette,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Upload,
  WifiOff,
  SquarePlay,
} from 'lucide-react'
import type { AppSettings, MonitorRole } from '../types'
import { LOCALE_OPTIONS } from '../i18n/dictionary'
import { bibleTranslationsWith } from '../providers/bible/customBibles'
import { useAppStore } from '../store/useAppStore'
import { useToasts } from '../store/useToasts'
import { useT } from '../i18n/useT'
import { navigate } from '../hooks/useHashRoute'
import { buildBackup, parseBackup, type ParsedBackup } from '../security/backup'
import { webOutputProvider } from '../providers/output/WebOutputProvider'
import { BrandingPanel } from '../components/branding/BrandingPanel'
import { BibleLibraryPanel } from '../components/settings/BibleLibraryPanel'
import { ShortcutSettings } from '../components/settings/ShortcutSettings'
import { ConfirmDialog } from '../components/Modal'
import { formatNumericDateTime } from '../utils/dates'
import { outputFormat } from '../utils/outputFormats'
import { OutputFormatPicker } from '../components/OutputFormatPicker'
import { SCREEN_META, ScreenIcon, type ScreenTone } from '../components/ScreenIcon'
import { LanguageFilterSelect } from '../components/LanguageFilterSelect'
import { SortSelect } from '../components/SortSelect'
import { LocaleFlag } from '../components/LocaleFlag'

type Tab = 'general' | 'bibles' | 'identity' | 'outputs' | 'data' | 'security' | 'shortcuts'

const TABS: { id: Tab; icon: typeof SlidersHorizontal; labelKey: string; tone: ScreenTone }[] = [
  { id: 'general', icon: SlidersHorizontal, labelKey: 'settings.general', tone: 'blue' },
  { id: 'bibles', icon: BookOpen, labelKey: 'settings.bibles', tone: 'amber' },
  { id: 'identity', icon: Palette, labelKey: 'settings.branding', tone: 'rose' },
  { id: 'outputs', icon: Monitor, labelKey: 'settings.outputs', tone: 'violet' },
  { id: 'data', icon: Database, labelKey: 'settings.data', tone: 'cyan' },
  { id: 'security', icon: ShieldCheck, labelKey: 'settings.security', tone: 'blue' },
  { id: 'shortcuts', icon: Keyboard, labelKey: 'settings.shortcuts', tone: 'amber' },
]


function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean
  onChange: (value: boolean) => void
  label: string
}) {
  return (
    <div className="switch-row">
      <span>{label}</span>
      <button
        className={`switch ${value ? 'is-on' : ''}`}
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
        aria-label={label}
        type="button"
      >
        <span />
      </button>
    </div>
  )
}

/** The two outputs the app offers: the projector in the church, and a window for OBS or a live stream. */
const OUTPUT_KINDS = [
  { role: 'audience', icon: Projector, title: 'outputs.church', copy: 'outputs.churchCopy', formatKey: 'outputFormat' },
  { role: 'broadcast', icon: Radio, title: 'outputs.broadcast', copy: 'outputs.broadcastCopy', formatKey: 'broadcastFormat' },
] as const

export function SettingsScreen({ initialTab }: { initialTab?: string }) {
  const t = useT()
  const services = useAppStore((state) => state.services)
  const live = useAppStore((state) => state.live)
  const [importPreview, setImportPreview] = useState<ParsedBackup | null>(null)
  const [importing, setImporting] = useState(false)
  const settings = useAppStore((state) => state.settings)
  const branding = useAppStore((state) => state.branding)
  const monitors = useAppStore((state) => state.monitors)
  const mediaLibrary = useAppStore((state) => state.mediaLibrary)
  const mediaTags = useAppStore((state) => state.mediaTags)
  const customBibles = useAppStore((state) => state.customBibles)
  const hiddenBibleIds = useAppStore((state) => state.hiddenBibleIds)
  const archivedBibleIds = useAppStore((state) => state.archivedBibleIds)
  const deletedBibleIds = useAppStore((state) => state.deletedBibleIds)
  const bibleTranslations = useMemo(
    () => bibleTranslationsWith(customBibles, { hidden: hiddenBibleIds, archived: archivedBibleIds, deleted: deletedBibleIds }),
    [customBibles, hiddenBibleIds, archivedBibleIds, deletedBibleIds],
  )
  const updateSettings = useAppStore((state) => state.updateSettings)
  const setLocale = useAppStore((state) => state.setLocale)
  const reconnectMonitor = useAppStore((state) => state.reconnectMonitor)
  const disconnectMonitor = useAppStore((state) => state.disconnectMonitor)
  const startTestPattern = useAppStore((state) => state.startTestPattern)
  const stopTestPattern = useAppStore((state) => state.stopTestPattern)
  const testMonitorId = useAppStore((state) => state.testMonitorId)
  const importBackup = useAppStore((state) => state.importBackup)
  const resetDemoData = useAppStore((state) => state.resetDemoData)
  const clearAllData = useAppStore((state) => state.clearAllData)
  const push = useToasts((state) => state.push)
  const importInput = useRef<HTMLInputElement>(null)
  const validTab = (TABS.find((tab) => tab.id === initialTab)?.id ?? 'general') as Tab
  const [tab, setTab] = useState<Tab>(validTab)
  const [confirm, setConfirm] = useState<'reset' | 'clear' | null>(null)

  useEffect(() => {
    setTab(validTab)
  }, [validTab])

  // Goes through the router so a tab with unsaved changes (Branding) can ask first.
  const selectTab = (next: Tab) => navigate(`/settings/${next}`)

  const openOutput = async (role: MonitorRole) => {
    if (role === 'disabled') {
      push(t('status.unsupported'), 'error')
      return
    }
    const opened = await webOutputProvider.openOutput(role)
    if (!opened) push(t('output.windowBlocked'), 'error')
    else push(t('toast.outputWindowOpened'), 'success')
  }

  const testOutput = (id: string, role: MonitorRole) => {
    if (role === 'disabled') {
      push(t('status.unsupported'), 'error')
      return
    }
    if (testMonitorId === id) {
      stopTestPattern()
      push(t('toast.testStopped'), 'success')
      return
    }
    startTestPattern(id)
    webOutputProvider.openOutput(role)
    push(t('toast.testStarted'), 'success')
  }

  const exportBackup = async () => {
    const backup = buildBackup({
      services,
      settings,
      branding,
      monitors,
      media: mediaLibrary,
      librarySongs: useAppStore.getState().librarySongs,
      mediaTags,
      bibles: customBibles,
      hiddenBibleIds,
      archivedBibleIds,
      deletedBibleIds,
    })
    try {
      const response = await fetch('/api/media/packages/export', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Cathedral-Media': '1' }, body: JSON.stringify(backup) })
      const result = await response.json() as { download?: string; reason?: string }
      if (!response.ok || !result.download || !/^\/api\/media\/packages\/[0-9a-f-]{36}$/.test(result.download)) throw new Error(result.reason)
      const anchor = document.createElement('a'); anchor.href = result.download; anchor.download = 'Cathedral-Presenter-backup.zip'; anchor.click()
    } catch (error) { push(importErrorMessage(error), 'error'); return }
    updateSettings({ lastBackupAt: new Date().toISOString() })
    push(t('settings.backupExported'), 'success')
  }

  const importErrorMessage = (error: unknown) => {
    switch (error instanceof Error ? error.message : '') {
      case 'sign-in-required':
        return t('storage.signIn')
      case 'virus-detected':
        return t('storage.virusDetected')
      case 'scanner-unavailable':
        return t('storage.scannerUnavailable')
      case 'backup-disk-space':
        return t('settings.backupDiskSpace')
      case 'backup-checksum-failed':
        return t('settings.backupDamaged')
      case 'media-missing':
        return t('settings.backupMissingMedia')
      case 'backup-too-large':
        return t('settings.importTooLarge')
      case 'invalid-json':
        return t('settings.importInvalidJson')
      case 'invalid-backup':
        return t('settings.importWrongFormat')
      case 'empty-backup':
        return t('settings.importEmpty')
      default:
        return t('settings.backupFailed')
    }
  }

  const importFromFile = async (file: File) => {
    if (useAppStore.getState().live || importing) return
    if (file.size > (file.name.toLowerCase().endsWith('.zip') ? 2 * 1024 * 1024 * 1024 : 12 * 1024 * 1024)) {
      push(t('settings.importTooLarge'), 'error')
      return
    }
    setImporting(true)
    try {
      const parsed = file.name.toLowerCase().endsWith('.zip') ? await (async () => {
        const response = await fetch('/api/media/packages/import', { method: 'POST', headers: { 'Content-Type': 'application/zip', 'X-Cathedral-Media': '1' }, body: file })
        const result = await response.json()
        if (!response.ok || !result.parsed) throw new Error(result.reason)
        return result.parsed as import('../security/backup').ParsedBackup
      })() : parseBackup(await file.text())
      setImportPreview(parsed)
    } catch (error) {
      push(importErrorMessage(error), 'error')
    } finally { setImporting(false) }
  }

  return (
    <div className="screen settings-screen" data-tone={SCREEN_META.settings.tone}>
      <div className="screen-heading">
        <div>
          <ScreenIcon screen="settings" />
          <h1>{t('settings.title')}</h1>
          <p>{t('settings.subtitle')}</p>
        </div>
        <div className="source-pill">
          <Check size={14} />
          {t('status.storageLocal')}
        </div>
      </div>

      <div className="settings-layout">
        <aside className="settings-nav panel">
          {TABS.map(({ id, icon: Icon, labelKey, tone }) => (
            <button
              key={id}
              data-tone={tone}
              className={`settings-nav-item ${tab === id ? 'is-active' : ''}`}
              onClick={() => selectTab(id)}
            >
              <Icon size={16} />
              {t(labelKey)}
            </button>
          ))}
          <div className="settings-version">
            {t('common.version')} {__APP_VERSION__}
          </div>
        </aside>

        <div className="settings-content panel">
          {tab === 'general' && (
            <section className="settings-section">
              <div className="settings-section-head">
                <span className="settings-icon">
                  <SlidersHorizontal size={18} />
                </span>
                <div>
                  <h2>{t('settings.general')}</h2>
                  <p>{t('settings.localeNote')}</p>
                </div>
              </div>
              <div className="settings-grid">
                <div className="field settings-language-field">
                  <span>{t('settings.language')}</span>
                  <LanguageFilterSelect
                    value={settings.locale}
                    languages={LOCALE_OPTIONS.map((option) => option.value)}
                    allLabel=""
                    label={t('settings.language')}
                    includeAll={false}
                    onChange={(value) => { if (value) setLocale(value) }}
                  />
                </div>
                <div className="field"><SortSelect value={settings.defaultTranslationId} label={t('settings.defaultTranslation')} onChange={(value) => updateSettings({ defaultTranslationId: value })} options={bibleTranslations.map((translation) => ({ value: translation.id, label: `${translation.abbreviation} · ${translation.name}`, icon: <LocaleFlag locale={translation.language} size={18} /> }))} /></div>
                <div className="field"><SortSelect value={settings.secondaryTranslationId} label={t('settings.secondaryTranslation')} onChange={(value) => updateSettings({ secondaryTranslationId: value })} options={bibleTranslations.map((translation) => ({ value: translation.id, label: `${translation.abbreviation} · ${translation.name}`, icon: <LocaleFlag locale={translation.language} size={18} /> }))} /></div>
                <label className="field">
                  <span>{t('settings.transition')}</span>
                  <select
                    value={settings.transition}
                    onChange={(event) =>
                      updateSettings({ transition: event.target.value as AppSettings['transition'] })
                    }
                  >
                    <option value="fade">{t('settings.transitionFade')}</option>
                    <option value="cut">{t('settings.transitionCut')}</option>
                    <option value="slide">{t('settings.transitionSlide')}</option>
                    <option value="zoom">{t('culto.transitionName.zoom')}</option>
                  </select>
                </label>
              </div>
              <div className="settings-toggles">
                <Toggle
                  value={settings.reducedTransparency}
                  onChange={(value) => updateSettings({ reducedTransparency: value })}
                  label={t('settings.reducedTransparency')}
                />
                <label className="switch-row glass-opacity-row">
                  <span>{t('settings.glassOpacity')}</span>
                  <span className="glass-opacity-control">
                    <input
                      type="range"
                      min={55}
                      max={100}
                      step={5}
                      value={Math.round((settings.glassOpacity ?? 0.8) * 100)}
                      disabled={settings.reducedTransparency}
                      onChange={(event) => updateSettings({ glassOpacity: Number(event.target.value) / 100 })}
                      aria-label={t('settings.glassOpacity')}
                    />
                    <output>{Math.round((settings.glassOpacity ?? 0.8) * 100)}%</output>
                  </span>
                </label>
                <Toggle
                  value={settings.reducedMotion}
                  onChange={(value) => updateSettings({ reducedMotion: value })}
                  label={t('settings.reducedMotion')}
                />
                <Toggle
                  value={settings.shortcutsEnabled}
                  onChange={(value) => updateSettings({ shortcutsEnabled: value })}
                  label={t('settings.shortcutsEnabled')}
                />
              </div>
              <div className="setting-footnote">
                <Palette size={14} />
                {t('settings.unsavedChanges')}
              </div>
            </section>
          )}

          {tab === 'bibles' && <BibleLibraryPanel />}

          {tab === 'identity' && (
            <section className="settings-section">
              <div className="settings-section-head">
                <span className="settings-icon">
                  <Palette size={18} />
                </span>
                <div>
                  <h2>{t('settings.branding')}</h2>
                  <p>{t('branding.subtitle')}</p>
                </div>
              </div>
              <BrandingPanel />
            </section>
          )}

          {tab === 'outputs' && (
            <section className="settings-section">
              <div className="settings-section-head">
                <span className="settings-icon">
                  <Monitor size={18} />
                </span>
                <div>
                  <h2>{t('settings.outputsTitle')}</h2>
                  <p>{t(window.cathedralDesktop ? 'hardware.subtitle' : 'settings.outputsSubtitle')}</p>
                </div>
              </div>
              <HardwareOutputs />
              <OutputProfileEditor id="broadcast" />
              {!window.cathedralDesktop && <div className="output-list">
                {OUTPUT_KINDS.map(({ role, icon: KindIcon, title, copy, formatKey }) => {
                  const monitor = monitors.find((entry) => entry.role === role)
                  if (!monitor) return null
                  const format = outputFormat(settings[formatKey])
                  const testing = testMonitorId === monitor.id
                  return (
                    <article key={role} className={`output-card output-card-${role}`}>
                      <div className="output-card-head">
                        <span className="monitor-icon">
                          <KindIcon size={18} />
                        </span>
                        <div>
                          <h3>{t(title)}</h3>
                          <p>{t(copy)}</p>
                        </div>
                        <span className={`badge ${monitor.status === 'disconnected' ? 'badge-warning' : 'badge-success'}`}>
                          <span className={`status-dot status-dot-${monitor.status === 'disconnected' ? 'disconnected' : 'ready'}`} />
                          {monitor.status === 'disconnected' ? t('status.disconnected') : t('common.ready')}
                        </span>
                      </div>
                      <div className="field compact output-format-field">
                        <span>{t('settings.projectionFormat')}</span>
                        <OutputFormatPicker
                          value={format.id}
                          onChange={(id) => updateSettings({ [formatKey]: id })}
                          label={`${t('settings.projectionFormat')}: ${t(title)}`}
                          buttonClassName="output-format-trigger"
                        />
                        <small className="field-hint">
                          {t(role === 'audience' ? 'settings.projectionFormatHint' : 'outputs.broadcastFormatHint')}
                        </small>
                      </div>
                      <div className="output-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => testOutput(monitor.id, role)}>
                          {testing ? t('settings.stopTest') : t('settings.testPattern')}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => openOutput(role)}>
                          <ExternalLink size={14} />
                          {t('settings.openOutput')}
                        </button>
                        {monitor.status === 'disconnected' ? (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              reconnectMonitor(monitor.id)
                              push(t('toast.outputReconnected'), 'success')
                            }}
                          >
                            {t('common.reconnect')}
                          </button>
                        ) : (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              disconnectMonitor(monitor.id)
                              push(t('toast.outputDisconnected'), 'info')
                            }}
                          >
                            <WifiOff size={14} />
                            {t('settings.disconnect')}
                          </button>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>}
              {!window.cathedralDesktop && <div className="setting-footnote">
                <ShieldCheck size={14} />
                {t('settings.outputTestNote')} {t('desktop.copy')}
              </div>}
            </section>
          )}

          {tab === 'data' && (
            <section className="settings-section">
              <div className="settings-section-head">
                <span className="settings-icon">
                  <Database size={18} />
                </span>
                <div>
                  <h2>{t('settings.dataTitle')}</h2>
                  <p>{t('settings.dataSubtitle')}</p>
                </div>
              </div>
              <div className="data-summary">
                <div>
                  <strong>{services.length}</strong>
                  <span>{t('nav.services')}</span>
                </div>
                <div>
                  <strong>
                    {services.reduce((total, service) => total + service.items.reduce((sum, item) => sum + item.slides.length, 0), 0)}
                  </strong>
                  <span>{t('common.slides')}</span>
                </div>
                <div>
                  <strong>{mediaLibrary.length}</strong>
                  <span>{t('nav.media')}</span>
                </div>
              </div>
              <div className="data-rows">
                <div className="data-row">
                  <span className="data-icon">
                    <Database size={17} />
                  </span>
                  <div>
                    <strong>{t('settings.dataLocation')}</strong>
                    <span>{t('home.dataLocationValue')}</span>
                  </div>
                  <span className="badge badge-quiet">{t('status.storageLocal')}</span>
                </div>
                <div className="data-row">
                  <span className="data-icon">
                    <Download size={17} />
                  </span>
                  <div>
                    <strong>{t('settings.lastBackup')}</strong>
                    <span>
                      {settings.lastBackupAt
                        ? formatNumericDateTime(settings.lastBackupAt)
                        : t('common.never')}
                    </span>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={exportBackup}>
                    {t('settings.exportBackup')}
                  </button>
                </div>
              </div>
              <WorkspaceRecovery />
              <ControllerPairing />
              <div className="data-actions">
                <button className="btn btn-secondary" disabled={Boolean(live) || importing} title={live ? t('workspace.stopLive') : undefined} onClick={() => importInput.current?.click()}>
                  <Upload size={15} />
                  {t('settings.importBackup')}
                </button>
                <button className="btn btn-ghost" disabled={Boolean(live)} onClick={() => setConfirm('reset')}>
                  <RotateCcw size={15} />
                  {t('settings.resetDemo')}
                </button>
                <button className="btn btn-ghost danger-text" disabled={Boolean(live)} onClick={() => setConfirm('clear')}>
                  <Trash2 size={15} />
                  {t('settings.clearData')}
                </button>
                <input
                  ref={importInput}
                  type="file"
                  accept="application/json,.json,application/zip,.zip"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void importFromFile(file)
                    event.target.value = ''
                  }}
                />
              </div>
              <div className="setting-footnote">
                <ShieldCheck size={14} />
                {t('settings.backupContents')}
              </div>
              <div className="setting-footnote">
                <ShieldCheck size={14} />
                {t('desktop.copy')}
              </div>
            </section>
          )}

          {tab === 'security' && (
            <section className="settings-section">
              <div className="settings-section-head">
                <span className="settings-icon">
                  <ShieldCheck size={18} />
                </span>
                <div>
                  <h2>{t('settings.securityTitle')}</h2>
                  <p>{t('settings.securitySubtitle')}</p>
                </div>
              </div>
              <div className="security-hero">
                <ShieldCheck size={26} />
                <div>
                  <strong>{t('status.offlineReady')}</strong>
                  <p>{t('settings.securityCopy')}</p>
                </div>
              </div>
              <div className="security-grid">
                <div>
                  <span className="eyebrow"><Database size={15} aria-hidden="true" />{t('settings.securityLocalTitle')}</span>
                  <p>{t('settings.securityLocalCopy')}</p>
                </div>
                <div>
                  <span className="eyebrow"><BookOpen size={15} aria-hidden="true" />{t('settings.securitySourcesTitle')}</span>
                  <p>{t('settings.securitySourcesCopy')}</p>
                </div>
                <div>
                  <span className="eyebrow"><Link2 size={15} aria-hidden="true" />{t('media.url')}</span>
                  <p>{t('media.urlHint')}</p>
                </div>
                <div>
                  <span className="eyebrow"><SquarePlay size={15} aria-hidden="true" />{t('media.youtube')}</span>
                  <p>{t('media.youtubeHint')}</p>
                </div>
                <div>
                  <span className="eyebrow"><Monitor size={15} aria-hidden="true" />{t('settings.securityOutputTitle')}</span>
                  <p>{t('settings.securityOutputCopy')}</p>
                </div>
                <div>
                  <span className="eyebrow"><Download size={15} aria-hidden="true" />{t('settings.securityBackupsTitle')}</span>
                  <p>{t('settings.securityBackupsCopy')}</p>
                </div>
              </div>
            </section>
          )}

          {tab === 'shortcuts' && (
            <section className="settings-section">
              <div className="settings-section-head">
                <span className="settings-icon">
                  <Keyboard size={18} />
                </span>
                <div>
                  <h2>{t('settings.shortcuts')}</h2>
                  <p>{t('shortcuts.subtitle')}</p>
                </div>
                <Toggle
                  value={settings.shortcutsEnabled}
                  onChange={(value) => updateSettings({ shortcutsEnabled: value })}
                  label={t('settings.shortcutsEnabled')}
                />
              </div>
              <ShortcutSettings />
            </section>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(importPreview)}
        title={t('settings.restorePreview')}
        copy={t('settings.restoreSummary', { services: importPreview?.services.length ?? 0, media: importPreview?.media?.length ?? 0, songs: importPreview?.librarySongs?.length ?? 0 })}
        confirmLabel={t('settings.importBackup')}
        onClose={() => setImportPreview(null)}
        onConfirm={() => {
          if (!importPreview || useAppStore.getState().live) { push(t('workspace.stopLive'), 'error'); return }
          importBackup(importPreview)
          push(t('settings.importSuccess'), 'success')
          navigate('/home')
        }}
      />
      <ConfirmDialog
        open={confirm === 'reset'}
        title={t('settings.resetDemo')}
        copy={t('settings.resetConfirm')}
        confirmLabel={t('settings.resetDemo')}
        tone="primary"
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          resetDemoData()
          push(t('toast.saved'), 'success')
        }}
      />
      <ConfirmDialog
        open={confirm === 'clear'}
        title={t('settings.clearData')}
        copy={t('settings.clearConfirm')}
        confirmLabel={t('settings.clearData')}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          clearAllData()
          navigate('/home')
          push(t('toast.saved'), 'success')
        }}
      />
    </div>
  )
}
