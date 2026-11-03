import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import * as QRCode from 'qrcode'
import type { Branding, Slide, SlideElement } from '../types'
import { BrandMark } from './BrandMark'
import { isSafeQrPayload } from '../security/url'
import { useT } from '../i18n/useT'
import { TimerFace } from './timer/TimerFace'
import { MessageBoxView } from './MessageBoxView'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { DEFAULT_CONTENT_Z, SLIDE_TEXT_DEFAULTS } from '../utils/slides'

/** Smallest auto-fit scale: 64 shrinks to about 19 before text is allowed to clip. */
const MIN_FIT_SCALE = 0.3

function overflows(element: HTMLElement): boolean {
  return element.scrollHeight > element.clientHeight + 1 || element.scrollWidth > element.clientWidth + 1
}

/**
 * Auto-fit: when a slide's text is taller than its area, shrink it until it fits.
 * Text sizes are written as `calc(size * var(--fit, 1))`; this finds the largest
 * --fit (at most 1, so text never grows) that has no overflow, by binary search
 * on the live layout. It reruns when the text or font settings change, when the
 * canvas resizes, and once web fonts have loaded.
 */
export function useAutoFit(ref: RefObject<HTMLElement | null>, key: string) {
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const fit = () => {
      element.style.setProperty('--fit', '1')
      if (!overflows(element)) return
      let low = MIN_FIT_SCALE
      let high = 1
      for (let step = 0; step < 9; step += 1) {
        const middle = (low + high) / 2
        element.style.setProperty('--fit', middle.toFixed(4))
        if (overflows(element)) high = middle
        else low = middle
      }
      element.style.setProperty('--fit', low.toFixed(4))
    }
    fit()
    let cancelled = false
    void document.fonts?.ready.then(() => {
      if (!cancelled) fit()
    })
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fit)
    observer?.observe(element)
    return () => {
      cancelled = true
      observer?.disconnect()
    }
  }, [ref, key])
}

/** Font, size and weight for slide text, falling back to the standard slide text. */
function slideTextStyle(
  source: Pick<Slide, 'fontFamily' | 'fontSize' | 'fontWeight'>,
  scale = 1,
): React.CSSProperties {
  const fontSize = source.fontSize ?? SLIDE_TEXT_DEFAULTS.fontSize
  return {
    fontFamily: source.fontFamily === 'serif' ? 'var(--font-slide-serif)' : 'var(--font-ui)',
    fontSize: `calc(${(fontSize * scale) / 12.8}cqw * var(--fit, 1))`,
    fontWeight: source.fontWeight ?? SLIDE_TEXT_DEFAULTS.fontWeight,
  }
}

export function QrImage({ payload, className }: { payload: string; className?: string }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    let active = true
    if (!isSafeQrPayload(payload, 'text')) {
      setSrc('')
      return
    }
    QRCode.toDataURL(payload, {
      width: 512,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#12100e', light: '#fff8ec' },
    })
      .then((value) => {
        if (active) setSrc(value)
      })
      .catch(() => {
        if (active) setSrc('')
      })
    return () => {
      active = false
    }
  }, [payload])

  if (!src) return <span className="qr-placeholder" />
  return <img src={src} alt="" className={className} draggable={false} />
}

function safeSource(source?: string): string | undefined {
  if (!source) return undefined
  if (
    source.startsWith('blob:') ||
    /^data:image\/(?:png|jpe?g|webp|gif|avif);base64,/i.test(source) ||
    /^https:\/\//i.test(source)
  ) {
    return source
  }
  return undefined
}

function elementTextClass(element: SlideElement): string {
  const weight = element.settings?.fontWeight ?? SLIDE_TEXT_DEFAULTS.fontWeight
  return weight >= 700 ? 'is-bold' : weight >= 600 ? 'is-semibold' : weight <= 300 ? 'is-light' : ''
}

