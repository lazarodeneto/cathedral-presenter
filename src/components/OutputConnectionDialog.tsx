import { useEffect, useState } from 'react'
import { AppWindow, CheckCircle2, Monitor, RefreshCw } from 'lucide-react'
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
  const [connected, setConnected] = useState(false)
  const [browserError, setBrowserError] = useState(false)

  useEffect(() => {
    const open = (event: Event) => {
      setReason(String((event as CustomEvent).detail))
      setConnected(false)
      setBrowserError(false)
    }
    window.addEventListener('cathedral:output-connection', open)
    return () => window.removeEventListener('cathedral:output-connection', open)
  }, [])

  if (!reason) return null

  const canUseBrowserScreen = reason === 'desktopRequired' || reason === 'noDisplay'
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

  return (
    <Modal title={t('connection.title')} onClose={() => setReason('')}>
      <div className="form-stack output-connection-help">
        <Monitor size={32} aria-hidden="true" />
        <p>{t(`presentation.${reason}`)}</p>
        <ol>
          <li>{t('connection.stepApp')}</li>
          <li>{t(isCloud ? 'connection.stepPair' : 'connection.stepExtend')}</li>
          <li>{t('connection.stepOutputs')}</li>
        </ol>
        {isCloud && <DesktopDownloads />}
        {canUseBrowserScreen && (
          <div className="browser-output-option">
            <strong>{t('presentation.browserScreen')}</strong>
            <p>{t('presentation.browserScreenHelp')}</p>
            <button className="btn btn-secondary" disabled={busy} onClick={() => void openBrowserScreen()}>
              <Monitor size={16} />
              {t('presentation.openBrowserScreen')}
            </button>
            {browserError && <p className="inline-note" role="alert">{t('output.windowBlocked')}</p>}
          </div>
        )}
        {connected && <p className="inline-note" role="status"><CheckCircle2 size={18} />{t('connection.ready')}</p>}
        <div className="output-actions">
          <a className="btn btn-primary" href="cathedral-presenter://open"><AppWindow size={16} />{t('connection.open')}</a>
          <button className="btn btn-secondary" disabled={busy} onClick={async () => { setBusy(true); try { await webOutputProvider.discoverDesktop(); setConnected(Boolean(webOutputProvider.getDesktop())) } finally { setBusy(false) } }}><RefreshCw size={16} />{t('connection.check')}</button>
          <button className="btn btn-ghost" onClick={() => { setReason(''); navigate('/settings/outputs') }}><Monitor size={16} />{t('connection.outputs')}</button>
        </div>
      </div>
    </Modal>
  )
}
