import { useEffect, useState } from 'react'
import { AppWindow, CheckCircle2, CircleAlert, LoaderCircle, Monitor, RefreshCw } from 'lucide-react'
import { Modal } from './Modal'
import { useT } from '../i18n/useT'
import { navigate } from '../hooks/useHashRoute'
import { webOutputProvider } from '../providers/output/WebOutputProvider'
import { isCloud } from '../runtime'
import { DesktopDownloads } from './DesktopDownloads'

export function showOutputConnection(reason: string) {
  window.dispatchEvent(new CustomEvent('cathedral:output-connection', { detail: reason }))
}

export function OutputConnectionDialog() {
  const t = useT()
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [desktopState, setDesktopState] = useState<'checking' | 'connected' | 'unavailable'>('unavailable')
  const [browserError, setBrowserError] = useState(false)

  useEffect(() => {
    const open = (event: Event) => {
      setReason(String((event as CustomEvent).detail))
      setDesktopState('checking')
      setBrowserError(false)
      void webOutputProvider.discoverDesktop().then(() => {
        setDesktopState(webOutputProvider.getDesktop() ? 'connected' : 'unavailable')
      }).catch(() => setDesktopState('unavailable'))
    }
    window.addEventListener('cathedral:output-connection', open)
    return () => window.removeEventListener('cathedral:output-connection', open)
  }, [])

  if (!reason) return null

  const canUseBrowserScreen = true
  const openBrowserScreen = async () => {
    setBusy(true)
    setBrowserError(false)
    try {
      if (await webOutputProvider.openBrowserOutput('audience')) setReason('')
      else setBrowserError(true)
    } finally {
      setBusy(false)
    }
  }

  const checkDesktop = async () => {
    setBusy(true)
    setDesktopState('checking')
    try {
      await webOutputProvider.discoverDesktop()
      setDesktopState(webOutputProvider.getDesktop() ? 'connected' : 'unavailable')
    } catch {
      setDesktopState('unavailable')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={t('connection.title')} onClose={() => setReason('')}>
      <div className="form-stack output-connection-help">
        <div className="connection-issue">
          <span className="connection-issue-icon"><Monitor size={26} aria-hidden="true" /></span>
          <div>
            <strong>{t(`presentation.${reason}`)}</strong>
            <span>{t('connection.stepOutputs')}</span>
          </div>
        </div>
        {desktopState !== 'unavailable' && (
          <div className={`connection-status-card is-${desktopState}`} role="status" aria-live="polite">
            {desktopState === 'checking' ? <LoaderCircle className="spin" size={17} aria-hidden="true" /> : <CheckCircle2 size={17} aria-hidden="true" />}
            <div>
              <strong>{desktopState === 'checking' ? t('presentation.connecting') : t('connection.ready')}</strong>
              <span>{t('connection.stepApp')}</span>
            </div>
          </div>
        )}
        <ol className="connection-steps">
          <li>{t('connection.stepApp')}</li>
          <li>{t(isCloud ? 'connection.stepPair' : 'connection.stepExtend')}</li>
          <li>{t('connection.stepOutputs')}</li>
        </ol>
        {isCloud && <DesktopDownloads />}
        <div className="connection-option-grid">
          <section className="connection-option connection-option-native">
            <div className="connection-option-head"><AppWindow size={18} aria-hidden="true" /><strong>{t('connection.open')}</strong></div>
            <p>{t('connection.stepApp')}</p>
            <a className="btn btn-primary" href="cathedral-presenter://open"><AppWindow size={16} />{t('connection.open')}</a>
          </section>
          {canUseBrowserScreen && (
            <section className="connection-option connection-option-browser">
              <div className="connection-option-head"><Monitor size={18} aria-hidden="true" /><strong>{t('presentation.browserScreen')}</strong></div>
              <p>{t('presentation.browserScreenHelp')}</p>
              <button className="btn btn-secondary" disabled={busy} onClick={() => void openBrowserScreen()}>
                <Monitor size={16} />
                {t('presentation.openBrowserScreen')}
              </button>
              {browserError && <p className="inline-note" role="alert">{t('output.windowBlocked')}</p>}
            </section>
          )}
        </div>
        <div className="output-actions connection-footer-actions">
          <button className="btn btn-connection-primary" disabled={busy} onClick={() => void checkDesktop()}><RefreshCw size={16} className={busy ? 'spin' : undefined} />{t('connection.check')}</button>
          <button className="btn btn-ghost" onClick={() => { setReason(''); navigate('/settings/outputs') }}><Monitor size={16} />{t('connection.outputs')}</button>
        </div>
      </div>
    </Modal>
  )
}