function SlideMedia({
  element,
  source,
  online,
}: {
  element: SlideElement
  source?: string
  online: boolean
}) {
  const t = useT()
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const settings = element.settings ?? {}
  const mediaRadius = settings.radius && settings.radius >= 999 ? '50%' : settings.radius
  const missing = !source || settings.missing
  const unsupported = settings.status === 'unsupported'
  const offline = Boolean(settings.onlineOnly && !online)
  const cropX = settings.cropX ?? 50
  const cropY = settings.cropY ?? 50
  const cropZoom = settings.cropZoom ?? 1
  const objectPosition = settings.objectPosition ?? `${cropX}% ${cropY}%`

  useEffect(() => {
    setState('loading')
  }, [source, element.id])

  const blocked = missing || unsupported || offline || state === 'error'

  return (
    <span
      className={`slide-element-media-wrap ${blocked ? 'is-blocked' : ''}`}
      style={{ borderRadius: mediaRadius }}
    >
      {!blocked &&
        (element.type === 'image' ? (
          <img
            src={source}
            alt={element.text ?? ''}
            className="slide-element-media"
            style={{
              objectFit: settings.fit ?? 'cover',
              objectPosition,
              borderRadius: mediaRadius,
              transform: `scale(${cropZoom})`,
              transformOrigin: objectPosition,
            }}
            draggable={false}
            onLoad={() => setState('ready')}
            onError={() => setState('error')}
          />
        ) : (
          <video
            src={source}
            className="slide-element-media"
            style={{
              objectFit: settings.fit ?? 'contain',
              objectPosition,
              borderRadius: mediaRadius,
              transform: `scale(${cropZoom})`,
              transformOrigin: objectPosition,
            }}
            autoPlay
            muted
            loop
            playsInline
            onLoadedData={() => setState('ready')}
            onError={() => setState('error')}
          />
        ))}
      {!blocked && state === 'loading' && <span className="slide-media-loading" />}
      {blocked && (
        <span className={`slide-element-media-state is-${offline ? 'offline' : missing ? 'missing' : 'error'}`}>
          <strong>
            {t(
              missing
                ? 'media.missing'
                : offline
                  ? 'media.offline'
                  : unsupported
                    ? 'media.unsupported'
                    : 'media.unsupported',
            )}
          </strong>
          <small>
            {t(
              offline
                ? 'editor.onlineOnly'
                : missing
                  ? 'media.missingHelp'
                  : 'error.unsupportedType',
            )}
          </small>
        </span>
      )}
    </span>
  )
}

export interface SlideRendererProps {
  slide: Slide | null
  branding: Branding
  className?: string
  compact?: boolean
  /** Small slide-strip thumbnail: text only, without heading, pills, footer or logo. */
  thumbnail?: boolean
  interactive?: boolean
  selectedElementId?: string | null
  showSafeArea?: boolean
  onSelectElement?: (id: string | null) => void
  onMoveElement?: (id: string, x: number, y: number) => void
  onResizeElement?: (id: string, box: { x: number; y: number; width: number; height: number }) => void
  onEditElementText?: (id: string, text: string) => void
  /** id of an element describing the keyboard controls, read after each element's label */
  keyboardHintId?: string
  /** Reports how much a message box had to shrink its text to fit (1 = not at all). */
  onMessageFit?: (id: string, scale: number) => void
  onEditSlideText?: (text: string) => void
  message?: string | null
  messageVisible?: boolean
  songFooter?: { title: string; author?: string }
  aspectRatio?: 'wide' | 'classic'
}

const ELEMENT_TYPE_KEYS: Record<string, string> = {
  text: 'editor.text',
  image: 'editor.image',
  video: 'editor.video',
  embed: 'editor.youtube',
  qr: 'editor.qr',
  shape: 'editor.shape',
  message: 'editor.messageBox',
}

function elementLabel(element: SlideElement, t: (key: string) => string): string {
  const kind = t(ELEMENT_TYPE_KEYS[element.type] ?? 'editor.element')
  const name = (element.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 60)
  return name && element.type !== 'shape' ? `${kind}: ${name}` : kind
}

