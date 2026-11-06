import { useState } from 'react'
import { Play, Plus, Trash2 } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useT'
import { newId } from '../../utils/id'
export function CueControls() {
  const live = useAppStore((s) => s.live), settings = useAppStore((s) => s.settings), update = useAppStore((s) => s.updateSettings), run = useAppStore((s) => s.runCue)
  const [name, setName] = useState(''), t = useT()
  if (!live) return null
  const cues = settings.cues ?? []
  return <details className="live-extra-controls"><summary><Play size={15} />{t('control.cues')}</summary><div className="live-extra-body">
    <label className="field"><span>{t('control.cueName')}</span><input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} /></label>
    <button className="btn btn-secondary btn-sm" disabled={!name.trim() || cues.length >= 100} onClick={() => { update({ cues: [...cues, { id: newId('cue'), name: name.trim(), slideId: live.currentSlideId, backgroundAssetId: useAppStore.getState().mediaLibrary.find((a) => a.source === live.background?.source)?.id, layout: settings.outputProfiles?.broadcast?.layout, stageMessage: live.stageMessage, stageSeconds: useAppStore.getState().timers.stage?.durationMs ? useAppStore.getState().timers.stage.durationMs / 1000 : undefined }] }); setName('') }}><Plus size={14} />{t('control.saveCue')}</button>
    {cues.map((cue) => <div className="cue-row" key={cue.id}><button className="btn btn-secondary btn-sm" onClick={() => run(cue.id)}><Play size={14} />{cue.name}</button><button className="icon-btn" aria-label={`${t('common.delete')}: ${cue.name}`} onClick={() => update({ cues: cues.filter((c) => c.id !== cue.id) })}><Trash2 size={14} /></button></div>)}
  </div></details>
}
