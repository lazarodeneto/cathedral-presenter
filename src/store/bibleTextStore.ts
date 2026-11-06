import { LEGACY_INCLUDED_BIBLE_IDS } from '../data/bible'
import type { BibleBookTexts, CustomBibleTranslation } from '../types'

/**
 * Imported Bible text lives in IndexedDB, not in the localStorage workspace:
 * a complete Bible is several megabytes, which would fill the ~5 MB
 * localStorage quota and make every later save fail. The workspace keeps each
 * translation's metadata and drops its text only once IndexedDB holds it.
 */
const DB_NAME = 'church-presenter-bibles'
const STORE = 'texts'

/** Books objects IndexedDB confirmed it holds, by translation id (compared by reference). */
const stored = new Map<string, BibleBookTexts>()
let dbPromise: Promise<IDBDatabase | null> | null = null

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  dbPromise ??= new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, 1)
      request.onupgradeneeded = () => request.result.createObjectStore(STORE)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
      request.onblocked = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
  return dbPromise
}

function run<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise((resolve) => {
        if (!db) return resolve(undefined)
        try {
          const transaction = db.transaction(STORE, mode)
          const request = action(transaction.objectStore(STORE))
          transaction.oncomplete = () => resolve(request.result)
          transaction.onerror = () => resolve(undefined)
          transaction.onabort = () => resolve(undefined)
        } catch {
          resolve(undefined)
        }
      }),
  )
}

/** True once IndexedDB holds exactly this books object for the translation. */
export function isBibleTextStored(translationId: string, books: BibleBookTexts): boolean {
  return Object.keys(books).length > 0 && stored.get(translationId) === books
}

async function save(translationId: string, books: BibleBookTexts): Promise<boolean> {
  const result = await run('readwrite', (store) => store.put(books, translationId))
  if (result === undefined) return false
  stored.set(translationId, books)
  return true
}

/**
 * Writes new or changed Bible text to IndexedDB and removes text for deleted
 * translations. Resolves true when anything was saved, so the caller can
 * rewrite the workspace without the inline text.
 */
export async function syncBibleTexts(entries: CustomBibleTranslation[]): Promise<boolean> {
  const ids = new Set(entries.map((entry) => entry.translation.id))
  for (const id of [...stored.keys()]) {
    if (ids.has(id)) continue
    stored.delete(id)
    await run('readwrite', (store) => store.delete(id))
  }
  let saved = false
  for (const entry of entries) {
    const { id } = entry.translation
    if (Object.keys(entry.books).length === 0 || stored.get(id) === entry.books) continue
    if (await save(id, entry.books)) saved = true
  }
  return saved
}

/** Loads stored text for entries that arrived without it. Entries IndexedDB lacks stay as they are. */
export async function loadBibleTexts(
  entries: CustomBibleTranslation[],
): Promise<Record<string, BibleBookTexts>> {
  // Retired app-supplied copies are replaced by the bundled full-text defaults.
  // Never clear the store: independently imported church translations must survive.
  for (const id of LEGACY_INCLUDED_BIBLE_IDS) {
    stored.delete(id)
    await run('readwrite', (store) => store.delete(id))
  }
  const loaded: Record<string, BibleBookTexts> = {}
  for (const entry of entries) {
    const { id } = entry.translation
    if (Object.keys(entry.books).length > 0) continue
    const books = await run<BibleBookTexts>('readonly', (store) => store.get(id))
    if (books && typeof books === 'object' && Object.keys(books).length > 0) {
      loaded[id] = books
      stored.set(id, books)
    }
  }
  return loaded
}
