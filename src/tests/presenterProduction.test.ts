import { beforeEach, describe, expect, it } from 'vitest'
import { useAppStore } from '../store/useAppStore'
import { createServiceSkeleton } from '../store/serviceUtils'
import { makeSlide } from '../utils/slides'
import { buildOutputSnapshot } from '../store/outputState'
import { mediaPosition } from '../media/playback'
import { sniffAudioMime, validateMediaFile } from '../security/media'

beforeEach(() => {
  const service = createServiceSkeleton({ title: 'Production rehearsal', date: '2026-11-06', time: '10:00', locale: 'en' })
  const slides = [makeSlide({ title: 'First', text: 'First lyric' }), makeSlide({ title: 'Second', text: 'Second lyric' })]
  service.items = [{ id: 'item', title: 'Song', type: 'song', slides }]
  service.sections[0].itemIds = ['item']
  useAppStore.setState({ services: [service], activeServiceId: service.id, live: null, timers: {}, mediaLibrary: [] })
})
describe('production presentation invariants', () => {
  it('runs a cue as one change, follows its slide in the editor and refuses missing targets', () => {
    const s = useAppStore.getState(), service = s.services[0], slide = service.items[0].slides[1]
    s.startLive(service.id, service.items[0].slides[0].id)
    useAppStore.setState({ settings: { ...s.settings, cues: [{ id: 'cue', name: 'Prayer', slideId: slide.id, stageMessage: 'Two minutes', stageSeconds: 120 }] } })
    const changes: string[] = []
    const unsubscribe = useAppStore.subscribe((state) => { if (state.live?.currentSlideId === slide.id) { expect(state.selectedSlideId).toBe(slide.id); changes.push(slide.id) } })
    expect(s.runCue('cue')).toBe(true)
    unsubscribe()
    expect(changes).toHaveLength(1)
    expect(useAppStore.getState().live).toMatchObject({ currentSlideId: slide.id, stageMessage: 'Two minutes', blank: false })
    expect(useAppStore.getState().timers.stage.status).toBe('running')
    expect(s.runCue('missing')).toBe(false)
  })
  it('holds the frozen slide even when its original content is edited', () => {
    const s = useAppStore.getState(), service = s.services[0], slide = service.items[0].slides[0]
    s.startLive(service.id, slide.id); s.toggleFreeze()
    s.updateSlide(service.id, 'item', slide.id, { text: 'Unpublished edit' })
    const state = useAppStore.getState()
    const snapshot = buildOutputSnapshot({ service: state.services[0], live: state.live, monitors: [], branding: state.branding, testMonitorId: null })
    expect(snapshot.audience.slide?.text).toBe('First lyric')
    expect(state.services[0].items[0].slides[0].text).toBe('Unpublished edit')
  })
  it('keeps a background clock across lyric changes and pauses it when media is cleared', () => {
    const s = useAppStore.getState(), service = s.services[0]
    s.startLive(service.id, service.items[0].slides[0].id)
    s.addMedia({ id: 'background', kind: 'video', name: 'Background', mime: 'video/mp4', size: 100, source: '/media/cinematic/dove.mp4', status: 'ready', addedAt: '', provider: 'upload' })
    s.setLiveBackground('background')
    const initial = useAppStore.getState().live!.media!.elements['live-background']
    s.nextLive()
    const next = useAppStore.getState().live!.media!.elements['live-background']
    expect(next.startedAt).toBe(initial.startedAt)
    expect(mediaPosition(next, initial.startedAt + 10000)).toBe(10)
    s.clearLiveLayer('media')
    expect(useAppStore.getState().live!.media!.elements['live-background'].status).toBe('paused')
  })
  it('routes different slides per display and keeps stage messages out of audience state', () => {
    const state = useAppStore.getState(), service = state.services[0]
    state.startLive(service.id, service.items[0].slides[0].id); state.setStageMessage('Pastor: two minutes'); state.startStageCountdown(120)
    const live = useAppStore.getState()
    const snapshot = buildOutputSnapshot({ service, services: [service], live: live.live, monitors: [{ id: 'tv', displayId: 'tv', name: 'TV', displayName: 'TV', role: 'audience', status: 'ready', width: 1920, height: 1080, fullscreen: true, simulated: false }], profiles: { tv: { source: 'slide', slideId: service.items[0].slides[1].id, layout: 'lower-third' } }, timers: live.timers, branding: state.branding, testMonitorId: null })
    expect(snapshot.displays?.tv.slide?.text).toBe('Second lyric')
    expect(snapshot.audience.slide?.text).toBe('First lyric')
    expect(snapshot.confidence.stageMessage).toBe('Pastor: two minutes')
    expect(JSON.stringify(snapshot.audience)).not.toContain('Pastor: two minutes')
    expect(snapshot.timers?.stage.status).toBe('running')
  })
  it('recognizes audio signatures without trusting a generic browser MIME type', async () => {
    const header = new Uint8Array([82,73,70,70,36,0,0,0,87,65,86,69])
    expect(sniffAudioMime(header)).toBe('audio/wav')
    const file = { name: 'music.wav', type: 'application/octet-stream', size: header.length, slice: () => ({ arrayBuffer: async () => header.buffer }) } as unknown as File
    expect(await validateMediaFile(file)).toMatchObject({ ok: true, kind: 'audio', mime: 'audio/wav' })
  })
})
