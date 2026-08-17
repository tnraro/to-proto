import { beforeEach, describe, expect, test } from 'bun:test'
import 'fake-indexeddb/auto'
import { dbGet, dbGetAll, dbPut, dbTxn, resetDbForTests } from './db'
import {
  deleteCatAtomic,
  deleteRecordAtomic,
  getPhotoCount,
  saveRecordWithPhotos,
  updateRecordWithPhotos,
  uid,
} from './storage'
import type { Cat, Marker, PhotoEntry, ThresholdRule, VomitRecord } from '../types'

const blob = (n: number) => new Blob([new Uint8Array([n])], { type: 'image/jpeg' })

async function seed(): Promise<{
  cat: Cat
  otherCat: Cat
  record: VomitRecord
  markerSolo: Marker
  markerKept: Marker
  catRule: ThresholdRule
  globalRule: ThresholdRule
  catPhotoId: string
  recordPhotoId: string
  markerPhotoId: string
}> {
  const catId = uid()
  const otherCatId = uid()
  const catPhotoId = uid()
  const recordPhotoId = uid()
  const markerPhotoId = uid()
  const cat: Cat = { id: catId, name: '토토', photoId: catPhotoId }
  const otherCat: Cat = { id: otherCatId, name: '몽이' }
  const record: VomitRecord = {
    id: uid(),
    datetime: '2026-08-01T10:00:00.000Z',
    catId,
    types: ['food'],
    photos: [recordPhotoId],
    memo: '',
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
  }
  const markerSolo: Marker = {
    id: uid(),
    datetime: '2026-08-01T11:00:00.000Z',
    typeId: 't1',
    catIds: [catId],
    photos: [markerPhotoId],
    createdAt: '2026-08-01T11:00:00.000Z',
    updatedAt: '2026-08-01T11:00:00.000Z',
  }
  const markerKept: Marker = {
    id: uid(),
    datetime: '2026-08-01T12:00:00.000Z',
    typeId: 't2',
    catIds: [catId, otherCatId],
    photos: [],
    createdAt: '2026-08-01T12:00:00.000Z',
    updatedAt: '2026-08-01T12:00:00.000Z',
  }
  const catRule: ThresholdRule = { id: uid(), catId, windowDays: 1, maxCount: 3, type: null, enabled: true }
  const globalRule: ThresholdRule = { id: uid(), catId: null, windowDays: 7, maxCount: 7, type: null, enabled: true }
  await dbPut('cats', cat)
  await dbPut('cats', otherCat)
  await dbPut('records', record)
  await dbPut('markers', markerSolo)
  await dbPut('markers', markerKept)
  await dbPut('rules', catRule)
  await dbPut('rules', globalRule)
  await dbPut('photos', { id: catPhotoId, blob: blob(1) } satisfies PhotoEntry)
  await dbPut('photos', { id: recordPhotoId, blob: blob(2) } satisfies PhotoEntry)
  await dbPut('photos', { id: markerPhotoId, blob: blob(3) } satisfies PhotoEntry)
  return { cat, otherCat, record, markerSolo, markerKept, catRule, globalRule, catPhotoId, recordPhotoId, markerPhotoId }
}

describe('deleteCatAtomic', () => {
  test('기록·사진·규칙·고양이 삭제, 마커는 catIds만 정리 (0이어도 유지)', async () => {
    const s = await seed()
    const result = await deleteCatAtomic(s.cat.id)

    expect(await dbGet<Cat>('cats', s.cat.id)).toBeUndefined()
    expect(await dbGet<Cat>('cats', s.otherCat.id)).toBeDefined()
    expect(await dbGet<VomitRecord>('records', s.record.id)).toBeUndefined()
    expect(await dbGet<Marker>('markers', s.markerSolo.id)).toEqual({ ...s.markerSolo, catIds: [] })
    expect(await dbGet<Marker>('markers', s.markerKept.id)).toEqual({ ...s.markerKept, catIds: [s.otherCat.id] })
    expect(await dbGet<ThresholdRule>('rules', s.catRule.id)).toBeUndefined()
    expect(await dbGet<ThresholdRule>('rules', s.globalRule.id)).toBeDefined()
    expect(await dbGet('photos', s.catPhotoId)).toBeUndefined()
    expect(await dbGet('photos', s.recordPhotoId)).toBeUndefined()
    expect(await dbGet('photos', s.markerPhotoId)).toBeDefined()

    const byId = new Map(result.updatedMarkers.map((m) => [m.id, m]))
    expect(byId.get(s.markerSolo.id)?.catIds).toEqual([])
    expect(byId.get(s.markerKept.id)?.catIds).toEqual([s.otherCat.id])
  })

  test('다른 고양이의 데이터는 그대로', async () => {
    const s = await seed()
    await deleteCatAtomic(s.cat.id)
    const records = await dbGetAll<VomitRecord>('records')
    const markers = await dbGetAll<Marker>('markers')
    expect(records).toHaveLength(0)
    expect(markers.map((m) => m.id).sort()).toEqual([s.markerSolo.id, s.markerKept.id].sort())
  })
})

