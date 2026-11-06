import type { OutputSnapshot } from './OutputProvider'

export type RelayMessage = { sender?: string; eventId?: string } & (
  | { type: 'snapshot'; snapshot: OutputSnapshot }
  | { type: 'hello' | 'claim' | 'controller' }
  | { type: 'rendered'; role: string; displayId: string; revision?: string; slideId?: string; mode: string; media?: import('../../media/playback').MediaFeedback[]; mediaReady?: boolean }
  | { type: 'command'; actionId: string }
  | { type: 'native-request'; id: string; action?: string; args?: string[] }
  | { type: 'native-response'; id: string; status: string; targets?: string[]; platform?: 'darwin' | 'win32' | 'linux'; result?: unknown }
)

/** Same-origin loopback transport; never opens a port or exposes native IPC to the network. */
export class LocalOutputRelay {
  private events: EventSource
  constructor(private sender: string, receive: (message: RelayMessage) => void) {
    this.events = new EventSource('/api/output-relay')
    this.events.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as RelayMessage
        if (message.type === 'controller' || message.sender !== sender) receive(message)
      } catch { /* Ignore interrupted or malformed events. */ }
    }
  }
  async post(message: object): Promise<boolean> {
    try {
      const response = await fetch('/api/output-relay', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Cathedral-Relay': '1' },
        body: JSON.stringify({ ...message, sender: this.sender }),
        signal: AbortSignal.timeout(4000),
      })
      return response.ok
    } catch { return false }
  }
  close(): void { this.events.close() }
}
