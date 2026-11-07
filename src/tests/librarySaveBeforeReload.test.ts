import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { CustomBibleTranslation, LibrarySong } from '../types'
import { BIBLE_TRANSLATIONS } from '../data/bible'

const mocks = vi.hoisted(() => ({
  load: vi.fn(async () => ({ revision: 0, document: null })),
  save: vi.fn<(document: string, revision: number) => Promise<Response>>(),
}))
vi.mock('../store/cloudTransfer', () => ({ loadWorkspaceDocument: mocks.load, saveWorkspaceDocument: mocks.save }))
import { flushSharedWorkspace, initializeSharedWorkspace, workspaceStatus } from '../store/sharedWorkspace'
import { useAppStore } from '../store/useAppStore'

const ok = (revision: number) => new Response(JSON.stringify({ revision }), { status: 200, headers: { 'Content-Type': 'application/json' } })

describe('saving additions before reload', () => {
  beforeAll(async () => {
    vi.stubEnv('MODE', 'production')
    vi.spyOn(globalThis, 'setInterval').mockReturnValue(0 as never)
    mocks.save.mockResolvedValue(ok(1))
    await initializeSharedWorkspace()
  })
  afterAll(() => { vi.unstubAllEnvs(); vi.restoreAllMocks() })

  it('waits for the shared save and includes both a new song and the Bible text', async () => {
    let release!: (response: Response) => void
    mocks.save.mockImplementationOnce(() => new Promise<Response>((resolve) => { release = resolve }))
    const initial = useAppStore.getState()
    const song = { id: 'song-flush', title: 'Saved song', lyrics: 'Lyrics' } as LibrarySong
    const bible: CustomBibleTranslation = { translation: { ...BIBLE_TRANSLATIONS[0], id: 'bible-flush', name: 'Saved Bible', bundled: false }, books: { john: { 3: { 16: 'Saved verse' } } } }
    useAppStore.setState({ librarySongs: [...initial.librarySongs, song], customBibles: [...initial.customBibles, bible] })
    let finished = false
    const flush = flushSharedWorkspace().then((value) => { finished = true; return value })
    await vi.waitFor(() => expect(release).toBeTypeOf('function'))
    expect(finished).toBe(false)
    const document = JSON.parse(mocks.save.mock.calls.at(-1)![0])
    expect(document.librarySongs.some((entry: LibrarySong) => entry.id === song.id)).toBe(true)
    expect(document.customBibles.find((entry: CustomBibleTranslation) => entry.translation.id === bible.translation.id).books.john[3][16]).toBe('Saved verse')
    release(ok(2))
    expect(await flush).toBe(true)
  })

  it('does not save a queued change after it was reverted', async () => {
    const previous = useAppStore.getState().librarySongs, calls = mocks.save.mock.calls.length
    useAppStore.setState({ librarySongs: [...previous, { id: 'temporary', title: 'Temporary', lyrics: 'Lyrics' } as LibrarySong] })
    useAppStore.setState({ librarySongs: previous })
    await new Promise((resolve) => setTimeout(resolve, 750))
    expect(mocks.save).toHaveBeenCalledTimes(calls)
  })

  it('does not report a durable save when the shared workspace is unavailable', async () => {
    mocks.save.mockRejectedValueOnce(new Error('offline'))
    useAppStore.setState((state) => ({ librarySongs: [...state.librarySongs, { id: 'unsaved', title: 'Keep local', lyrics: 'Lyrics' } as LibrarySong] }))
    expect(await flushSharedWorkspace()).toBe(false)
    expect(workspaceStatus()).toBe('offline')
    expect(useAppStore.getState().librarySongs.some((song) => song.id === 'unsaved')).toBe(true)
  })
})
