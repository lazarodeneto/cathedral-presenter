import { reconcilePhysicalDisplays, type DesktopDisplays, type PhysicalDisplay } from './desktop'
import type { MonitorRole } from '../../types'
import { ASPECT_RATIO, outputFormat } from '../../utils/outputFormats'
import type { OutputProvider, OutputSnapshot } from './OutputProvider'
import { LocalOutputRelay, type RelayMessage } from './LocalOutputRelay'

const CHANNEL = 'church-presenter-output-v1'
const STORAGE_KEY = 'church-presenter:output-snapshot:v1'
const WINDOW_NAMES: Record<Exclude<MonitorRole, 'disabled'>, string> = {
  audience: 'church-presenter-audience',
  confidence: 'church-presenter-confidence',
  broadcast: 'church-presenter-broadcast',
}

type ChannelMessage =
  | { type: 'snapshot'; snapshot: OutputSnapshot }
  | { type: 'hello' }
  | { type: 'rendered'; role: string; displayId: string; revision?: string; slideId?: string; mode: string; media?: import('../../media/playback').MediaFeedback[]; mediaReady?: boolean }
  /** A shortcut pressed in an output window, run by the operator window. */
  | { type: 'command'; actionId: string }

export class WebOutputProvider implements OutputProvider {
  readonly id = 'web-output'
  readonly label = 'Simulated display output · browser prototype'
  private channel: BroadcastChannel | null = null
  private listeners = new Set<(snapshot: OutputSnapshot) => void>()
  private commandListeners = new Set<(actionId: string) => void>()
  private windows = new Map<string, Window | null>()
  private latest: OutputSnapshot | null = null
  private localSnapshot: OutputSnapshot | null = null
  private sender = crypto.randomUUID()
  private controller = !window.location.hash.startsWith('#/output/') && !new URLSearchParams(window.location.search).has('recovery')
  private relay: LocalOutputRelay | null = null
  private nativeRequests = new Map<string, (result: Extract<RelayMessage, { type: 'native-response' }>) => void>()
  private remoteDesktop?: DesktopDisplays
  private displayListeners = new Set<(displays: PhysicalDisplay[]) => void>()
  private audienceTargets?: string[]
  private controllerId?: string
  private sequence = 0
  private receivedSequences = new Map<string, number>()
  private seenMessages = new Set<string>()
  private disposed = false

  async takeControl(snapshot?: OutputSnapshot): Promise<void> {
    this.getChannel()
    this.controller = true
    this.controllerId = this.sender
    this.channel?.postMessage({ type: 'controller', sender: this.sender })
    if (snapshot) this.publish(snapshot)
    await this.relay?.post({ type: 'claim' })
    if (this.disposed) return
    this.controller = true
    if (snapshot ?? this.localSnapshot) this.publish(snapshot ?? this.localSnapshot!)
  }

  dispose(): void {
    this.disposed = true
    this.channel?.close()
    this.relay?.close()
  }

  hasControl = () => this.controller

  getDesktop = (): DesktopDisplays | undefined => window.cathedralDesktop ?? this.remoteDesktop

  private async requestNative(action: string, args?: string[]): Promise<Extract<RelayMessage, { type: 'native-response' }> | null> {
    this.getChannel()
    if (!this.relay) return null
    const id = crypto.randomUUID()
    return new Promise((resolve) => {
      const timeout = setTimeout(() => { this.nativeRequests.delete(id); resolve(null) }, 1800)
      this.nativeRequests.set(id, (result) => { clearTimeout(timeout); this.nativeRequests.delete(id); resolve(result) })
      void this.relay!.post({ type: 'native-request', id, action, args })
    })
  }

  async discoverDesktop(): Promise<void> {
    const response = await this.requestNative('list')
    if (this.remoteDesktop || !response?.platform || response.status !== 'ok') return
    const call = async <T,>(action: string, args?: string[]): Promise<T> => {
      const reply = await this.requestNative(action, args)
      if (reply?.status !== 'ok') throw new Error('Native display connection unavailable')
      if (Array.isArray(reply.result)) for (const listener of this.displayListeners) listener(reply.result as PhysicalDisplay[])
      return reply.result as T
    }
    this.remoteDesktop = {
      platform: response.platform,
      listDisplays: () => call('list'),
      setDisplayRole: (id, role) => call('assign', [id, role]),
      openDisplay: (id) => call('open', [id]),
      closeDisplay: (id) => call('close', [id]),
      openRole: (role) => call('open-role', [role]),
      closeRole: (role) => call('close-role', [role]),
      onDisplaysChanged: (listener) => { this.displayListeners.add(listener); return () => { this.displayListeners.delete(listener) } },
    }
    for (const listener of this.connectionListeners) listener()
  }

