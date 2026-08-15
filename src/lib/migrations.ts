export interface Migration {
  /** DB version reached after applying this migration */
  version: number
  name: string
  /**
   * Schema/data transform. Runs inside the upgradeneeded transaction, so
   * failure rolls back everything. Keep schema changes synchronous and
   * data migration as a tx-based request chain.
   */
  up: (db: IDBDatabase, tx: IDBTransaction) => void | Promise<void>
}

/**
 * On future schema changes: bump DB_VERSION in db.ts and append a new entry here.
 * Fresh installs (oldVersion 0) also run v1 first, so v1 owns the baseline schema.
 * Each migration fixes its own version's store list inline (no shared STORES).
 * Never change already-shipped migration snapshots — handle changes with a new version.
 */
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial schema',
    up: (db, tx) => {
      const v1Stores = ['cats', 'records', 'rules', 'alertLog', 'photos', 'draft'] as const
      for (const name of v1Stores) {
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
  {
    version: 2,
    name: 'markers and marker types',
    up: (db) => {
      const v2Stores = ['markers', 'markerTypes'] as const
      for (const name of v2Stores) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: 'id' })
        }
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

/** Reads an entire store in an upgrade transaction, transforms, and writes to a new store (old store removal is dropStore) */
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
