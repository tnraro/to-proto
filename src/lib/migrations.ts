export interface Migration {
  version: number
  name: string
  /**
   * Must be synchronous — it runs inside the upgradeneeded transaction, so
   * async work cannot be awaited and failure rolls back everything.
   */
  up: (db: IDBDatabase, tx: IDBTransaction) => void
}

/**
 * On future schema changes: append a new entry here. DB_VERSION derives from
 * this list's length, and each entry's version is its index + 1.
 * Fresh installs (oldVersion 0) also run v1 first, so v1 owns the baseline schema.
 * Each migration fixes its own version's store list inline (no shared STORES).
 * Never change already-shipped migration snapshots — handle changes with a new version.
 */
const DEFINED_MIGRATIONS: Omit<Migration, 'version'>[] = [
  {
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
  {
    name: 'meta store for data migration markers',
    up: (db) => {
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'id' })
      }
    },
  },
]

export const MIGRATIONS: Migration[] = DEFINED_MIGRATIONS.map((m, index) => ({ ...m, version: index + 1 }))

export function runMigrations(db: IDBDatabase, oldVersion: number, tx: IDBTransaction): void {
  for (const m of MIGRATIONS) {
    if (m.version > oldVersion) {
      m.up(db, tx)
    }
  }
}