  private async nativeAction(action = 'prepare', args: string[] = []): Promise<{ status: string; targets?: string[]; result?: unknown }> {
    const desktop = window.cathedralDesktop!
    switch (action) {
      case 'prepare': return this.nativeAudience()
      case 'list': return { status: 'ok', result: await desktop.listDisplays() }
      case 'assign': return { status: 'ok', result: await desktop.setDisplayRole(args[0], args[1] as MonitorRole) }
      case 'open': return { status: 'ok', result: await desktop.openDisplay(args[0]) }
      case 'close': return { status: 'ok', result: await desktop.closeDisplay(args[0]) }
      case 'open-role': return { status: 'ok', result: await desktop.openRole(args[0] as 'audience') }
      case 'close-role': return { status: 'ok', result: await desktop.closeRole(args[0] as 'audience') }
      default: return { status: 'blocked' }
    }
  }
  private connections = new Map<string, { at: number; slideId?: string; mode: string; media?: import('../../media/playback').MediaFeedback[]; mediaReady?: boolean }>()
  private connectionListeners = new Set<() => void>()

  onConnectionsChanged = (listener: () => void): (() => void) => {
    this.connectionListeners.add(listener)
    return () => { this.connectionListeners.delete(listener) }
  }

  audienceConnected(displayIds?: string[], slideId?: string): boolean {
    displayIds ??= this.audienceTargets
    displayIds = displayIds?.filter((id) => this.latest?.displays?.[id]?.source !== 'slide')
    const matches = (id: string) => {
      const connection = this.connections.get(`audience:${id}`)
      return Boolean(connection && connection.mediaReady !== false && Date.now() - connection.at < 3500 &&
        (!slideId || (connection.slideId === slideId && connection.mode === 'live')))
    }
    if (displayIds) return displayIds.length > 0 && displayIds.every(matches)
    return [...this.connections.keys()].some((key) => key.startsWith('audience:') && matches(key.slice(9)))
  }

  getMediaFeedback(slideId?: string): import('../../media/playback').MediaFeedback[] {
    return [...this.connections.entries()].filter(([key, c]) => key.startsWith('audience:') && Date.now() - c.at < 3500 && (!slideId || c.slideId === slideId)).flatMap(([, c]) => c.media ?? [])
  }

  /** A mounted output requests the latest state, including when storage is full. */
  requestSnapshot(): void {
    this.send({ type: 'hello' })
  }

  acknowledge(snapshot: OutputSnapshot, role: string, displayId = 'preview', media: import('../../media/playback').MediaFeedback[] = [], mediaReady = true): void {
    this.send({
      type: 'rendered', role, displayId, revision: snapshot.revision,
      slideId: snapshot.audience.slide?.id, mode: snapshot.audience.mode, media, mediaReady,
    })
  }

  private async nativeAudience(): Promise<{ status: 'opened' | 'noDisplay' | 'chooseDisplays' | 'blocked'; targets?: string[] }> {
    const desktop = window.cathedralDesktop!
    let displays = await desktop.listDisplays()
    let assigned = displays.filter((display) => !display.operator && display.role === 'audience' && this.latest?.displays?.[display.id]?.source !== 'slide')
    if (!assigned.length) {
      const available = displays.filter((display) => !display.operator && display.role === 'disabled')
      if (!available.length) return { status: displays.some((display) => !display.operator) ? 'chooseDisplays' : 'noDisplay' }
      if (available.length > 1) return { status: 'chooseDisplays' }
      displays = await desktop.setDisplayRole(available[0].id, 'audience')
      assigned = displays.filter((display) => !display.operator && display.role === 'audience')
    }
    for (const display of assigned) if (!display.open) this.connections.delete(`audience:${display.id}`)
    return { status: await desktop.openRole('audience') ? 'opened' : 'blocked', targets: assigned.map((display) => display.id) }
  }

