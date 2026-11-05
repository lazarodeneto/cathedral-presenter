import { useEffect, useState } from 'react'
import { Expand, Minimize2, Monitor, Radio, Snowflake } from 'lucide-react'
import type { OutputSnapshot } from '../providers/output/OutputProvider'
import { webOutputProvider } from '../providers/output/WebOutputProvider'
import type { Branding, Slide, SlideTransition } from '../types'
import { useT } from '../i18n/useT'
import { SlideRenderer } from '../components/SlideRenderer'
import { TimerSourceContext } from '../components/timer/useTimer'
import { useShortcutHandlers } from '../shortcuts/registry'
import { SHORTCUT_ACTIONS } from '../shortcuts/actions'
import { BrandMark } from '../components/BrandMark'
import { applyTheme, DEFAULT_BRANDING, normalizeBranding } from '../utils/branding'
import { elapsedLabel } from '../utils/dates'
import { ASPECT_RATIO, outputFormat, resolutionLabel, type OutputFormat } from '../utils/outputFormats'

const FALLBACK_BRANDING: Branding = DEFAULT_BRANDING

function TestPattern({ label, format }: { label: string; format: OutputFormat }) {
  const t = useT()
  return (
    <div className="test-pattern">
      <div className="test-bars">
        <span /><span /><span /><span /><span /><span /><span />
      </div>
      <div className="test-safe-zone">
        <div className="test-mark">CP</div>
        <strong>{label}</strong>
        <span>{t('output.testCopy')}</span>
      </div>
      <div className="test-center">
        <span className="test-crosshair" />
      </div>
      <small className="test-corner">
        {format.name} · {resolutionLabel(format)} · {format.ratio}
      </small>
      <small className="test-corner test-corner-right">{t('output.testPattern')}</small>
    </div>
  )
}

function Standby({ branding }: { branding: Branding }) {
  const t = useT()
  return (
    <div className="output-standby">
      <BrandMark branding={branding} size="lg" />
      <span className="standby-church">{branding.name || t('app.name')}</span>
      <h1 className="standby-welcome">{t('output.welcome')}</h1>
    </div>
  )
}

function NoSignal() {
  const t = useT()
  return (
    <div className="output-nosignal">
      <span className="status-dot status-dot-disconnected" />
      <strong>{t('output.noSignal')}</strong>
      <span>{t('output.idleCopy')}</span>
    </div>
  )
}

