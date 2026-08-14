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
        // 신규 설치(oldVersion 0)면 v1 마이그레이션이 초기 스키마를 만들고,
        // 기존 설치는 등록된 마이그레이션을 버전 순서대로 적용한다.
        runMigrations(req.result, oldVersion, req.transaction!)
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

/** 현재 DB의 모든 스토어를 비운다 (objectStoreNames가 진실 공급원) */
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

/** 테스트 전용: 연결을 닫고 DB를 삭제해 마이그레이션 시나리오를 재현할 수 있게 한다 */
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
