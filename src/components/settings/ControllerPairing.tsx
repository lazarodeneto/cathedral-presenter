import { useState } from 'react'
import { useT } from '../../i18n/useT'
import { useToasts } from '../../store/useToasts'
export function ControllerPairing() {
  const [pair, setPair] = useState<{ token: string; endpoint: string; expiresAt: number } | null>(null), [busy, setBusy] = useState(false)
  const t = useT(), push = useToasts((s) => s.push)
  const request = async (method: 'POST' | 'DELETE') => {
    setBusy(true)
    try {
      const response = await fetch('/api/control/pair', { method, headers: { 'X-Cathedral-Admin': '1' } })
      if (!response.ok) throw new Error('pairing-failed')
      setPair(method === 'POST' ? await response.json() : null)
    } catch { push(t('control.failed'), 'error') } finally { setBusy(false) }
  }
  return <details className="controller-pairing"><summary>{t('control.title')}</summary><p className="field-hint">{t('control.help')}</p>
    <button className="btn btn-secondary" disabled={busy} onClick={() => void request('POST')}>{t('control.create')}</button>
    {pair && <div className="form-stack"><label className="field"><span>{t('control.endpoint')}</span><input readOnly value={pair.endpoint} onFocus={(e) => e.target.select()} /></label><label className="field"><span>{t('control.key')}</span><input readOnly value={pair.token} onFocus={(e) => e.target.select()} /></label><time dateTime={new Date(pair.expiresAt).toISOString()}>{new Date(pair.expiresAt).toLocaleString()}</time><code>{'{"command":"next"}'}</code><button className="btn btn-secondary" disabled={busy} onClick={() => void request('DELETE')}>{t('control.revoke')}</button></div>}
  </details>
}