  /** Open the real audience targets before allowing the operator to go live. */
  async prepareAudience(): Promise<'ready' | 'noDisplay' | 'chooseDisplays' | 'blocked' | 'unreachable' | 'desktopRequired'> {
    let targets: string[] | undefined
    try {
      this.getChannel()
      // The most recent explicit Present action owns the output across local app profiles.
      await this.takeControl()
      const desktop = window.cathedralDesktop
      let opened = false
      if (desktop) {
        const native = await this.nativeAudience()
        if (native.status !== 'opened') return native.status
        targets = native.targets
        opened = true
      } else if (this.relay) {
        const native = await this.requestNative('prepare')
        if (native) {
          if (native.status !== 'opened') return native.status as 'noDisplay' | 'chooseDisplays' | 'blocked'
          targets = native.targets
          opened = true
        }
      }
      if (!opened) return 'desktopRequired'
      this.audienceTargets = targets
      this.requestSnapshot()
      if (this.audienceConnected(targets)) return 'ready'
      return await new Promise((resolve) => {
        const check = () => {
          if (!this.audienceConnected(targets)) return
          clearTimeout(timeout)
          unsubscribe()
          resolve('ready')
        }
        const unsubscribe = this.onConnectionsChanged(check)
        const timeout = setTimeout(() => { unsubscribe(); resolve('unreachable') }, 8000)
        check()
      })
    } catch {
      return 'unreachable'
    }
  }

  private send(message: ChannelMessage): void {
    const envelope = { ...message, eventId: crypto.randomUUID() }
    this.getChannel()?.postMessage(envelope)
    void this.relay?.post(envelope)
  }

  private receive(message: RelayMessage, fromRelay = false): void {
    const nativeHost = window.cathedralDesktop && !window.location.hash.startsWith('#/output/')
    // One network connection per native host, regardless of the number of TVs.
    if (fromRelay && nativeHost) this.channel?.postMessage(message)
    if (message?.eventId) {
      if (this.seenMessages.has(message.eventId)) return
      this.seenMessages.add(message.eventId)
      if (this.seenMessages.size > 512) this.seenMessages.delete(this.seenMessages.values().next().value!)
    }
    if (message?.type === 'controller') {
      this.controllerId = message.sender ?? undefined
      this.controller = message.sender === this.sender || (!message.sender && !window.location.hash.startsWith('#/output/'))
    } else if (message?.type === 'native-request' && typeof message.id === 'string' && window.cathedralDesktop && !window.location.hash.startsWith('#/output/')) {
      void this.nativeAction(message.action, message.args).catch(() => ({ status: 'blocked' })).then((result) => this.relay?.post({ type: 'native-response', id: message.id, platform: window.cathedralDesktop!.platform, ...result }))
    } else if (message?.type === 'native-response' && typeof message.id === 'string') {
      this.nativeRequests.get(message.id)?.(message)
    } else if (message?.type === 'snapshot' && message.snapshot?.audience && message.snapshot?.confidence) {
      const transport = message.snapshot.transport
      if (transport) {
        if (this.controllerId && transport.publisher !== this.controllerId) return
        if (transport.sequence <= (this.receivedSequences.get(transport.publisher) ?? -1)) return
        this.receivedSequences.set(transport.publisher, transport.sequence)
      }
      this.latest = message.snapshot
      for (const listener of this.listeners) listener(message.snapshot)
    } else if (message?.type === 'hello' && this.controller && this.latest) {
      this.send({ type: 'snapshot', snapshot: this.latest })
    } else if (message?.type === 'hello' && nativeHost && this.latest) {
      this.channel?.postMessage({ type: 'snapshot', snapshot: this.latest })
    } else if (message?.type === 'rendered' && typeof message.displayId === 'string') {
      if (!fromRelay && nativeHost) void this.relay?.post(message)
      this.connections.set(`${message.role}:${message.displayId}`, { at: Date.now(), slideId: message.slideId, mode: message.mode, media: message.media, mediaReady: message.mediaReady })
      for (const listener of this.connectionListeners) listener()
    } else if (message?.type === 'command' && typeof message.actionId === 'string' && this.controller) {
      for (const listener of this.commandListeners) listener(message.actionId)
    } else if (message?.type === 'command' && !fromRelay && nativeHost) {
      void this.relay?.post(message)
    }
  }

