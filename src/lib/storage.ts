import type { AlertEntry, Cat, Marker, MarkerType, RecordDraft, ThresholdRule, VomitRecord } from '../types'
import { dbClear, dbClearAll, dbDel, dbDelByIndex, dbGet, dbGetAll, dbGetAllByIndex, dbPut } from './db'

const DRAFT_ID = 'record'

export function uid(): string {
  return crypto.randomUUID()
}

export async function saveDraft(draft: RecordDraft): Promise<void> {
  await dbPut('draft', draft)
}

export async function loadDraft(): Promise<RecordDraft | undefined> {
  return dbGet<RecordDraft>('draft', DRAFT_ID)
}

export async function deleteDraft(): Promise<void> {
  await dbDel('draft', DRAFT_ID)
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
