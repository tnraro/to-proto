import type { AlertEntry, BaseDraft, Cat, Marker, MarkerType, ThresholdRule, VomitRecord } from '../types'
import { dbClear, dbClearAll, dbDel, dbDelByIndex, dbGet, dbGetAll, dbGetAllByIndex, dbPut, dbTxn, request } from './db'

export function uid(): string {
  return crypto.randomUUID()
}

export interface PhotoBlob {
  id: string
  blob: Blob
}

export const DRAFT_TTL_MS = 30 * 60 * 1000

export async function saveDraft<T extends BaseDraft>(draft: T & { id: string }): Promise<void> {
  await dbPut('draft', draft)
}

export async function loadDraft<T extends BaseDraft>(id: string): Promise<(T & { id: string }) | undefined> {
  return dbGet<(T & { id: string }) | undefined>('draft', id)
}

/** Returns the draft only when it targets the given context and is fresh; expired drafts are deleted */
export async function loadValidDraft<T extends BaseDraft>(id: string, applyTo: string): Promise<(T & { id: string }) | null> {
  const draft = await loadDraft<T>(id)
  if (!draft) return null
  if (draft.applyTo === applyTo && Date.now() - draft.savedAt <= DRAFT_TTL_MS) return draft
  if (Date.now() - draft.savedAt > DRAFT_TTL_MS) await deleteDraft(id)
  return null
}

export async function deleteDraft(id: string): Promise<void> {
  await dbDel('draft', id)
}

export async function getAllCats(): Promise<Cat[]> {
  return dbGetAll<Cat>('cats')
}

export async function putCat(cat: Cat): Promise<void> {
  await dbPut('cats', cat)
}

export async function delCat(id: string): Promise<void> {
  await dbDel('cats', id)
}

export async function getAllRecords(): Promise<VomitRecord[]> {
  const records = await dbGetAll<VomitRecord>('records')
  return records.map((r) => ({ ...r, photos: r.photos ?? [] }))
}

export async function putRecord(record: VomitRecord): Promise<void> {
  await dbPut('records', record)
}

export async function delRecord(id: string): Promise<void> {
  await dbDel('records', id)
}

export async function delRecordsByCat(catId: string): Promise<string[]> {
  const targets = await dbGetAllByIndex<VomitRecord>('records', 'catId', catId)
  await dbDelByIndex('records', 'catId', catId)
  return targets.flatMap((r) => r.photos)
}

export async function getAllRules(): Promise<ThresholdRule[]> {
  return dbGetAll<ThresholdRule>('rules')
}

export async function putRule(rule: ThresholdRule): Promise<void> {
  await dbPut('rules', rule)
}

export async function delRule(id: string): Promise<void> {
  await dbDel('rules', id)
}

export async function getAllAlertLog(): Promise<AlertEntry[]> {
  return dbGetAll<AlertEntry>('alertLog')
}

export async function putAlertEntry(entry: AlertEntry): Promise<void> {
  await dbPut('alertLog', entry)
}

export async function delAlertEntry(id: string): Promise<void> {
  await dbDel('alertLog', id)
}

export async function clearAlertLog(): Promise<void> {
  await dbClear('alertLog')
}

export async function putPhoto(id: string, blob: Blob): Promise<void> {
  await dbPut('photos', { id, blob })
}

export async function getAllMarkers(): Promise<Marker[]> {
  return dbGetAll<Marker>('markers')
}

export async function putMarker(marker: Marker): Promise<void> {
  await dbPut('markers', marker)
}

export async function delMarker(id: string): Promise<void> {
  await dbDel('markers', id)
}

export async function getAllMarkerTypes(): Promise<MarkerType[]> {
  return dbGetAll<MarkerType>('markerTypes')
}

export async function putMarkerType(markerType: MarkerType): Promise<void> {
  await dbPut('markerTypes', markerType)
}

export async function delMarkerType(id: string): Promise<void> {
  await dbDel('markerTypes', id)
}

export async function getPhoto(id: string): Promise<Blob | undefined> {
  const entry = await dbGet<{ id: string; blob: Blob }>('photos', id)
  return entry?.blob
}

export async function delPhotos(ids: string[]): Promise<void> {
  for (const id of ids) await dbDel('photos', id)
}

export async function clearAll(): Promise<void> {
  await dbClearAll()
}

/**
 * Atomic record save: new photos, the record, and its alert entries commit in
 * one transaction — a failure leaves nothing behind.
 */
