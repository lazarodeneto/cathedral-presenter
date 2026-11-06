import '@testing-library/jest-dom/vitest'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()

  get length() {
    return this.values.size
  }

  clear() {
    this.values.clear()
  }

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null
  }

  removeItem(key: string) {
    this.values.delete(key)
  }

  setItem(key: string, value: string) {
    this.values.set(key, String(value))
  }
}

if (typeof window !== 'undefined') Object.defineProperty(window, 'localStorage', {
  value: new MemoryStorage(),
  configurable: true,
})

// jsdom does not implement HTMLDialogElement.showModal / close.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}

if (typeof globalThis.BroadcastChannel === 'undefined') {
  class TestBroadcastChannel {
    onmessage: ((event: MessageEvent) => void) | null = null
    postMessage() {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
  }
  Object.defineProperty(globalThis, 'BroadcastChannel', {
    value: TestBroadcastChannel,
    configurable: true,
  })
}
