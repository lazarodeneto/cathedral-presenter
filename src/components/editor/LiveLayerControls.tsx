import { CueControls } from './CueControls'
import { useState } from 'react'
import { Layers, Monitor, Send, Type, Film } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useT'
import { SortSelect } from '../SortSelect'
import { TimerDurationField } from '../timer/TimerDurationField'
import { TimerControls } from '../timer/TimerControls'
import { makeSlide } from '../../utils/slides'

export function LiveLayerControls() {
  const t = useT(), live = useAppStore((s) => s.live), assets = useAppStore((s) => s.mediaLibrary), timers = useAppStore((s) => s.timers)
  const clear = useAppStore((s) => s.clearLiveLayer), background = useAppStore((s) => s.setLiveBackground), setMessage = useAppStore((s) => s.setStageMessage), countdown = useAppStore((s) => s.startStageCountdown)
  const [draft, setDraft] = useState(''), [seconds, setSeconds] = useState(300), [valid, setValid] = useState(true)
  if (!live) return null
  const ready = assets.filter((a) => a.status === 'ready' && a.provider === 'upload' && a.kind !== 'audio')
  const timer = makeSlide({ id: 'stage', kind: 'timer', title: t('add.timer'), timer: { durationSeconds: (timers.stage?.durationMs ?? 300000) / 1000 } })
  return <>
    <CueControls />
    <details className="live-extra-controls"><summary><Layers size={15} />{t('editor.layers')}</summary>
      <div className="live-extra-body"><div className="media-playback-buttons">
        <button className="btn btn-secondary btn-sm" disabled={live.frozen} aria-pressed={Boolean(live.textHidden)} onClick={() => clear('text')}><Type size={15} />{t('routing.clearText')}</button>
        <button className="btn btn-secondary btn-sm" disabled={live.frozen} aria-pressed={Boolean(live.mediaHidden)} onClick={() => clear('media')}><Film size={15} />{t('routing.clearMedia')}</button>
      </div><SortSelect label={t('routing.background')} value={live.background?.source ?? ''} onChange={(value) => background(ready.find((a) => a.source === value)?.id ?? null)} options={[{ value: '', label: t('routing.clearBackground') }, ...ready.map((a) => ({ value: a.source, label: a.name }))]} /></div>
    </details>
    <details className="live-extra-controls"><summary><Monitor size={15} />{t('routing.stagePrivate')}</summary><div className="live-extra-body">
      <label className="field"><span>{t('routing.stageMessage')}</span><textarea rows={2} maxLength={1000} value={draft} onChange={(e) => setDraft(e.target.value)} /></label>
      <div className="media-playback-buttons"><button className="btn btn-secondary btn-sm" disabled={!draft.trim()} onClick={() => setMessage(draft)}><Send size={14} />{t('live.sendMessage')}</button><button className="btn btn-ghost btn-sm" onClick={() => { setMessage(''); setDraft('') }}>{t('live.clearMessage')}</button></div>
      {live.stageMessage && <p role="status">{live.stageMessage}</p>}
      <TimerDurationField value={seconds} onChange={setSeconds} onValidityChange={setValid} />
      <button className="btn btn-secondary btn-sm" disabled={!valid} onClick={() => countdown(seconds)}>{t('timer.start')}</button>
      {timers.stage && <TimerControls slide={timer} />}
    </div></details>
  </>
}
