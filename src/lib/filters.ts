import type { Marker, VomitRecord, VomitType } from '../types'
import { toDayKey } from './dates'

export type DateMode = 'all' | 'before' | 'after' | 'range'

export interface RecordFilters {
  types: VomitType[]
  catIds: string[]
  kinds: Array<'record' | 'marker'>
  markerTypeIds: string[]
  dateMode: DateMode
  dateBefore?: string
  dateAfter?: string
  dateRangeStart?: string
  dateRangeEnd?: string
  memo: string
}

export const EMPTY_FILTERS: RecordFilters = {
  types: [],
  catIds: [],
  kinds: [],
  markerTypeIds: [],
  dateMode: 'all',
  memo: '',
}

function matchesDate(f: RecordFilters, dayKey: string): boolean {
  switch (f.dateMode) {
    case 'before':
      return !f.dateBefore || dayKey < f.dateBefore
    case 'after':
      return !f.dateAfter || dayKey >= f.dateAfter
    case 'range':
      if (f.dateRangeStart && dayKey < f.dateRangeStart) return false
      if (f.dateRangeEnd && dayKey > f.dateRangeEnd) return false
      return true
    default:
      return true
  }
}

export function filterRecords(records: VomitRecord[], f: RecordFilters): VomitRecord[] {
  const memoQuery = f.memo.trim().toLowerCase()
  return records.filter((r) => {
    if (f.types.length > 0 && !r.types.some((t) => f.types.includes(t))) return false
    if (f.catIds.length > 0 && !f.catIds.includes(r.catId)) return false
    if (!matchesDate(f, toDayKey(r.datetime))) return false
    if (memoQuery && !r.memo.toLowerCase().includes(memoQuery)) return false
    return true
  })
}

export function filterMarkers(markers: Marker[], f: RecordFilters): Marker[] {
  const memoQuery = f.memo.trim().toLowerCase()
  return markers.filter((m) => {
    if (f.markerTypeIds.length > 0 && !f.markerTypeIds.includes(m.typeId)) return false
    if (f.catIds.length > 0 && !m.catIds.some((c) => f.catIds.includes(c))) return false
    if (!matchesDate(f, toDayKey(m.datetime))) return false
    if (memoQuery && !(m.memo ?? '').toLowerCase().includes(memoQuery)) return false
    return true
  })
}
