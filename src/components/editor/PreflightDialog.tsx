import { CircleCheck, CircleAlert, RotateCcw } from 'lucide-react'
import { Modal } from '../Modal'
import { useT } from '../../i18n/useT'
import type { PreflightCheck } from '../../utils/preflight'
export function PreflightDialog({ checks, onClose, onContinue, onCheck }: { checks: PreflightCheck[]; onClose(): void; onContinue(): void; onCheck(): void }) {
  const t = useT(), errors = checks.some((c) => c.severity === 'error')
  return <Modal title={t('preflight.title')} onClose={onClose}>
    <ul className="preflight-checks">{checks.map((check, index) => <li key={index} data-state={check.severity}>{check.severity === 'ready' ? <CircleCheck size={18} /> : <CircleAlert size={18} />}<span>{t(`preflight.${check.key}`)}{check.detail && <small>{check.detail}</small>}</span></li>)}</ul>
    <div className="modal-actions"><button className="btn btn-secondary" onClick={onCheck}><RotateCcw size={15} />{t('preflight.recheck')}</button><button className="btn btn-primary" disabled={errors} onClick={onContinue}>{t('editor.present')}</button></div>
  </Modal>
}
