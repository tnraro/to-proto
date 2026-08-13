import { describe, expect, test } from 'bun:test'
import 'fake-indexeddb/auto'
import { dbGet, dbGetAll, dbPut, resetDbForTests } from './db'
import { MIGRATIONS, runMigrations } from './migrations'

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
  })

  test('기존 설치(v1) → 업그레이드: 마이그레이션 실행 + 데이터 보존', async () => {
    // 현재 버전(v1)에 아직 다음 버전이 없으므로, 업그레이드 흐름을 검증하기 위한
    // 임시 마이그레이션을 등록한다
    const originalLength = MIGRATIONS.length
    MIGRATIONS.push({
      version: 2,
      name: 'test: extra 스토어 추가',
      up: (db) => {
        db.createObjectStore('extra', { keyPath: 'id' })
      },
    })

    try {
      await resetDbForTests()

      // 1) 현재 버전(v1) DB를 직접 생성하고 기록 데이터를 넣는다
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

      // 2) 더 높은 버전으로 수동 오픈 → 등록된 마이그레이션 실행
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 2)
        req.onupgradeneeded = (e) => {
          runMigrations(req.result, (e as IDBVersionChangeEvent).oldVersion, req.transaction!)
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })

      // 3) 기존 데이터 보존 + 새 스토어 생성 확인
      const tx = db.transaction(['records', 'extra'], 'readwrite')
      const got = await new Promise<Array<{ id: string }>>((resolve) => {
        const r = tx.objectStore('records').getAll()
        r.onsuccess = () => resolve(r.result as Array<{ id: string }>)
      })
      expect(got).toHaveLength(1)
      expect(got[0].id).toBe('r1')
      tx.objectStore('extra').put({ id: 'record', applyTo: 'add', savedAt: Date.now() })
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
      db.close()
    } finally {
      MIGRATIONS.length = originalLength
    }
  })
})
