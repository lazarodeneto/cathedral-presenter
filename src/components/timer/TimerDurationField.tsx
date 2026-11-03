import { useEffect, useId, useRef, useState } from 'react'
import { useT } from '../../i18n/useT'
import { splitTimerSeconds, validateTimerDuration, type TimerDurationError } from '../../utils/timer'

const ERROR_KEYS: Record<TimerDurationError, string> = {
  'not-a-number': 'timer.error.number',
  'not-whole': 'timer.error.whole',
  negative: 'timer.error.negative',
  'seconds-range': 'timer.error.seconds',
  'too-long': 'timer.error.max',
}

/**
 * Minutes + seconds entry for a timer. Reports only valid totals (0–3600 s);
 * while the entry is invalid it shows why and keeps the last valid value.
 */
export function TimerDurationField({
  value,
  onChange,
  onValidityChange,
}: {
  value: number
  onChange: (seconds: number) => void
  onValidityChange?: (valid: boolean) => void
}) {
  const t = useT()
  const id = useId()
  const initial = splitTimerSeconds(value)
  const [minutes, setMinutes] = useState(String(initial.minutes))
  const [seconds, setSeconds] = useState(String(initial.seconds).padStart(2, '0'))
  const [error, setError] = useState<TimerDurationError | null>(null)
  const entryRef = useRef({ minutes, seconds })
  entryRef.current = { minutes, seconds }

  // Follow outside changes (another slide selected, reset) without fighting typing.
  useEffect(() => {
    const next = splitTimerSeconds(value)
    const current = validateTimerDuration(entryRef.current.minutes, entryRef.current.seconds)
    if (!current.ok || current.seconds !== value) {
      setMinutes(String(next.minutes))
      setSeconds(String(next.seconds).padStart(2, '0'))
      setError(null)
    }
  }, [value])

  const update = (nextMinutes: string, nextSeconds: string) => {
    setMinutes(nextMinutes)
    setSeconds(nextSeconds)
    const result = validateTimerDuration(nextMinutes, nextSeconds)
    setError(result.ok ? null : result.reason)
    onValidityChange?.(result.ok)
    if (result.ok && result.seconds !== value) onChange(result.seconds)
  }

  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  return (
    <fieldset className="timer-duration" aria-describedby={error ? errorId : hintId}>
      <legend>{t('timer.duration')}</legend>
      <div className="timer-duration-inputs">
        <label className="field compact">
          <span>{t('timer.minutes')}</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={60}
            step={1}
            value={minutes}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : hintId}
            onChange={(event) => update(event.target.value, seconds)}
          />
        </label>
        <span className="timer-duration-sep" aria-hidden="true">
          :
        </span>
        <label className="field compact">
          <span>{t('timer.seconds')}</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={59}
            step={1}
            value={seconds}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : hintId}
            onChange={(event) => update(minutes, event.target.value)}
          />
        </label>
      </div>
      {error ? (
        <p id={errorId} className="timer-duration-error" role="alert">
          {t(ERROR_KEYS[error])}
        </p>
      ) : (
        <p id={hintId} className="timer-duration-hint">
          {t('timer.durationHint')}
        </p>
      )}
    </fieldset>
  )
}
