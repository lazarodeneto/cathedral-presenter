import { OutputProfileEditor } from './OutputProfileEditor'
import { useState } from 'react'
import { Monitor, RefreshCw } from 'lucide-react'
import { useT } from '../../i18n/useT'
import { useAppStore } from '../../store/useAppStore'
import { operatingSystem, reconcilePhysicalDisplays } from '../../providers/output/desktop'
import type { MonitorRole } from '../../types'
import { useDesktopDisplays } from '../../hooks/useDesktopDisplays'

export function HardwareOutputs() {
  const t = useT()
  const monitors = useAppStore((state) => state.monitors)
  const testId = useAppStore((state) => state.testMonitorId)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const desktop = useDesktopDisplays()
  const system = desktop ? desktop.platform === 'darwin' ? 'macOS' : desktop.platform === 'win32' ? 'Windows' : 'Linux' : operatingSystem()
  const physical = monitors.filter((monitor) => !monitor.simulated)
  if (!desktop)
    return (
      <div className="hardware-browser-note">
        <span className="badge badge-quiet">{system}</span>
        <p>{t('hardware.browser')}</p>
      </div>
    )
  async function run(work: () => Promise<unknown>) {
    setBusy(true)
    setError(false)
    try {
      await work()
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }
  const refresh = () =>
    run(async () => {
      const displays = await desktop!.listDisplays()
      useAppStore.setState((state) => ({
        monitors: reconcilePhysicalDisplays(state.monitors, displays),
      }))
    })
  const roleLabel = (role: MonitorRole) =>
    t(
      role === 'audience'
        ? 'output.audience'
        : role === 'confidence'
          ? 'output.confidence'
          : role === 'broadcast'
            ? 'outputs.broadcast'
            : 'hardware.disabled',
    )
  return (
    <div className="hardware-outputs">
      <div className="hardware-toolbar">
        <span className="badge badge-quiet">{system}</span>
        <h3>
          {t('hardware.title')} (
          {physical.filter((monitor) => monitor.status !== 'disconnected').length})
        </h3>
        <button className="btn btn-secondary" disabled={busy} onClick={() => void refresh()}>
          <RefreshCw size={14} />
          {t('hardware.refresh')}
        </button>
        <button
          className="btn btn-primary"
          disabled={
            busy ||
            !physical.some(
              (monitor) =>
                !monitor.isOperator &&
                monitor.role !== 'disabled' &&
                monitor.status !== 'disconnected',
            )
          }
          onClick={() =>
            void run(async () => {
              const targets = physical.filter(
                (monitor) =>
                  !monitor.isOperator &&
                  monitor.role !== 'disabled' &&
                  monitor.status !== 'disconnected',
              )
              const opened = await Promise.all(
                targets.map((monitor) => desktop.openDisplay(monitor.displayId!)),
              )
              if (opened.some((result) => !result)) throw new Error('Output unavailable')
            })
          }
        >
          {t('hardware.openAll')}
        </button>
      </div>
      <p className="field-hint">{t('hardware.help')}</p>
      {error && (
        <p className="inline-warning" role="alert">
          {t('hardware.error')}
        </p>
      )}
      <div className="hardware-display-list">
        {physical.map((monitor, index) => (
          <article
            className={`hardware-display ${monitor.isOperator ? 'is-operator' : ''}`}
            key={monitor.id}
          >
            <div className="hardware-display-name">
              <Monitor size={20} />
              <div>
                <h4>
                  {index + 1}. {monitor.name}
                </h4>
                <p>
                  {monitor.width} × {monitor.height} ·{' '}
                  {monitor.status === 'disconnected'
                      ? t('status.disconnected')
                      : monitor.isOperator
                        ? t('hardware.operator')
                      : monitor.outputOpen
                        ? t('hardware.open')
                        : t('common.ready')}
                </p>
              </div>
            </div>
            {!monitor.isOperator && (
              <>
                <label className="field">
                  <span>{t('hardware.role')}</span>
                  <select
                    value={monitor.role}
                    disabled={busy || monitor.status === 'disconnected'}
                    onChange={(event) =>
                      void run(async () => {
                        await desktop.setDisplayRole(
                          monitor.displayId!,
                          event.target.value as MonitorRole,
                        )
                      })
                    }
                  >
                    {(['disabled', 'audience', 'confidence', 'broadcast'] as MonitorRole[]).map(
                      (role) => (
                        <option key={role} value={role}>
                          {roleLabel(role)}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                {monitor.role !== 'disabled' && <OutputProfileEditor id={monitor.displayId ?? monitor.id} confidence={monitor.role === 'confidence'} />}
                <div className="output-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={
                      busy || monitor.role === 'disabled' || monitor.status === 'disconnected'
                    }
                    onClick={() =>
                      void run(async () => {
                        if (testId === monitor.id) {
                          useAppStore.getState().stopTestPattern()
                          return
                        }
                        useAppStore.getState().startTestPattern(monitor.id)
                        if (!(await desktop.openDisplay(monitor.displayId!))) {
                          useAppStore.getState().stopTestPattern()
                          throw new Error('Output unavailable')
                        }
                      })
                    }
                  >
                    {t(testId === monitor.id ? 'settings.stopTest' : 'settings.testPattern')}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={
                      busy || monitor.role === 'disabled' || monitor.status === 'disconnected'
                    }
                    onClick={() =>
                      void run(async () => {
                        if (monitor.outputOpen) {
                          await desktop.closeDisplay(monitor.displayId!)
                          if (testId === monitor.id) useAppStore.getState().stopTestPattern()
                        } else if (!(await desktop.openDisplay(monitor.displayId!)))
                          throw new Error('Output unavailable')
                      })
                    }
                  >
                    {t(monitor.outputOpen ? 'hardware.close' : 'settings.openOutput')}
                  </button>
                </div>
              </>
            )}
          </article>
        ))}
      </div>
      <p className="field-hint">{t('hardware.extended')}</p>
    </div>
  )
}
