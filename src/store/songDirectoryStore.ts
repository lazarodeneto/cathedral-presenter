import type { SongDirectory } from '../providers/songs/letrasGospel'

/**
 * The letrasgospel.net catalogue (about 52,000 songs, a few megabytes) lives
 * in IndexedDB, not in the localStorage workspace, which has a ~5 MB quota.
 * Same small open/run pattern as bibleTextStore.
 */
const DB_NAME = 'church-presenter-songs'
const STORE = 'directories'
const KEY = 'letrasgospel'

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

function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
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

function isDirectory(value: unknown): value is SongDirectory {
  if (!value || typeof value !== 'object') return false
  const entry = value as Partial<SongDirectory>
  return typeof entry.updatedAt === 'string' && Array.isArray(entry.artists) && Array.isArray(entry.songs)
}

export async function loadSongDirectory(): Promise<SongDirectory | null> {
  const value = await run('readonly', (store) => store.get(KEY))
  return isDirectory(value) ? value : null
}

/** True when IndexedDB confirmed the save. */
export async function saveSongDirectory(directory: SongDirectory): Promise<boolean> {
  const result = await run('readwrite', (store) => store.put(directory, KEY))
  return result !== undefined
}
