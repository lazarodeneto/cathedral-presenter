import type { Slide } from '../../types'
import { useT } from '../../i18n/useT'
import { formatTimer } from '../../utils/timer'
import { useTimerReading } from './useTimer'

/**
 * The countdown as the audience sees it, drawn inside the 16:9 slide canvas.
 * Sizes use container units so it reads the same on a thumbnail, the editor
 * canvas, and a projector.
 */
export function TimerFace({ slide, smooth = true }: { slide: Slide; smooth?: boolean }) {
  const t = useT()
  const { status, remainingMs, progress } = useTimerReading(slide, smooth)
  const label =
    status === 'completed'
      ? t('timer.completed')
      : status === 'paused'
        ? t('timer.paused')
        : status === 'idle'
          ? t('timer.ready')
          : null
  return (
    <div className={`timer-layout is-${status}`} role="timer" aria-live="off">
      {slide.title && <span className="eyebrow slide-eyebrow timer-title">{slide.title}</span>}
      <span className="timer-digits">{formatTimer(remainingMs)}</span>
      <span className="timer-state">{label ?? ' '}</span>
      <span className="timer-progress" aria-hidden="true">
        <span style={{ transform: `scaleX(${progress})` }} />
      </span>
    </div>
  )
}