export async function saveRecordWithPhotos(
  record: VomitRecord,
  newPhotos: PhotoBlob[],
  alerts: AlertEntry[],
): Promise<void> {
  await dbTxn(['photos', 'records', 'alertLog'], 'readwrite', async (tx) => {
    const photos = tx.objectStore('photos')
    for (const p of newPhotos) photos.put({ id: p.id, blob: p.blob })
    tx.objectStore('records').put(record)
    for (const a of alerts) tx.objectStore('alertLog').put(a)
  })
}

export async function updateRecordWithPhotos(
  record: VomitRecord,
  newPhotos: PhotoBlob[],
  removedPhotoIds: string[],
): Promise<void> {
  await dbTxn(['photos', 'records'], 'readwrite', (tx) => {
    const photos = tx.objectStore('photos')
    for (const p of newPhotos) photos.put({ id: p.id, blob: p.blob })
    tx.objectStore('records').put(record)
    for (const id of removedPhotoIds) photos.delete(id)
  })
}

export async function saveMarkerWithPhotos(marker: Marker, newPhotos: PhotoBlob[]): Promise<void> {
  await dbTxn(['photos', 'markers'], 'readwrite', (tx) => {
    const photos = tx.objectStore('photos')
    for (const p of newPhotos) photos.put({ id: p.id, blob: p.blob })
    tx.objectStore('markers').put(marker)
  })
}

export async function updateMarkerWithPhotos(
  marker: Marker,
  newPhotos: PhotoBlob[],
  removedPhotoIds: string[],
): Promise<void> {
  await dbTxn(['photos', 'markers'], 'readwrite', (tx) => {
    const photos = tx.objectStore('photos')
    for (const p of newPhotos) photos.put({ id: p.id, blob: p.blob })
    tx.objectStore('markers').put(marker)
    for (const id of removedPhotoIds) photos.delete(id)
  })
}

export async function deleteRecordAtomic(id: string, photoIds: string[]): Promise<void> {
  await dbTxn(['records', 'photos'], 'readwrite', (tx) => {
    tx.objectStore('records').delete(id)
    const photos = tx.objectStore('photos')
    for (const pid of photoIds) photos.delete(pid)
  })
}

export interface DeleteCatResult {
  /** Markers that lost all their cats and were removed with their photos */
  removedMarkers: Marker[]
  /** Markers that kept the cat id in their list removed */
  updatedMarkers: Marker[]
}

/**
 * Atomic cat deletion cascade: records (by catId index), markers (catIds
 * containing the id — dropped or removed with photos), cat-scoped rules, the
 * cat's own photo, and the cat itself, all in one transaction.
 */
export async function deleteCatAtomic(catId: string): Promise<DeleteCatResult> {
  const result: DeleteCatResult = { removedMarkers: [], updatedMarkers: [] }
  await dbTxn(['cats', 'records', 'markers', 'photos', 'rules'], 'readwrite', async (tx) => {
    const recordsOs = tx.objectStore('records')
    const photosOs = tx.objectStore('photos')
    const targetRecords = await request(recordsOs.index('catId').getAll(catId))
    const recordPhotoIds = targetRecords.flatMap((r) => r.photos)
    for (const r of targetRecords) recordsOs.delete(r.id)
    const markerPhotoIds: string[] = []
    const markers = await request<Marker[]>(tx.objectStore('markers').getAll())
    for (const m of markers) {
      if (!m.catIds.includes(catId)) continue
      const catIds = m.catIds.filter((c) => c !== catId)
      if (catIds.length === 0) {
        result.removedMarkers.push(m)
        markerPhotoIds.push(...m.photos)
        tx.objectStore('markers').delete(m.id)
      } else {
        result.updatedMarkers.push({ ...m, catIds })
        tx.objectStore('markers').put({ ...m, catIds })
      }
    }
    const rules = await request<ThresholdRule[]>(tx.objectStore('rules').getAll())
    for (const rule of rules) {
      if (rule.catId === catId) tx.objectStore('rules').delete(rule.id)
    }
    const cat = await request<Cat | undefined>(tx.objectStore('cats').get(catId))
    if (cat?.photoId) photosOs.delete(cat.photoId)
    tx.objectStore('cats').delete(catId)
    for (const pid of [...recordPhotoIds, ...markerPhotoIds]) photosOs.delete(pid)
  })
  return result
}
