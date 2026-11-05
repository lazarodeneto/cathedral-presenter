import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BookOpen,
  Check,
  Database,
  Download,
  ExternalLink,
  Keyboard,
  Monitor,
  Palette,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Upload,
  WifiOff,
} from 'lucide-react'
import type { AppSettings, Locale, MonitorRole } from '../types'
import { LOCALE_OPTIONS, languageName } from '../i18n/dictionary'
import { bibleTranslationsWith } from '../providers/bible/customBibles'
import { useAppStore } from '../store/useAppStore'
import { useToasts } from '../store/useToasts'
import { useT } from '../i18n/useT'
import { navigate } from '../hooks/useHashRoute'
import { buildBackup, parseBackup } from '../security/backup'
import { webOutputProvider } from '../providers/output/WebOutputProvider'
import { BrandingPanel } from '../components/branding/BrandingPanel'
import { BibleLibraryPanel } from '../components/settings/BibleLibraryPanel'
import { ShortcutSettings } from '../components/settings/ShortcutSettings'
import { ConfirmDialog } from '../components/Modal'
import { formatNumericDateTime } from '../utils/dates'
import { SCREEN_META, ScreenIcon, type ScreenTone } from '../components/ScreenIcon'

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

export function SettingsScreen({ initialTab }: { initialTab?: string }) {
  const t = useT()
  const services = useAppStore((state) => state.services)
  const settings = useAppStore((state) => state.settings)
  const branding = useAppStore((state) => state.branding)
  const monitors = useAppStore((state) => state.monitors)
  const mediaLibrary = useAppStore((state) => state.mediaLibrary)
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
  const assignMonitorRole = useAppStore((state) => state.assignMonitorRole)
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

  const openOutput = (role: MonitorRole) => {
    if (role === 'disabled' || role === 'broadcast') {
      push(t('status.unsupported'), 'error')
      return
    }
    const opened = webOutputProvider.openOutput(role)
    if (!opened) push(t('output.windowBlocked'), 'error')
    else push(t('toast.outputWindowOpened'), 'success')
  }

  const testOutput = (id: string, role: MonitorRole) => {
    if (role === 'disabled' || role === 'broadcast') {
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

  const exportBackup = () => {
    const backup = buildBackup({
      services,
      settings,
      branding,
      monitors,
      media: mediaLibrary,
      bibles: customBibles,
      hiddenBibleIds,
      archivedBibleIds,
      deletedBibleIds,
    })
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `church-presenter-backup-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    updateSettings({ lastBackupAt: new Date().toISOString() })
    push(t('settings.backupExported'), 'success')
  }

  const importErrorMessage = (error: unknown) => {
    switch (error instanceof Error ? error.message : '') {
      case 'backup-too-large':
        return t('settings.importTooLarge')
      case 'invalid-json':
        return t('settings.importInvalidJson')
      case 'invalid-backup':
        return t('settings.importWrongFormat')
      case 'empty-backup':
        return t('settings.importEmpty')
      default:
        return t('settings.importReadFailed')
    }
  }

  const importFromFile = async (file: File) => {
    if (file.size > 12 * 1024 * 1024) {
      push(t('settings.importTooLarge'), 'error')
      return
    }
    try {
      const parsed = parseBackup(await file.text())
      importBackup(parsed)
      push(t('settings.importSuccess'), 'success')
      navigate('/home')
    } catch (error) {
      push(importErrorMessage(error), 'error')
    }
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
            {t('common.version')} {__APP_VERSION__} · {t('status.offlineReady')}
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
                <label className="field">
                  <span>{t('settings.language')}</span>
                  <select
                    value={settings.locale}
                    onChange={(event) => setLocale(event.target.value as Locale)}
                  >
                    {LOCALE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.flag} {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>{t('settings.defaultTranslation')}</span>
                  <select
                    value={settings.defaultTranslationId}
                    onChange={(event) => updateSettings({ defaultTranslationId: event.target.value })}
                  >
                    {bibleTranslations.map((translation) => (
                      <option key={translation.id} value={translation.id}>
                        {translation.abbreviation} · {translation.name} ({languageName(translation.language, settings.locale)})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>{t('settings.secondaryTranslation')}</span>
                  <select
                    value={settings.secondaryTranslationId}
                    onChange={(event) => updateSettings({ secondaryTranslationId: event.target.value })}
                  >
                    {bibleTranslations.map((translation) => (
                      <option key={translation.id} value={translation.id}>
                        {translation.abbreviation} · {translation.name} ({languageName(translation.language, settings.locale)})
                      </option>
                    ))}
                  </select>
                </label>
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
                  <p>{t('settings.outputsSubtitle')}</p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => push(t('settings.outputTestNote'))}>
                  {t('settings.detect')}
                </button>
              </div>
              <div className="output-list">
                {monitors.map((monitor) => (
                  <article key={monitor.id} className="output-card">
                    <div className="output-card-head">
                      <span className="monitor-icon">
                        <Monitor size={18} />
                      </span>
                      <div>
                        <h3>{monitor.name}</h3>
                        <p>{monitor.displayName}</p>
                      </div>
                      <span className={`badge ${monitor.status === 'ready' ? 'badge-success' : monitor.status === 'disconnected' ? 'badge-warning' : 'badge-quiet'}`}>
                        <span className={`status-dot status-dot-${monitor.status}`} />
                        {monitor.status === 'ready'
                          ? t('common.ready')
                          : monitor.status === 'disconnected'
                            ? t('status.disconnected')
                            : monitor.status === 'unsupported'
                              ? t('status.unsupported')
                              : monitor.status}
                      </span>
                    </div>
                    <div className="output-card-grid">
                      <label className="field compact">
                        <span>{t('settings.role')}</span>
                        <select
                          value={monitor.role}
                          onChange={(event) =>
                            assignMonitorRole(monitor.id, event.target.value as MonitorRole)
                          }
                        >
                          <option value="audience">{t('settings.audience')}</option>
                          <option value="confidence">{t('settings.confidence')}</option>
                          <option value="broadcast">{t('settings.broadcast')}</option>
                          <option value="disabled">{t('settings.disabled')}</option>
                        </select>
                      </label>
                      <div className="output-resolution">
                        <span>{t('settings.resolution')}</span>
                        <strong>
                          {monitor.width} × {monitor.height}
                        </strong>
                        <small>{monitor.fullscreen ? t('common.fullscreen') : t('common.preview')}</small>
                      </div>
                    </div>
                    <div className="output-actions">
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => testOutput(monitor.id, monitor.role)}
                        disabled={monitor.role === 'disabled' || monitor.role === 'broadcast'}
                      >
                        {testMonitorId === monitor.id ? t('settings.stopTest') : t('settings.testPattern')}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => openOutput(monitor.role)}
                        disabled={monitor.role === 'disabled' || monitor.role === 'broadcast'}
                      >
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
                ))}
              </div>
              <div className="setting-footnote">
                <ShieldCheck size={14} />
                {t('settings.outputTestNote')} {t('desktop.copy')}
              </div>
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
                  <span>{t('calendar.serviceCount', { count: services.length })}</span>
                  <strong>{services.length}</strong>
                </div>
                <div>
                  <span>{t('common.slides')}</span>
                  <strong>
                    {services.reduce((total, service) => total + service.items.reduce((sum, item) => sum + item.slides.length, 0), 0)}
                  </strong>
                </div>
                <div>
                  <span>{t('media.library')}</span>
                  <strong>{mediaLibrary.length}</strong>
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
              <div className="data-actions">
                <button className="btn btn-secondary" onClick={() => importInput.current?.click()}>
                  <Upload size={15} />
                  {t('settings.importBackup')}
                </button>
                <button className="btn btn-ghost" onClick={() => setConfirm('reset')}>
                  <RotateCcw size={15} />
                  {t('settings.resetDemo')}
                </button>
                <button className="btn btn-ghost danger-text" onClick={() => setConfirm('clear')}>
                  <Trash2 size={15} />
                  {t('settings.clearData')}
                </button>
                <input
                  ref={importInput}
                  type="file"
                  accept="application/json,.json"
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
                  <span className="eyebrow">{t('settings.securityLocalTitle')}</span>
                  <p>{t('settings.securityLocalCopy')}</p>
                </div>
                <div>
                  <span className="eyebrow">{t('settings.securitySourcesTitle')}</span>
                  <p>{t('settings.securitySourcesCopy')}</p>
                </div>
                <div>
                  <span className="eyebrow">{t('media.url')}</span>
                  <p>{t('media.urlHint')}</p>
                </div>
                <div>
                  <span className="eyebrow">{t('media.youtube')}</span>
                  <p>{t('media.youtubeHint')}</p>
                </div>
                <div>
                  <span className="eyebrow">{t('settings.securityOutputTitle')}</span>
                  <p>{t('settings.securityOutputCopy')}</p>
                </div>
                <div>
                  <span className="eyebrow">{t('settings.securityBackupsTitle')}</span>
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
