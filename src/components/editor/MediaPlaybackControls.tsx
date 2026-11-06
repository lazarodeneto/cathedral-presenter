import { useEffect, useReducer } from 'react'
import { Pause, Play, RotateCcw, Square, Volume2 } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { webOutputProvider } from '../../providers/output/WebOutputProvider'
import { useT } from '../../i18n/useT'
import { mediaPosition } from '../../media/playback'
import { formatTimer } from '../../utils/timer'

export function MediaPlaybackControls() {
  const t = useT()
  const live = useAppStore((s) => s.live)
  const command = useAppStore((s) => s.mediaCommand)
  const [, update] = useReducer((n: number) => n + 1, 0)
  useEffect(() => {
    const unsub = webOutputProvider.onConnectionsChanged(update)
    const timer = setInterval(update, 500)
    return () => { unsub(); clearInterval(timer) }
  }, [])
  if (!live?.media || !Object.keys(live.media.elements).length) return null
  const feedback = webOutputProvider.getMediaFeedback(live.media.slideId)
  return <section className="media-playback-controls" aria-label={t('playback.title')}>
    <strong><Volume2 size={15} />{t('playback.title')}</strong>
    {Object.entries(live.media.elements).map(([id, transport], index) => {
      const media = feedback.find((entry) => entry.id === id)
      const duration = media?.duration ?? 0
      const position = mediaPosition(transport, Date.now(), duration || Infinity)
      return <fieldset key={id} disabled={live.frozen}>
        <legend>{t(transport.kind === 'audio' ? 'editor.audio' : 'editor.video')} {index + 1}{duration > 0 ? ` · ${t('playback.remaining')} ${formatTimer(Math.max(0, duration - position) * 1000)}` : ''}</legend>
        <div className="media-playback-buttons">
          <button className="btn btn-secondary btn-sm" onClick={() => command(id, transport.status === 'playing' ? 'pause' : 'play')} aria-label={t(transport.status === 'playing' ? 'playback.pause' : 'playback.play')}>{transport.status === 'playing' ? <Pause size={15} /> : <Play size={15} />}{t(transport.status === 'playing' ? 'playback.pause' : 'playback.play')}</button>
          <button className="icon-btn" title={t('playback.stop')} aria-label={t('playback.stop')} onClick={() => command(id, 'stop')}><Square size={15} /></button>
          <button className="icon-btn" title={t('playback.restart')} aria-label={t('playback.restart')} onClick={() => command(id, 'restart')}><RotateCcw size={15} /></button>
          <button className="btn btn-ghost btn-sm" aria-pressed={transport.loop} onClick={() => command(id, 'loop')}>{t('playback.loop')}</button>
        </div>
        <input type="range" aria-label={t('playback.seek')} min={0} max={duration || 1} step={0.1} value={Math.min(position, duration || 1)} disabled={!duration} onChange={(e) => command(id, 'seek', Number(e.target.value))} />
        <div className="media-playback-volume"><label>{t('playback.volume')}<input type="range" min={0} max={1} step={0.01} value={transport.volume} onChange={(e) => command(id, 'volume', Number(e.target.value))} /></label><button className="btn btn-ghost btn-sm" aria-pressed={transport.muted} onClick={() => command(id, 'mute')}>{t('playback.mute')}</button></div>
        {media && ['error', 'blocked', 'loading'].includes(media.state) && <p role="status" className="inline-warning">{t('playback.error')}</p>}
      </fieldset>
    })}
  </section>
}
