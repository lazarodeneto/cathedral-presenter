import type { TimerRuntime } from '../../types'
import { formatTimer, timerRemainingMs, timerStatusAt } from '../../utils/timer'
import { useNow } from './useTimer'

export function StageCountdown({ runtime }: { runtime?: TimerRuntime }) {
  const now = useNow(runtime?.status === 'running' ? runtime.endsAt : null)
  if (!runtime) return null
  return <span className={`stage-countdown is-${timerStatusAt(runtime, now)}`} role="timer" aria-live="off">{formatTimer(timerRemainingMs(runtime, now))}</span>
}
