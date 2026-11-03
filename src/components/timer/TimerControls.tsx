import { Pause, Play, RotateCcw } from 'lucide-react'
import type { Slide } from '../../types'
import { useT } from '../../i18n/useT'
import { useAppStore } from '../../store/useAppStore'
import { formatTimer, timerActions } from '../../utils/timer'
import { useTimerReading } from './useTimer'

/**
 * Start / Pause / Resume / Reset for one timer slide, with a live readout.
 * Shared by the editor inspector and the live console, so both drive the same
 * store entry and always agree.
 */
export function TimerControls({ slide, compact = false }: { slide: Slide; compact?: boolean }) {
  const t = useT()
  const timerCommand = useAppStore((state) => state.timerCommand)
  const { status, remainingMs } = useTimerReading(slide)
  const actions = timerActions(status)
  const statusLabel = t(`timer.status.${status}`)

  return (
    <div className={`timer-controls is-${status} ${compact ? 'is-compact' : ''}`}>
      <div className="timer-readout">
        <span className="timer-readout-digits" aria-hidden="true">
          {formatTimer(remainingMs)}
        </span>
        <span className={`timer-chip is-${status}`}>{statusLabel}</span>
        <span className="sr-only" aria-live="polite">
          {statusLabel}
        </span>
      </div>
      <div className="timer-buttons" role="group" aria-label={t('timer.controls')}>
        {status === 'paused' ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => timerCommand(slide.id, 'resume')}
            disabled={!actions.canResume}
          >
            <Play size={14} fill="currentColor" />
            {t('timer.resume')}
          </button>
        ) : status === 'running' ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => timerCommand(slide.id, 'pause')}
            disabled={!actions.canPause}
          >
            <Pause size={14} />
            {t('timer.pause')}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => timerCommand(slide.id, 'start')}
            disabled={!actions.canStart}
          >
            <Play size={14} fill="currentColor" />
            {t('timer.start')}
          </button>
        )}
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => timerCommand(slide.id, 'reset')}
          disabled={!actions.canReset}
        >
          <RotateCcw size={14} />
          {t('timer.reset')}
        </button>
      </div>
    </div>
  )
}
