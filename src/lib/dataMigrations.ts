import type { Marker, MarkerType } from '../types'
import type { StoreName } from './db'
import { request, txDone } from './db'

type DataStoreName = Exclude<StoreName, 'meta'>

export interface DataMigration {
  version: number
  name: string
  stores: DataStoreName[]
  /**
   * Async row transform. Runs inside one readwrite tx spanning `stores` + meta,
   * where the progress marker is written in the same tx — a crash retries the
   * whole migration, and tx serialization keeps concurrent tabs from
   * double-applying. Await IDB requests only; pending requests keep the tx
   * alive, any other async work must happen outside. Never blind-write:
   * migrations run on empty stores (fresh installs) and retry after a crash,
   * so inserts must be existence-guarded and id changes must cascade every
   * reference — all inside this tx.
   */
  up: (tx: IDBTransaction) => Promise<void>
}

/**
 * Same versioning rules as MIGRATIONS in migrations.ts: append a new entry,
 * version is index + 1, never edit already-shipped entries.
 */
const DEFINED_DATA_MIGRATIONS: Omit<DataMigration, 'version'>[] = [
  {
    name: 'seed default marker type meal',
    stores: ['markerTypes', 'markers'],
    up: async (tx) => {
      const types = tx.objectStore('markerTypes')
      const existing = await request(types.getAll() as IDBRequest<MarkerType[]>)
      const meal = existing.find((t) => t.name === '식사')
      if (!meal) {
        types.put({ id: 'meal', name: '식사' })
        return
      }
      if (meal.id === 'meal') return
      // Canonicalize the user-created 식사 type to the fixed id and cascade
      types.put({ ...meal, id: 'meal' })
      types.delete(meal.id)
      const markers = tx.objectStore('markers')
      const all = await request(markers.getAll() as IDBRequest<Marker[]>)
      for (const m of all) {
        if (m.typeId === meal.id) markers.put({ ...m, typeId: 'meal' })
      }
    },
  },
]

export const DATA_MIGRATIONS: DataMigration[] = DEFINED_DATA_MIGRATIONS.map((m, index) => ({
  ...m,
  version: index + 1,
}))

const MARKER_ID = 'dataVersion'

async function getAppliedVersion(db: IDBDatabase): Promise<number> {
  const tx = db.transaction('meta', 'readonly')
  const marker = await request(
    tx.objectStore('meta').get(MARKER_ID) as IDBRequest<{ id: string; value: number } | undefined>,
  )
  return marker?.value ?? 0
}

export async function runDataMigrations(
  db: IDBDatabase,
  migrations: DataMigration[] = DATA_MIGRATIONS,
): Promise<void> {
  let applied = await getAppliedVersion(db)
  for (const m of migrations) {
    if (m.version <= applied) continue
    const tx = db.transaction([...m.stores, 'meta'], 'readwrite')
    try {
      await m.up(tx)
      tx.objectStore('meta').put({ id: MARKER_ID, value: m.version })
    } catch (err) {
      tx.abort()
      throw err
    }
    await txDone(tx)
    applied = m.version
  }
}
