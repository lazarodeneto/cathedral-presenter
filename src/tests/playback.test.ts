import { describe, expect, it } from 'vitest'
import { commandMedia, createMediaSession, freezeMedia, mediaPosition } from '../media/playback'
import { makeSlide } from '../utils/slides'

describe('shared media transport', () => {
  const slide = makeSlide({ kind: 'media', elements: [{ id: 'video', type: 'video', source: '/film.mp4', visible: true, x: 0, y: 0, width: 100, height: 100, zIndex: 0, opacity: 1 }] })
  it('plays foreground video once with sound, while decorative backgrounds are silent loops', () => {
    expect(createMediaSession(slide, 1000).elements.video).toMatchObject({ muted: false, loop: false, startedAt: 1000 })
    expect(createMediaSession({ ...slide, elements: [{ ...slide.elements[0], settings: { playbackMode: 'background' } }] }).elements.video).toMatchObject({ muted: true, loop: true })
  })
  it('uses the same wall clock on every display and preserves position through pause, seek and resume', () => {
    const start = createMediaSession(slide, 1000).elements.video
    expect(mediaPosition(start, 6500)).toBe(5.5)
    const pause = commandMedia(start, 'pause', undefined, 6500)
    expect(mediaPosition(pause, 50000)).toBe(5.5)
    const seek = commandMedia(pause, 'seek', 90, 50000)
    expect(mediaPosition(commandMedia(seek, 'play', undefined, 50000), 52000)).toBe(92)
    expect(mediaPosition(start, 6500, 3)).toBe(3)
    expect(mediaPosition({ ...start, loop: true }, 6500, 3)).toBe(2.5)
  })
  it('freezes movement and resumes only media that was playing', () => {
    const session = createMediaSession(slide, 1000)
    const frozen = freezeMedia(session, true, 6000)!
    expect(mediaPosition(frozen.elements.video, 10000)).toBe(5)
    const resumed = freezeMedia(frozen, false, 10000)!
    expect(mediaPosition(resumed.elements.video, 12000)).toBe(7)
    const paused = { ...session, elements: { video: commandMedia(session.elements.video, 'pause', undefined, 2000) } }
    expect(freezeMedia(freezeMedia(paused, true, 3000), false, 10000)!.elements.video.status).toBe('paused')
  })
  it('stops, restarts and clamps untrusted transport values', () => {
    const transport = createMediaSession(slide, 1000).elements.video
    expect(commandMedia(transport, 'stop', undefined, 4000)).toMatchObject({ position: 0, status: 'stopped' })
    expect(commandMedia(transport, 'restart', undefined, 4000)).toMatchObject({ position: 0, status: 'playing' })
    expect(commandMedia(transport, 'seek', NaN, 1000).position).toBe(0)
    expect(commandMedia(transport, 'volume', 50).volume).toBe(1)
    expect(commandMedia(transport, 'seek', -5).position).toBe(0)
  })
})
