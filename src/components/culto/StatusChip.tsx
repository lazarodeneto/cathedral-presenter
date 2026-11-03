import type { ServiceStatus } from '../../types'
import { useT } from '../../i18n/useT'

/** Service status as a labelled chip; colour is never the only signal. */
export function StatusChip({ status }: { status: ServiceStatus }) {
  const t = useT()
  return <span className={`status-chip is-${status}`}>{t(`culto.statusName.${status}`)}</span>
}
