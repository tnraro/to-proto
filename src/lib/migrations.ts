export interface Migration {
  /** 이 마이그레이션 적용 후 도달하는 DB 버전 */
  version: number
  name: string
  /**
   * 스키마/데이터 변환. upgradeneeded 트랜잭션 내에서 실행되므로
   * 실패 시 전체가 롤백된다. 스키마 변경은 동기적으로,
   * 데이터 이관은 tx 기반 요청 체인으로 수행할 것.
   */
  up: (db: IDBDatabase, tx: IDBTransaction) => void | Promise<void>
}

export const STORES = ['cats', 'records', 'rules', 'alertLog', 'photos', 'draft'] as const
export type StoreName = (typeof STORES)[number]

/**
 * 버전별 스키마 히스토리.
 * - v1: 초기 스키마 (정규화 스토어, records.catId 인덱스)
 * 향후 스키마 변경 시: db.ts의 DB_VERSION을 올리고 이 배열에 새 항목을 추가할 것.
 * 신규 설치(oldVersion 0)도 v1부터 순차 적용되므로 기준 스키마는 v1이 담당한다.
 */
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial schema',
    up: (db, tx) => {
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: 'id' })
        }
      }
      const records = tx.objectStore('records')
      if (!records.indexNames.contains('catId')) {
        records.createIndex('catId', 'catId')
      }
    },
  },
]

export function runMigrations(db: IDBDatabase, oldVersion: number, tx: IDBTransaction): void {
  for (const m of MIGRATIONS) {
    if (m.version > oldVersion) {
      void m.up(db, tx)
    }
  }
}

export function ensureStore(db: IDBDatabase, name: string, keyPath?: string): IDBObjectStore {
  if (db.objectStoreNames.contains(name)) return db.transaction(name, 'readonly').objectStore(name)
  return db.createObjectStore(name, keyPath ? { keyPath } : {})
}

export function ensureIndex(store: IDBObjectStore, name: string, keyPath: string | string[]): void {
  if (!store.indexNames.contains(name)) store.createIndex(name, keyPath)
}

export function dropStore(db: IDBDatabase, name: string): void {
  if (db.objectStoreNames.contains(name)) db.deleteObjectStore(name)
}

/** 업그레이드 트랜잭션에서 스토어 전체를 읽어 변환 후 새 스토어에 기록 (구 스토어 삭제는 dropStore) */
export async function copyStore(
  db: IDBDatabase,
  from: string,
  to: string,
  transform: (value: unknown, key: IDBValidKey) => unknown,
): Promise<void> {
  const oldStore = db.transaction(from, 'readonly').objectStore(from)
  const newStore = db.transaction(to, 'readonly').objectStore(to)
  await new Promise<void>((resolve, reject) => {
    const req = oldStore.openCursor()
    req.onsuccess = () => {
      const cursor = req.result
      if (!cursor) {
        resolve()
        return
      }
      const value = transform(cursor.value, cursor.key)
      if (value !== null) {
        newStore.put(value)
      }
      cursor.continue()
    }
    req.onerror = () => reject(req.error)
  })
}