  private getChannel(): BroadcastChannel | null {
    if (this.disposed) return null
    if (typeof BroadcastChannel === 'undefined') return null
    if (!this.channel) {
      this.channel = new BroadcastChannel(CHANNEL)
      this.channel.onmessage = (event: MessageEvent<ChannelMessage>) => this.receive(event.data)
      if (typeof EventSource !== 'undefined' && !(window.cathedralDesktop && window.location.hash.startsWith('#/output/')))
        this.relay = new LocalOutputRelay(this.sender, (message) => this.receive(message, true))
    }
    return this.channel
  }

  async listMonitors(): Promise<import('../../types').Monitor[]> {
    const desktop = this.getDesktop()
    if (desktop) {
      return reconcilePhysicalDisplays([], await desktop.listDisplays())
    }
    // Display enumeration belongs in the desktop shell. The web adapter uses
    // simulated monitors from local settings instead of pretending to detect
    // physical displays.
    return []
  }

  async openOutput(role: Exclude<MonitorRole, 'disabled'>): Promise<boolean> {
    const desktop = this.getDesktop()
    if (desktop) {
      try {
        return await desktop.openRole(role)
      } catch {
        return false
      }
    }
    if (typeof window === 'undefined') return false
    const existing = this.windows.get(role)
    if (existing && !existing.closed) {
      existing.focus()
      return true
    }
    const base = `${window.location.origin}${window.location.pathname}`
    const url = `${base}#/output/${role}`
    // Open the window in the projection proportion, so the preview has no black bars.
    const snapshot = this.readSnapshot()
    const ratio =
      ASPECT_RATIO[
        outputFormat(role === 'broadcast' ? snapshot?.broadcast?.format : snapshot?.audience.format)
          .aspect
      ]
    const width = 1280
    const height = Math.round(width / ratio)
    const opened = window.open(
      url,
      WINDOW_NAMES[role],
      `popup=yes,width=${width},height=${height},menubar=no,toolbar=no,location=no,status=no`,
    )
    this.windows.set(role, opened)
    return Boolean(opened)
  }

  closeOutput(role: Exclude<MonitorRole, 'disabled'>): void {
    const desktop = this.getDesktop()
    if (desktop) {
      void desktop.closeRole(role).catch(() => {})
      return
    }
    const existing = this.windows.get(role)
    if (existing && !existing.closed) existing.close()
    this.windows.delete(role)
  }

  publish(snapshot: OutputSnapshot): void {
    if (this.disposed) return
    this.localSnapshot = snapshot
    this.getChannel()
    if (!this.controller) return
    snapshot = { ...snapshot, revision: crypto.randomUUID(), transport: { publisher: this.sender, sequence: ++this.sequence } }
    this.latest = snapshot
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
    } catch {
      // Large inline media can exceed the storage quota. BroadcastChannel is
      // still used below and the output window re-syncs on the next heartbeat.
    }
    this.send({ type: 'snapshot', snapshot })
  }

  /** Relay a shortcut pressed in an output window to the operator window. */
  sendCommand(actionId: string): void {
    this.send({ type: 'command', actionId })
  }

  onCommand(listener: (actionId: string) => void): () => void {
    this.commandListeners.add(listener)
    this.getChannel()
    return () => {
      this.commandListeners.delete(listener)
    }
  }

  readSnapshot(): OutputSnapshot | null {
    if (this.latest) return this.latest
    if (typeof localStorage === 'undefined') return null
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as OutputSnapshot) : null
    } catch {
      return null
    }
  }

  subscribe(listener: (snapshot: OutputSnapshot) => void): () => void {
    this.listeners.add(listener)
    this.getChannel()
    if (this.latest) listener(this.latest)
    this.requestSnapshot()

    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return
      try {
        this.receive({ type: 'snapshot', snapshot: JSON.parse(event.newValue) as OutputSnapshot })
      } catch {
        // Ignore malformed local snapshots.
      }
    }
    window.addEventListener('storage', onStorage)

    return () => {
      this.listeners.delete(listener)
      window.removeEventListener('storage', onStorage)
    }
  }

  async requestFullscreen(): Promise<boolean> {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
        return true
      }
      await document.exitFullscreen()
      return false
    } catch {
      return false
    }
  }
}

export const webOutputProvider = new WebOutputProvider()
if (import.meta.hot) import.meta.hot.dispose(() => webOutputProvider.dispose())
