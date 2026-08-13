import { describe, expect, test } from 'bun:test'
import 'fake-indexeddb/auto'
import { dbGet, dbGetAll, dbPut, resetDbForTests } from './db'
import { MIGRATIONS } from './migrations'

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

  test('기존 설치(v2) → 현재 버전 업그레이드: 마이그레이션 실행 + 데이터 보존', async () => {
    // v3 마이그레이션은 실제 배포 시 no-op이므로, 업그레이드 흐름을 검증하기 위해
    // draft 스토어를 생성하는 마이그레이션을 임시 등록한다
    const originalLength = MIGRATIONS.length
    MIGRATIONS.push({
      version: 3,
      name: 'test: draft 스토어 추가',
      up: (db) => {
        db.createObjectStore('draft', { keyPath: 'id' })
      },
    })

    try {
      await resetDbForTests()

      // 1) 구버전(v2) DB를 직접 생성하고 기록 데이터를 넣는다
      const oldDb = await openAtVersion(2, (d) => {
        for (const name of ['cats', 'records', 'rules', 'alertLog', 'photos']) {
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

      // 2) 앱 openDB(현재 버전) 호출 → 등록된 마이그레이션 실행
      const records = await dbGetAll('records')
      expect(records).toHaveLength(1)
      expect(records[0].id).toBe('r1')

      // 3) 마이그레이션이 새 스토어를 생성
      await dbPut('draft', { id: 'record', applyTo: 'add', savedAt: Date.now() })
      expect((await dbGet<{ id: string }>('draft', 'record'))?.id).toBe('record')
    } finally {
      MIGRATIONS.length = originalLength
    }
  })
})