export function OutputScreen({ role }: { role: 'audience' | 'confidence' }) {
  const t = useT()
  const [snapshot, setSnapshot] = useState<OutputSnapshot | null>(() => webOutputProvider.readSnapshot())
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement))
  const [, setTick] = useState(0)
  const format = outputFormat(snapshot?.audience.format)

  useEffect(() => {
    setSnapshot(webOutputProvider.readSnapshot())
    const unsubscribe = webOutputProvider.subscribe((next) => setSnapshot(next))
    const onFocus = () => setSnapshot(webOutputProvider.readSnapshot())
    const onFullscreen = () => setFullscreen(Boolean(document.fullscreenElement))
    window.addEventListener('focus', onFocus)
    document.addEventListener('fullscreenchange', onFullscreen)
    return () => {
      unsubscribe()
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('fullscreenchange', onFullscreen)
    }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const audience = snapshot?.audience
  const confidence = snapshot?.confidence
  const branding = role === 'audience'
    ? audience?.branding ?? FALLBACK_BRANDING
    : confidence?.branding ?? FALLBACK_BRANDING

  const toggleFullscreen = async () => {
    const entered = await webOutputProvider.requestFullscreen()
    setFullscreen(entered)
  }

  // Presentation keys pressed while an output window has focus are relayed to
  // the operator window, which runs them exactly as if pressed there.
  // Fullscreen applies to this window itself.
  useShortcutHandlers(
    'presentation',
    {
      ...Object.fromEntries(
        SHORTCUT_ACTIONS.filter((action) => action.contexts.includes('presentation') && action.id !== 'app.fullscreen').map(
          (action) => [action.id, () => webOutputProvider.sendCommand(action.id)],
        ),
      ),
      'app.fullscreen': () => {
        void toggleFullscreen()
      },
    },
  )

  // Output windows follow the branding published with each snapshot.
  useEffect(() => {
    applyTheme(normalizeBranding(branding).theme)
  }, [branding])

  const stageTimer = confidence?.startedAt ? elapsedLabel(confidence.startedAt) : '00:00:00'

  if (!snapshot) {
    return (
      <div className={`output-window output-${role}`}>
        <NoSignal />
        <OutputChrome role={role} monitor={null} fullscreen={fullscreen} onFullscreen={toggleFullscreen} />
      </div>
    )
  }

  if (role === 'confidence') {
    if (!confidence) return <div className="output-window"><NoSignal /></div>
    const mode = confidence.mode
    const isTest = mode === 'test'
    return (
      <TimerSourceContext.Provider value={snapshot.timers ?? {}}>
        <div className="output-window output-confidence">
          {isTest ? (
            <TestPattern label={confidence.testMonitorName ?? confidence.monitorName} format={format} />
          ) : mode === 'live' || mode === 'ended' ? (
            <div className="stage-output">
              <header className="stage-output-head">
                <div className="stage-brand">
                  <BrandMark branding={confidence.branding} size="sm" />
                  <strong>{confidence.monitorName}</strong>
                </div>
                <div className="stage-status">
                  <span className={`live-state ${mode === 'ended' ? 'is-frozen' : 'is-live'}`}>
                    <span className="live-dot" />
                    {mode === 'ended' ? t('output.ended') : t('status.live')}
                  </span>
                  <span className="stage-position">{confidence.position ?? '—'}</span>
                  <span className="stage-timer">{stageTimer}</span>
                </div>
              </header>

              {mode === 'ended' || !confidence.current ? (
                <div className="stage-ended">
                  <h1>{t('output.ended')}</h1>
                  <span>{confidence.branding.name}</span>
                </div>
              ) : (
                <>
                  <div className="stage-grid">
                    <section className="stage-current">
                      <div className="stage-label">
                        <span className="eyebrow">{t('live.current')}</span>
                        <span>{confidence.sectionTitle} · {confidence.itemTitle}</span>
                      </div>
                      <div className="stage-frame">
                        <SlideRenderer slide={confidence.current} branding={confidence.branding} aspectRatio={format.aspect} />
                        {confidence.current.notes && (
                          <span className="stage-notes-pill">{confidence.current.notes}</span>
                        )}
                      </div>
                    </section>
                    <section className="stage-next">
                      <div className="stage-label">
                        <span className="eyebrow">{t('live.next')}</span>
                      </div>
                      <div className="stage-frame">
                        {confidence.next ? (
                          <SlideRenderer slide={confidence.next} branding={confidence.branding} aspectRatio={format.aspect} />
                        ) : (
                          <div className="stage-frame-empty">{t('live.ended')}</div>
                        )}
                      </div>
                    </section>
                  </div>
                  <footer className="stage-output-foot">
                    <div>
                      <span className="eyebrow">{t('live.notes')}</span>
                      <p>{confidence.notes || t('live.noNotes')}</p>
                    </div>
                    <span className="stage-role">
                      <Monitor size={14} />
                      {t('output.confidence')}
                    </span>
                  </footer>
                </>
              )}
            </div>
          ) : (
            <Standby branding={confidence.branding} />
          )}
          <OutputChrome
            role={role}
            monitor={isTest ? confidence.testMonitorName ?? confidence.monitorName : confidence.monitorName}
            fullscreen={fullscreen}
            onFullscreen={toggleFullscreen}
          />
        </div>
      </TimerSourceContext.Provider>
    )
  }

  if (!audience) return <div className="output-window"><NoSignal /></div>
  const mode = audience.mode
  return (
    <TimerSourceContext.Provider value={snapshot.timers ?? {}}>
      <div
        className={`output-window output-audience ${mode === 'blank' ? 'is-blank' : ''}`}
        style={{ '--output-ratio': ASPECT_RATIO[format.aspect] } as React.CSSProperties}
        data-format={format.id}
      >
        {mode === 'test' ? (
          <TestPattern label={audience.testMonitorName ?? audience.monitorName} format={format} />
        ) : mode === 'blank' ? (
          // Blank means a black screen for the audience: nothing drawn, the state is named for assistive tech only.
          <div className="output-black" role="img" aria-label={t('output.blank')} />
        ) : mode === 'live' && audience.slide ? (
          <div className="audience-frame">
            <TransitionStage
              slide={audience.slide}
              transition={audience.transition}
              render={(slide) => (
                <SlideRenderer
                  slide={slide}
                  branding={audience.branding}
                  aspectRatio={format.aspect}
                  message={audience.message}
                  messageVisible={audience.messageVisible}
                />
              )}
            />
            {audience.isFrozen && (
              <span className="output-frozen-hint">
                <Snowflake size={13} />
                {t('output.frozen')}
              </span>
            )}
          </div>
        ) : mode === 'ended' ? (
          <div className="output-ended">
            <BrandMark branding={audience.branding} size="lg" />
            <span className="eyebrow">{t('output.ended')}</span>
          </div>
        ) : (
          <Standby branding={audience.branding} />
        )}
        <OutputChrome
          role={role}
          monitor={mode === 'test' ? audience.testMonitorName ?? audience.monitorName : audience.monitorName}
          fullscreen={fullscreen}
          onFullscreen={toggleFullscreen}
        />
      </div>
    </TimerSourceContext.Provider>
  )
}

/**
 * Plays the transition into each new slide: the outgoing slide stays under
 * the incoming one until the animation ends. Edits to the same slide (same id)
 * update in place without animating; a cut, or reduced motion, swaps at once.
 */
function TransitionStage({
  slide,
  transition,
  render,
}: {
  slide: Slide
  transition?: SlideTransition
  render: (slide: Slide) => React.ReactNode
}) {
  const [outgoing, setOutgoing] = useState<Slide | null>(null)
  const [shownId, setShownId] = useState(slide.id)
  const [lastSlide, setLastSlide] = useState(slide)
  const type = transition?.type ?? 'fade'
  const duration = transition?.durationMs ?? 600
  const animate = type !== 'cut' && duration > 0

  // A different slide came in: keep the previous one as the outgoing layer.
  if (slide.id !== shownId) {
    setOutgoing(animate ? lastSlide : null)
    setShownId(slide.id)
  }
  if (slide !== lastSlide) setLastSlide(slide)

  useEffect(() => {
    if (!outgoing) return
    const timer = window.setTimeout(() => setOutgoing(null), duration + 40)
    return () => window.clearTimeout(timer)
  }, [outgoing, duration])

  const style = { '--transition-ms': `${duration}ms` } as React.CSSProperties
  return (
    <div className={`transition-stage is-${type}`} style={style}>
      {outgoing && (
        <div key={`out-${outgoing.id}`} className="transition-layer is-outgoing" aria-hidden="true">
          {render(outgoing)}
        </div>
      )}
      <div key={`in-${shownId}`} className={`transition-layer ${outgoing ? 'is-incoming' : ''}`}>
        {render(slide)}
      </div>
    </div>
  )
}

function OutputChrome({
  role,
  monitor,
  fullscreen,
  onFullscreen,
}: {
  role: 'audience' | 'confidence'
  monitor: string | null
  fullscreen: boolean
  onFullscreen: () => void
}) {
  const t = useT()
  return (
    <div className="output-chrome">
      <span className="output-chrome-role">
        <Radio size={13} />
        {role === 'audience' ? t('output.audience') : t('output.confidence')}
        {monitor ? ` · ${monitor}` : ''}
      </span>
      <span className="output-chrome-sim">{t('output.simulated')}</span>
      <button className="output-chrome-btn" onClick={onFullscreen} aria-label={fullscreen ? t('output.exitFullscreen') : t('output.fullscreen')}>
        {fullscreen ? <Minimize2 size={15} /> : <Expand size={15} />}
      </button>
    </div>
  )
}
