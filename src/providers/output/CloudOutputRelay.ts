import type { RelayMessage } from './LocalOutputRelay'

export const COMPUTER_KEY = 'cathedral:cloud-installation'
export function selectCloudComputer(id: string) {
  localStorage.setItem(COMPUTER_KEY, id)
  window.dispatchEvent(new Event('cathedral:computer-changed'))
}

/** Authenticated short polling works with stateless hosting and every supported browser. */
export class CloudOutputRelay {
  private stopped = false
  private cursor = 0
  private computer = ''
  private timer?: ReturnType<typeof setTimeout>
  private initialized: Promise<void>
  private queue: Promise<unknown> = Promise.resolve()
  constructor(private sender: string, private receive: (message: RelayMessage) => void, private changed: () => void) {
    this.initialized = this.choose()
    window.addEventListener('cathedral:computer-changed', this.onChange)
    void this.initialized.then(() => this.poll())
  }
  private onChange = () => { this.computer = localStorage.getItem(COMPUTER_KEY) || ''; this.cursor = 0; this.changed() }
  private async choose() {
    try {
      const response = await fetch('/api/installations', { signal: AbortSignal.timeout(10000) })
      if (!response.ok) return
      const { installations } = await response.json() as { installations: { id: string; connected: boolean; revoked: boolean }[] }
      const stored = localStorage.getItem(COMPUTER_KEY)
      const target = installations.find((i) => i.id === stored && !i.revoked) ?? installations.find((i) => i.connected) ?? installations.find((i) => !i.revoked)
      this.computer = target?.id || ''
      if (target) localStorage.setItem(COMPUTER_KEY, target.id)
    } catch { /* The next reconnect keeps the chosen computer. */ }
  }
  private url() { return `/api/output-relay?installation=${encodeURIComponent(this.computer)}` }
  private async poll() {
    if (this.stopped) return
    const computer = this.computer
    try {
      if (computer) {
        const response = await fetch(`${this.url()}&cursor=${this.cursor}`, { signal: AbortSignal.timeout(15000) })
        if (!response.ok) throw new Error('relay-unavailable')
        const result = await response.json() as { cursor: number; messages: RelayMessage[] }
        if (computer === this.computer && !this.stopped) {
          this.cursor = result.cursor
          for (const message of result.messages) if (message.type === 'controller' || message.sender !== this.sender) this.receive(message)
        }
      }
    } catch { this.cursor = 0 }
    if (!this.stopped) this.timer = setTimeout(() => void this.poll(), document.hidden ? 5000 : 1000)
  }
  post(message: object): Promise<boolean> {
    // Preserve claim → snapshot ordering even when the network changes latency.
    const operation = this.queue.then(async () => {
      await this.initialized
      if (this.stopped || !this.computer) return false
      try { return (await fetch(this.url(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...message, sender: this.sender }), signal: AbortSignal.timeout(15000) })).ok } catch { return false }
    })
    this.queue = operation.catch(() => false)
    return operation
  }
  close() { this.stopped = true; clearTimeout(this.timer); window.removeEventListener('cathedral:computer-changed', this.onChange) }
}
