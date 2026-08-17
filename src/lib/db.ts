import { runMigrations } from './migrations'

export type StoreName = 'cats' | 'records' | 'rules' | 'alertLog' | 'photos' | 'draft' | 'markers' | 'markerTypes'

const DB_NAME = 'to-app'
export const DB_VERSION = 2

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = (e) => {
        const oldVersion = (e as IDBVersionChangeEvent).oldVersion
        runMigrations(req.result, oldVersion, req.transaction!)
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbPromise
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function dbPut(store: StoreName, value: unknown): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(store, 'readwrite')
  tx.objectStore(store).put(value)
  await txDone(tx)
}

export async function dbGet<T>(store: StoreName, id: string): Promise<T | undefined> {
  const db = await openDB()
  return request(db.transaction(store, 'readonly').objectStore(store).get(id) as IDBRequest<T | undefined>)
}

export async function dbGetAll<T>(store: StoreName): Promise<T[]> {
  const db = await openDB()
  return request(db.transaction(store, 'readonly').objectStore(store).getAll() as IDBRequest<T[]>)
}

export async function dbGetAllByIndex<T>(store: StoreName, index: string, value: string): Promise<T[]> {
  const db = await openDB()
  return request(db.transaction(store, 'readonly').objectStore(store).index(index).getAll(value) as IDBRequest<T[]>)
}

export async function dbCount(store: StoreName): Promise<number> {
  const db = await openDB()
  return request(db.transaction(store, 'readonly').objectStore(store).count() as IDBRequest<number>)
}

export async function dbDel(store: StoreName, id: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(store, 'readwrite')
  tx.objectStore(store).delete(id)
  await txDone(tx)
}

export async function dbDelByIndex(store: StoreName, index: string, value: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(store, 'readwrite')
  const os = tx.objectStore(store)
  const req = os.index(index).getAll(value)
  req.onsuccess = () => {
    for (const item of req.result) os.delete((item as { id: string }).id)
  }
  await txDone(tx)
}

export async function dbClear(store: StoreName): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(store, 'readwrite')
  tx.objectStore(store).clear()
  await txDone(tx)
}

/** Clears every store in the current DB (objectStoreNames is the source of truth) */
export async function dbClearAll(): Promise<void> {
  const db = await openDB()
  await Promise.all(
    Array.from(db.objectStoreNames).map((name) => {
      const tx = db.transaction(name, 'readwrite')
      tx.objectStore(name).clear()
      return txDone(tx)
    }),
  )
}

/**
 * Runs fn inside one transaction spanning multiple stores — every request in
 * the transaction commits atomically or rolls back entirely on any failure
 * (fn throw → tx.abort). Keep async preprocessing (image resize etc.) outside;
 * awaiting request promises inside fn is safe: pending requests keep the
 * transaction alive until the event loop goes idle.
 */
export async function dbTxn(
  stores: StoreName[],
  mode: IDBTransactionMode,
  fn: (tx: IDBTransaction) => Promise<void> | void,
): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(stores, mode)
  try {
    await fn(tx)
  } catch (err) {
    tx.abort()
    throw err
  }
  await txDone(tx)
}

/** Promise wrapper for IDBRequest inside a transaction */
export function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** Test-only: closes the connection and deletes the DB so migration scenarios can be reproduced */
export async function resetDbForTests(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise.catch(() => null)
    db?.close()
  }
  dbPromise = null
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = () => resolve()
    req.onerror = () => resolve()
    req.onblocked = () => resolve()
  })
}
