import type { Slide, SlideElement } from '../types'

export interface MediaTransport {
  kind?: 'audio' | 'video'
  status: 'playing' | 'paused' | 'stopped'
  position: number
  startedAt: number
  volume: number
  muted: boolean
  loop: boolean
  resumeAfterFreeze?: boolean
}
export interface MediaSession { slideId: string; elements: Record<string, MediaTransport> }
export type MediaCommand = 'play' | 'pause' | 'stop' | 'restart' | 'seek' | 'volume' | 'mute' | 'loop'
export interface MediaFeedback { id: string; duration: number; position: number; state: 'ready' | 'loading' | 'playing' | 'paused' | 'ended' | 'error' | 'blocked' }

export function isBackgroundMedia(element: SlideElement) {
  return element.settings?.playbackMode === 'background' || Boolean(element.settings?.motion) || element.source === '/media/cinematic/dove.mp4'
}
export function mediaPosition(transport: MediaTransport, now = Date.now(), duration = Infinity): number {
  const position = Math.max(0, transport.position + (transport.status === 'playing' ? Math.max(0, now - transport.startedAt) / 1000 : 0))
  if (!Number.isFinite(duration) || duration <= 0) return position
  return transport.loop ? position % duration : Math.min(position, duration)
}
export function createMediaSession(slide: Slide, now = Date.now()): MediaSession {
  return { slideId: slide.id, elements: Object.fromEntries(slide.elements.filter((e) => (e.type === 'video' || e.type === 'audio') && e.visible && e.source).map((e) => [e.id, {
    kind: e.type === 'audio' ? 'audio' : 'video', status: 'playing', position: 0, startedAt: now, volume: e.settings?.volume ?? 1,
    muted: e.settings?.muted ?? isBackgroundMedia(e), loop: e.settings?.loop ?? isBackgroundMedia(e),
  } satisfies MediaTransport])) }
}
export function advanceMediaSession(slide: Slide, previous: MediaSession | undefined, background?: SlideElement | null, now = Date.now()): MediaSession {
  const next = createMediaSession(slide, now)
  if (background?.type === 'video') {
    next.elements[background.id] = previous?.elements[background.id] ?? createMediaSession({ ...slide, elements: [background] }, now).elements[background.id]
  }
  return next
}
export function commandMedia(transport: MediaTransport, command: MediaCommand, value?: number, now = Date.now()): MediaTransport {
  const next = { ...transport, position: mediaPosition(transport, now), startedAt: now }
  switch (command) {
    case 'play': next.status = 'playing'; break
    case 'pause': next.status = 'paused'; break
    case 'stop': next.status = 'stopped'; next.position = 0; break
    case 'restart': next.status = 'playing'; next.position = 0; break
    case 'seek': if (Number.isFinite(value)) next.position = Math.max(0, Math.min(86400, value!)); break
    case 'volume': if (Number.isFinite(value)) next.volume = Math.max(0, Math.min(1, value!)); break
    case 'mute': next.muted = !next.muted; break
    case 'loop': next.loop = !next.loop; break
  }
  return next
}
export function freezeMedia(session: MediaSession | undefined, frozen: boolean, now = Date.now()): MediaSession | undefined {
  if (!session) return session
  return { ...session, elements: Object.fromEntries(Object.entries(session.elements).map(([id, t]) => [id, frozen
    ? { ...commandMedia(t, 'pause', undefined, now), resumeAfterFreeze: t.status === 'playing' }
    : { ...commandMedia(t, t.resumeAfterFreeze ? 'play' : 'pause', undefined, now), resumeAfterFreeze: false }])) }
}
