import { describe, expect, test } from 'bun:test'
import 'fake-indexeddb/auto'
import { dbGet, dbGetAll, dbPut, resetDbForTests } from './db'
import { runMigrations } from './migrations'

const DB_NAME = 'to-app'

async function openAtVersion(version: number, build: (db: IDBDatabase) => void): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, version)
    req.onupgradeneeded = (e) => {
      build(req.result)
      void e
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

describe('IndexedDB 마이그레이션', () => {
  test('신규 설치: 현재 버전의 전체 스키마가 생성된다', async () => {
    await resetDbForTests()
    expect(await dbGetAll('records')).toHaveLength(0)
    expect(await dbGet('draft', 'anything')).toBeUndefined()
    await dbPut('draft', { id: 'x', applyTo: 'add' })
    expect((await dbGet<{ id: string }>('draft', 'x'))?.id).toBe('x')
    // v2 stores are created on fresh installs too
    expect(await dbGet('markers', 'anything')).toBeUndefined()
    expect(await dbGet('markerTypes', 'anything')).toBeUndefined()
  })

  test('기존 설치(v1) → v2 업그레이드: 마이그레이션 실행 + 데이터 보존', async () => {
    await resetDbForTests()

    // 1) create the v1 DB directly and seed record data
    const oldDb = await openAtVersion(1, (d) => {
      for (const name of ['cats', 'records', 'rules', 'alertLog', 'photos', 'draft']) {
        d.createObjectStore(name, { keyPath: 'id' })
      }
    })
    await new Promise<void>((resolve, reject) => {
      const tx = oldDb.transaction('records', 'readwrite')
      tx.objectStore('records').put({
        id: 'r1',
        datetime: '2026-08-13T10:00:00.000Z',
        catId: 'c1',
        types: ['food'],
        photos: [],
        memo: '',
        createdAt: '2026-08-13T10:00:00.000Z',
        updatedAt: '2026-08-13T10:00:00.000Z',
      })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    oldDb.close()

    // 2) open at the current version → registered migrations (v2) run
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 2)
      req.onupgradeneeded = (e) => {
        runMigrations(req.result, (e as IDBVersionChangeEvent).oldVersion, req.transaction!)
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })

    // 3) existing data preserved + v2 stores created
    const tx = db.transaction(['records', 'markers', 'markerTypes'], 'readwrite')
    const got = await new Promise<Array<{ id: string }>>((resolve) => {
      const r = tx.objectStore('records').getAll()
      r.onsuccess = () => resolve(r.result as Array<{ id: string }>)
    })
    expect(got).toHaveLength(1)
    expect(got[0].id).toBe('r1')
    tx.objectStore('markers').put({ id: 'm1', datetime: '2026-08-13T12:00:00.000Z', typeId: 't1', catIds: ['c1'], photos: [] })
    tx.objectStore('markerTypes').put({ id: 't1', name: '건강 검진' })
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()

    // 4) verify saved marker data
    const markers = await dbGetAll<{ id: string; typeId: string }>('markers')
    expect(markers).toHaveLength(1)
    expect(markers[0].typeId).toBe('t1')
  })
})