describe('saveRecordWithPhotos / updateRecordWithPhotos', () => {
  test('새 사진·기록·경고가 한 트랜잭션으로 커밋', async () => {
    const photoId = uid()
    const record: VomitRecord = {
      id: uid(),
      datetime: '2026-08-02T09:00:00.000Z',
      catId: 'c1',
      types: ['hairball'],
      photos: [photoId],
      memo: 'x',
      createdAt: '2026-08-02T09:00:00.000Z',
      updatedAt: '2026-08-02T09:00:00.000Z',
    }
    await saveRecordWithPhotos(record, [{ id: photoId, blob: blob(4) }], [])
    expect((await dbGet<{ blob: Blob }>('photos', photoId))?.blob.size).toBe(1)
    expect(await dbGet<VomitRecord>('records', record.id)).toEqual(record)
  })

  test('수정 시 제거된 사진은 삭제되고 새 사진은 커밋', async () => {
    const s = await seed()
    const newPhotoId = uid()
    const updated = { ...s.record, photos: [newPhotoId], memo: '수정' }
    await updateRecordWithPhotos(updated, [{ id: newPhotoId, blob: blob(5) }], [s.recordPhotoId])
    expect((await dbGet('photos', s.recordPhotoId))).toBeUndefined()
    expect((await dbGet<{ blob: Blob }>('photos', newPhotoId))?.blob.size).toBe(1)
    expect(await dbGet<VomitRecord>('records', s.record.id)).toEqual(updated)
  })
})

describe('dbTxn 롤백', () => {
  test('fn이 던지면 트랜잭션 전체가 롤백', async () => {
    await dbPut('cats', { id: 'pre', name: '기존' })
    await expect(
      dbTxn(['cats', 'records'], 'readwrite', async (tx) => {
        tx.objectStore('cats').put({ id: 'a', name: 'A' })
        tx.objectStore('records').put({
          id: 'r',
          datetime: '2026-08-03T00:00:00.000Z',
          catId: 'a',
          types: [],
          photos: [],
          memo: '',
          createdAt: '2026-08-03T00:00:00.000Z',
          updatedAt: '2026-08-03T00:00:00.000Z',
        })
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
    expect(await dbGet<Cat>('cats', 'a')).toBeUndefined()
    expect(await dbGet('records', 'r')).toBeUndefined()
    expect(await dbGet<Cat>('cats', 'pre')).toEqual({ id: 'pre', name: '기존' })
  })
})

describe('getPhotoCount', () => {
  test('photos 스토어의 실제 개수 (SSoT)', async () => {
    await seed()
    expect(await getPhotoCount()).toBe(3)
    await dbPut('photos', { id: uid(), blob: blob(9) } satisfies PhotoEntry)
    expect(await getPhotoCount()).toBe(4)
  })
})

describe('deleteRecordAtomic', () => {
  test('기록과 사진을 함께 삭제', async () => {
    const s = await seed()
    await deleteRecordAtomic(s.record.id, s.record.photos)
    expect(await dbGet('records', s.record.id)).toBeUndefined()
    expect(await dbGet('photos', s.recordPhotoId)).toBeUndefined()
    expect(await dbGet('photos', s.markerPhotoId)).toBeDefined()
  })
})

beforeEach(() => resetDbForTests())
