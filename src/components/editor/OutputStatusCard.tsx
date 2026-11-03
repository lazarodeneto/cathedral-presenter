import { useEffect, useState, type ReactNode } from 'react'
import { CircleAlert, Play, Square } from 'lucide-react'
import { useT } from '../../i18n/useT'
import { elapsedLabel } from '../../utils/dates'

/**
 * The top of the inspector: whether this service is on the audience screen,
 * and the one action that changes that. Not live: a calm status and a single
 * Present button (with its shortcut, or the reason it cannot start yet).
 * Live: the green LIVE state, elapsed time, and End live.
 */
export function OutputStatusCard({
  isLive,
  startedAt,
  outputName,
  problem,
  presentShortcut,
  onPresent,
  onEnd,
  tools,
}: {
  isLive: boolean
  startedAt: string | null
  outputName: string | null
  /** Translated reason the service cannot be presented yet, if any. */
  problem: string | null
  presentShortcut: string | null
  onPresent: () => void
  onEnd: () => void
  /** Slide format and service details controls, shown in a quiet row below. */
  tools: ReactNode
}) {
  const t = useT()
  const [, tick] = useState(0)

  // Refresh the elapsed time once a second while live.
  useEffect(() => {
    if (!isLive) return
    const timer = window.setInterval(() => tick((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [isLive])

  return (
    <section className={`output-status ${isLive ? 'is-live' : ''}`} aria-label={t('editor.outputStatus')}>
      <div className="output-status-line">
        <span className={`output-status-dot ${isLive ? 'is-live' : ''}`} aria-hidden="true" />
        <span className="output-status-state">{isLive ? t('status.live') : t('editor.notLive')}</span>
        <span className="output-status-meta">
          {isLive ? elapsedLabel(startedAt) : outputName ?? t('live.noAudience')}
        </span>
      </div>

      {isLive ? (
        <button type="button" className="btn output-status-action is-end" onClick={onEnd}>
          <Square size={14} fill="currentColor" />
          {t('live.endLive')}
        </button>
      ) : (
        <button
          type="button"
          className="btn btn-primary output-status-action"
          onClick={onPresent}
          disabled={Boolean(problem)}
          aria-describedby={problem ? 'output-status-problem' : undefined}
        >
          <Play size={15} fill="currentColor" />
          {t('editor.present')}
          {presentShortcut && <kbd>{presentShortcut}</kbd>}
        </button>
      )}

      {!isLive && problem && (
        <p className="output-status-problem" id="output-status-problem">
          <CircleAlert size={13} aria-hidden="true" />
          {problem}
        </p>
      )}

      <div className="output-status-tools">{tools}</div>
    </section>
  )
}
