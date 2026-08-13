export const STORES = ['cats', 'records', 'rules', 'alertLog', 'photos', 'draft'] as const
export type StoreName = (typeof STORES)[number]

const DB_NAME = 'to-app'
const DB_VERSION = 3

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        for (const name of STORES) {
          if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' })
        }
        const records = req.transaction!.objectStore('records')
        if (!records.indexNames.contains('catId')) records.createIndex('catId', 'catId')
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbPromise
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
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
  tx.objectStore(store).put(value as never)
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