export function SlideRenderer({
  slide,
  branding,
  className = '',
  compact = false,
  thumbnail = false,
  interactive = false,
  selectedElementId = null,
  showSafeArea = false,
  onSelectElement,
  onMoveElement,
  onResizeElement,
  onEditElementText,
  keyboardHintId,
  onMessageFit,
  onEditSlideText,
  message,
  messageVisible,
  songFooter,
  aspectRatio = 'wide',
}: SlideRendererProps) {
  const t = useT()
  const online = useOnlineStatus()
  const rootRef = useRef<HTMLDivElement>(null)
  const fitRef = useRef<HTMLDivElement>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingSlideText, setEditingSlideText] = useState(false)
  const [drag, setDrag] = useState<{
    id: string
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)
  const [resize, setResize] = useState<{
    id: string
    corner: 'nw' | 'ne' | 'sw' | 'se'
    startX: number
    startY: number
    originX: number
    originY: number
    originW: number
    originH: number
  } | null>(null)

  // Refit whenever anything that changes the text's size changes.
  useAutoFit(
    fitRef,
    slide
      ? [slide.id, slide.kind, slide.text, slide.bible?.primary.text, slide.bible?.secondary?.text, slide.fontFamily, slide.fontSize, slide.fontWeight, aspectRatio].join('|')
      : '',
  )

  if (!slide) {
    return <div className={`slide-canvas slide-empty ${className}`} />
  }

  const background = slide.background
  const backgroundImage =
    background.type === 'image' ? safeSource(background.source) : undefined
  const backgroundPosition = background.backgroundPosition ?? '50% 50%'
  const backgroundZoom = background.backgroundZoom ?? 100
  const backgroundSize = backgroundZoom > 100
    ? String(backgroundZoom) + '% ' + String(backgroundZoom) + '%'
    : 'cover'
  const tone = background.tone ?? 'dark'
  const align = slide.textAlign

  const onElementPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    element: SlideElement,
  ) => {
    if (!interactive) return
    event.stopPropagation()
    if (editingId && editingId !== element.id) setEditingId(null)
    onSelectElement?.(element.id)
    const corner = (event.target as HTMLElement).dataset.resize as
      | 'nw'
      | 'ne'
      | 'sw'
      | 'se'
      | undefined
    if (corner && onResizeElement) {
      event.currentTarget.setPointerCapture(event.pointerId)
      setResize({
        id: element.id,
        corner,
        startX: event.clientX,
        startY: event.clientY,
        originX: element.x,
        originY: element.y,
        originW: element.width,
        originH: element.height,
      })
      return
    }
    if (!onMoveElement) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({
      id: element.id,
      startX: event.clientX,
      startY: event.clientY,
      originX: element.x,
      originY: element.y,
    })
  }

  const onElementPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!rootRef.current) return
    const rect = rootRef.current.getBoundingClientRect()
    if (resize && onResizeElement) {
      const dx = ((event.clientX - resize.startX) / rect.width) * 100
      const dy = ((event.clientY - resize.startY) / rect.height) * 100
      let x = resize.originX
      let y = resize.originY
      let width = resize.originW
      let height = resize.originH
      if (resize.corner.includes('e')) width = resize.originW + dx
      if (resize.corner.includes('s')) height = resize.originH + dy
      if (resize.corner.includes('w')) {
        x = resize.originX + dx
        width = resize.originW - dx
      }
      if (resize.corner.includes('n')) {
        y = resize.originY + dy
        height = resize.originH - dy
      }
      const round = (value: number) => Math.round(value * 10) / 10
      onResizeElement(resize.id, {
        x: round(Math.max(-20, Math.min(120, x))),
        y: round(Math.max(-20, Math.min(120, y))),
        width: round(Math.max(4, Math.min(160, width))),
        height: round(Math.max(4, Math.min(160, height))),
      })
      return
    }
    if (!drag || !onMoveElement) return
    const dx = ((event.clientX - drag.startX) / rect.width) * 100
    const dy = ((event.clientY - drag.startY) / rect.height) * 100
    const x = Math.max(-10, Math.min(100, drag.originX + dx))
    const y = Math.max(-10, Math.min(100, drag.originY + dy))
    onMoveElement(drag.id, Math.round(x * 10) / 10, Math.round(y * 10) / 10)
  }

  const endDrag = () => {
    setDrag(null)
    setResize(null)
  }

  // Keyboard alternative to dragging (WCAG 2.5.7): arrows move, Alt+arrows
  // resize from the bottom-right corner, Shift takes 5% steps instead of 1%.
  const onElementKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, element: SlideElement) => {
    if (!interactive || event.target !== event.currentTarget) return
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }
    const delta = deltas[event.key]
    if (!delta) return
    event.preventDefault()
    event.stopPropagation()
    const step = event.shiftKey ? 5 : 1
    const round = (value: number) => Math.round(value * 10) / 10
    if (event.altKey && onResizeElement) {
      onResizeElement(element.id, {
        x: element.x,
        y: element.y,
        width: round(Math.max(4, Math.min(160, element.width + delta[0] * step))),
        height: round(Math.max(4, Math.min(160, element.height + delta[1] * step))),
      })
      return
    }
    if (!onMoveElement) return
    onMoveElement(
      element.id,
      round(Math.max(-10, Math.min(100, element.x + delta[0] * step))),
      round(Math.max(-10, Math.min(100, element.y + delta[1] * step))),
    )
  }

  // The slide's own text is one layer among the elements (Layers panel); see reorderSlideLayers.
  const contentZ = slide.contentZ ?? DEFAULT_CONTENT_Z

  const renderElement = (element: SlideElement) => {
    if (!element.visible) return null
    const style: React.CSSProperties = {
      left: `${element.x}%`,
      top: `${element.y}%`,
      width: `${element.width}%`,
      height: `${element.height}%`,
      // Message boxes always sit above the slide's own text layer.
      zIndex: element.type === 'message' ? Math.max(contentZ + 1, element.zIndex) : element.zIndex,
      opacity: element.opacity,
    }
    const settings = element.settings ?? {}
    const source = safeSource(element.source)

    return (
      <div
        key={element.id}
        className={`slide-element slide-element-${element.type} ${
          selectedElementId === element.id ? 'is-selected' : ''
        } ${interactive ? 'is-interactive' : ''}`}
        style={style}
        tabIndex={interactive ? 0 : undefined}
        role={interactive ? 'group' : undefined}
        aria-roledescription={interactive ? t('editor.element') : undefined}
        aria-label={interactive ? elementLabel(element, t) : undefined}
        aria-describedby={interactive ? keyboardHintId : undefined}
        aria-current={interactive && selectedElementId === element.id ? 'true' : undefined}
        onFocus={(event) => {
          if (interactive && event.target === event.currentTarget && selectedElementId !== element.id) {
            onSelectElement?.(element.id)
          }
        }}
        onKeyDown={(event) => onElementKeyDown(event, element)}
        onPointerDown={(event) => onElementPointerDown(event, element)}
        onPointerMove={onElementPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={(event) => {
          if (interactive && element.type === 'text' && onEditElementText && editingId !== element.id) {
            event.stopPropagation()
            setEditingId(element.id)
          }
        }}
      >
        {element.type === 'text' && (() => {
          const textStyle: React.CSSProperties = {
            ...slideTextStyle(settings),
            color: settings.color || undefined,
            textAlign: settings.align,
            lineHeight: settings.lineHeight,
            letterSpacing: settings.letterSpacing ? `${settings.letterSpacing}px` : undefined,
            textTransform: settings.uppercase ? 'uppercase' : undefined,
            textShadow: settings.textShadow ? undefined : 'none',
          }
          return editingId === element.id ? (
            <textarea
              className={`slide-element-text is-editing ${elementTextClass(element)}`}
              style={textStyle}
              value={element.text ?? ''}
              autoFocus
              onChange={(event) => onEditElementText?.(element.id, event.target.value)}
              onBlur={() => setEditingId(null)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault()
                  setEditingId(null)
                }
                event.stopPropagation()
              }}
              onPointerDown={(event) => event.stopPropagation()}
            />
          ) : (
            <p
              className={`slide-element-text ${elementTextClass(element)}`}
              style={textStyle}
            >
              {element.text}
            </p>
          )
        })()}
        {element.type === 'shape' && (
          <span
            className="slide-element-shape"
            style={{
              background: settings.fill,
              borderRadius:
                settings.shape === 'circle'
                  ? '50%'
                  : settings.shape === 'line'
                    ? '999px'
                    : settings.radius,
            }}
          />
        )}
        {(element.type === 'image' || element.type === 'video') && (
          <SlideMedia element={element} source={source} online={online} />
        )}
        {element.type === 'embed' &&
          source &&
          /^https:\/\/www\.youtube(?:-nocookie)?\.com\/embed\//.test(source) &&
          (online ? (
            <iframe
              src={source}
              title={element.text ?? 'YouTube'}
              className="slide-element-embed"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox="allow-scripts allow-same-origin allow-presentation"
            />
          ) : (
            <span className="slide-element-media-state is-offline">
              <strong>{t('media.offline')}</strong>
              <small>{t('editor.onlineOnly')}</small>
            </span>
          ))}
        {element.type === 'embed' && !source && (
          <span className="slide-element-media-state is-missing">
            <strong>{t('media.missing')}</strong>
          </span>
        )}
        {element.type === 'message' && (
          <MessageBoxView element={element} onFit={onMessageFit ? (scale) => onMessageFit(element.id, scale) : undefined} />
        )}
        {element.type === 'qr' && (
          <span className="slide-element-qr">
            <QrImage payload={settings.payload ?? element.text ?? ''} />
          </span>
        )}
        {interactive && selectedElementId === element.id && (
          <>
            {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
              <span
                key={corner}
                className={`resize-handle is-${corner}`}
                data-resize={corner}
              />
            ))}
          </>
        )}
      </div>
    )
  }

  const primary = slide.bible?.primary
  const secondary = slide.bible?.secondary
  // Every layout uses the slide's font, size and weight (or the standard ones), so
  // inspector changes show live. A bilingual slide's second language is 80% of the first.
  const scriptureTextStyle = (scale: number) => slideTextStyle(slide, scale)
  const titleLines = slide.kind === 'title' ? slide.text.split('\n') : []
  const titleHeadline = titleLines[0] ?? ''
  const titleSub = titleLines.slice(1).join(' ').trim()
  const lyricsLineCount = slide.kind === 'lyrics' ? slide.text.split('\n').filter(Boolean).length : 0
  const lyricsDensity =
    lyricsLineCount <= 4 ? 'comfortable' : lyricsLineCount <= 6 ? 'standard' : lyricsLineCount <= 8 ? 'compact' : 'dense'

  return (
    <div
      ref={rootRef}
      className={`slide-canvas is-aspect-${aspectRatio} bg-${background.preset ?? 'graphite'} tone-${tone} align-${align} ${
        compact ? 'is-compact' : ''
      } ${thumbnail ? 'is-thumbnail' : ''} ${interactive ? 'is-interactive' : ''} ${interactive && selectedElementId ? 'has-selection' : ''} ${className}`}
      style={
        backgroundImage
          ? {
              backgroundPosition,
              backgroundSize,
              backgroundImage: `linear-gradient(180deg, rgba(11,10,8,${background.overlay ?? 0.35}), rgba(11,10,8,${background.overlay ?? 0.35})), url("${backgroundImage}")`,
            }
          : undefined
      }
      onPointerDown={() => {
        if (!interactive) return
        setEditingId(null)
        setEditingSlideText(false)
        onSelectElement?.(null)
      }}
    >
      {showSafeArea && <div className="safe-area" />}
      {backgroundImage && (
        <span
          className="background-image-wash"
          style={{ backgroundPosition, backgroundSize }}
        />
      )}

      {primary ? (
        <div className={`scripture-layout ${secondary ? 'is-bilingual' : ''}`} style={{ zIndex: contentZ }}>
          <div className="scripture-heading">
            <span className="eyebrow">{branding.name.trim() || 'Church Presenter'}</span>
            <span className="scripture-ornament" />
            <span className="eyebrow">{primary.translationName}</span>
          </div>
          <div className="scripture-stack" ref={fitRef}>
            <section className="scripture-block scripture-primary">
              <span className="translation-tag">
                {primary.abbreviation} · {primary.reference}
              </span>
              <p style={scriptureTextStyle(1)}>{primary.text}</p>
            </section>
            {secondary && (
              <>
                <span className="scripture-divider" />
                <section className="scripture-block scripture-secondary">
                  <span className="translation-tag">
                    {secondary.abbreviation} · {secondary.reference}
                  </span>
                  <p style={scriptureTextStyle(0.8)}>{secondary.text}</p>
                </section>
              </>
            )}
          </div>
          <div className="scripture-footer">
            <BrandMark branding={branding} size="sm" />
            <span>
              {primary.reference}
              {secondary ? ` · ${secondary.reference}` : ''}
            </span>
          </div>
        </div>
      ) : slide.kind === 'timer' ? (
        <TimerFace slide={slide} smooth={!compact} />
      ) : slide.kind === 'title' ? (
        <div
          ref={fitRef}
          className="slide-title-layout"
          style={{
            zIndex: contentZ,
            justifyContent: slide.textVerticalAlign === 'top' ? 'flex-start' : slide.textVerticalAlign === 'bottom' ? 'flex-end' : undefined,
          }}
          onPointerDown={(event) => {
            if (!interactive) return
            event.stopPropagation()
            onSelectElement?.(null)
          }}
          onDoubleClick={(event) => {
            if (interactive && onEditSlideText && !editingSlideText) {
              event.stopPropagation()
              setEditingSlideText(true)
            }
          }}
        >
          {interactive && editingSlideText && onEditSlideText ? (
            <textarea
              className="slide-text-inline-edit"
              value={slide.text}
              autoFocus
              style={slideTextStyle(slide)}
              onChange={(event) => onEditSlideText(event.target.value)}
              onBlur={() => setEditingSlideText(false)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault()
                  setEditingSlideText(false)
                }
                event.stopPropagation()
              }}
              onPointerDown={(event) => event.stopPropagation()}
            />
          ) : (
            <>
              <span className="eyebrow slide-eyebrow">
                {branding.name.trim() || 'Church Presenter'}
              </span>
              <h1 style={slideTextStyle(slide)}>{titleHeadline}</h1>
              {titleSub && <p>{titleSub}</p>}
              <span className="title-rule" />
            </>
          )}
        </div>
      ) : (
        <div
          ref={fitRef}
          className={`slide-text-layout ${slide.text.length > 240 ? 'is-long' : ''} ${
            slide.kind === 'lyrics' ? `is-lyrics is-lyrics-${lyricsDensity}` : ''
          }`}
          style={{
            zIndex: contentZ,
            justifyContent: slide.textVerticalAlign === 'top' ? 'flex-start' : slide.textVerticalAlign === 'bottom' ? 'flex-end' : undefined,
          }}
          onPointerDown={(event) => {
            if (!interactive) return
            event.stopPropagation()
            onSelectElement?.(null)
          }}
          onDoubleClick={(event) => {
            if (interactive && onEditSlideText && !editingSlideText) {
              event.stopPropagation()
              setEditingSlideText(true)
            }
          }}
        >
          {interactive && editingSlideText && onEditSlideText ? (
            <textarea
              className="slide-text-inline-edit"
              value={slide.text}
              autoFocus
              style={slideTextStyle(slide)}
              onChange={(event) => onEditSlideText(event.target.value)}
              onBlur={() => setEditingSlideText(false)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault()
                  setEditingSlideText(false)
                }
                event.stopPropagation()
              }}
              onPointerDown={(event) => event.stopPropagation()}
            />
          ) : (
            <p style={slideTextStyle(slide)}>{slide.text}</p>
          )}
        </div>
      )}

      {slide.elements
        .slice()
        .sort((a, b) => a.zIndex - b.zIndex)
        .map(renderElement)}

      {!primary && slide.kind !== 'title' && (
        <div className="slide-footer-brand">
          <BrandMark branding={branding} size="sm" />
          <span>{branding.name.trim() || 'Church Presenter'}</span>
        </div>
      )}

      {songFooter && !compact && (
        <div className="slide-song-footer">
          <strong>{songFooter.title}</strong>
          {songFooter.author && <span>{songFooter.author}</span>}
        </div>
      )}

      {messageVisible && message && (
        <div className="slide-message">
          <span className="eyebrow">{t('live.message')}</span>
          <p>{message}</p>
        </div>
      )}
    </div>
  )
}
