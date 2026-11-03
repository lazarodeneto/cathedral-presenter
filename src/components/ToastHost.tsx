import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { useToasts } from '../store/useToasts'
import { useT } from '../i18n/useT'

export function ToastHost() {
  const t = useT()
  const toasts = useToasts((state) => state.toasts)
  const dismiss = useToasts((state) => state.dismiss)

  return (
    <div className="toast-host" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.tone}`}>
          {toast.tone === 'success' ? (
            <CheckCircle2 size={16} />
          ) : toast.tone === 'error' ? (
            <AlertCircle size={16} />
          ) : (
            <Info size={16} />
          )}
          <span>{toast.message}</span>
          <button onClick={() => dismiss(toast.id)} aria-label={t('common.close')}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
