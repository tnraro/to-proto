import { describe, expect, test } from 'bun:test'
import 'fake-indexeddb/auto'
import { request, resetDbForTests, txDone } from './db'
import { runDataMigrations, type DataMigration } from './dataMigrations'
import { runMigrations } from './migrations'

const DB_NAME = 'to-app'

async function putLegacyRecord(value: unknown): Promise<void> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2)
    req.onupgradeneeded = () => {
      const db = req.result
      for (const name of ['cats', 'rules', 'alertLog', 'photos', 'draft']) {
        db.createObjectStore(name, { keyPath: 'id' })
      }
      const records = db.createObjectStore('records', { keyPath: 'id' })
      records.createIndex('catId', 'catId')
      db.createObjectStore('markers', { keyPath: 'id' })
      db.createObjectStore('markerTypes', { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  const tx = db.transaction('records', 'readwrite')
  tx.objectStore('records').put(value)
  await txDone(tx)
  db.close()
}

async function openAtDbVersion(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 3)
    req.onupgradeneeded = (e) => {
      runMigrations(req.result, (e as IDBVersionChangeEvent).oldVersion, req.transaction!)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function getAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
  return request(db.transaction(store, 'readonly').objectStore(store).getAll() as IDBRequest<T[]>)
}

async function getMarker(db: IDBDatabase): Promise<number | undefined> {
  const marker = await request(
    db.transaction('meta', 'readonly').objectStore('meta').get('dataVersion') as IDBRequest<
      { id: string; value: number } | undefined
    >,
  )
  return marker?.value
}

const renameDtToDate: DataMigration = {
  version: 1,
  name: 'rename dt to datetime',
  stores: ['records'],
  up: async (tx) => {
    const store = tx.objectStore('records')
    const rows = await request(store.getAll() as IDBRequest<Array<Record<string, unknown>>>)
    for (const row of rows) {
      const { dt, ...rest } = row
      store.put({ ...rest, datetime: dt })
    }
  },
}

describe('데이터 마이그레이션', () => {
  test('기존 설치: 데이터 변환 + 마커 기록', async () => {
    await resetDbForTests()
    await putLegacyRecord({ id: 'r1', dt: '2026-08-13T10:00:00.000Z' })

    const db = await openAtDbVersion()
    await runDataMigrations(db, [renameDtToDate])

    const rows = await getAll<Record<string, unknown>>(db, 'records')
    expect(rows).toEqual([{ id: 'r1', datetime: '2026-08-13T10:00:00.000Z' }])
    expect(await getMarker(db)).toBe(1)
    db.close()
  })

  test('이미 적용된 마이그레이션은 스킵됨', async () => {
    await resetDbForTests()
    await putLegacyRecord({ id: 'r1', dt: '2026-08-13T10:00:00.000Z' })

    const db = await openAtDbVersion()
    await runDataMigrations(db, [renameDtToDate])

    let rerunCount = 0
    const counted: DataMigration = {
      ...renameDtToDate,
      up: async (tx) => {
        rerunCount++
        await renameDtToDate.up(tx)
      },
    }
    const addSource: DataMigration = {
      version: 2,
      name: 'add source field',
      stores: ['records'],
      up: async (tx) => {
        const store = tx.objectStore('records')
        const rows = await request(store.getAll() as IDBRequest<Array<Record<string, unknown>>>)
        for (const row of rows) store.put({ ...row, source: 'imported' })
      },
    }
    await runDataMigrations(db, [counted, addSource])

    expect(rerunCount).toBe(0)
    const rows = await getAll<Record<string, unknown>>(db, 'records')
    expect(rows).toEqual([{ id: 'r1', datetime: '2026-08-13T10:00:00.000Z', source: 'imported' }])
    expect(await getMarker(db)).toBe(2)
    db.close()
  })

  test('실패 시 tx abort: 데이터와 마커 변경 없음, 재실행 가능', async () => {
    await resetDbForTests()
    await putLegacyRecord({ id: 'r1', dt: '2026-08-13T10:00:00.000Z' })

    const db = await openAtDbVersion()
    const failing: DataMigration = {
      ...renameDtToDate,
      up: async () => {
        throw new Error('boom')
      },
    }
    await expect(runDataMigrations(db, [failing])).rejects.toThrow('boom')

    const rows = await getAll<Record<string, unknown>>(db, 'records')
    expect(rows).toEqual([{ id: 'r1', dt: '2026-08-13T10:00:00.000Z' }])
    expect(await getMarker(db)).toBeUndefined()

    await runDataMigrations(db, [renameDtToDate])
    expect(await getMarker(db)).toBe(1)
    db.close()
  })

  test('신규 설치: 빈 스토어에 no-op 실행 후 마커 기록', async () => {
    await resetDbForTests()
    const db = await openAtDbVersion()

    await runDataMigrations(db, [renameDtToDate])

    expect(await getAll<unknown>(db, 'records')).toEqual([])
    expect(await getMarker(db)).toBe(1)
    db.close()
  })
})
