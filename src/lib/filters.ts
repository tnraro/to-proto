import type { Marker, VomitRecord, VomitType } from '../types'
import { toDayKey } from './dates'

export type DateMode = 'all' | 'before' | 'after' | 'range'

export interface RecordFilters {
  /** 빈 배열 = 전체 (내부 OR) */
  types: VomitType[]
  /** 빈 배열 = 전체 (내부 OR) */
  catIds: string[]
  /** 표시할 타임라인 종류 (빈 배열 = 전체) */
  kinds: Array<'record' | 'marker'>
  /** 마커 종류 id (마커 필터에만 적용, 빈 배열 = 전체) */
  markerTypeIds: string[]
  dateMode: DateMode
  /** 이전: 기록일 < dateBefore (제외) */
  dateBefore?: string
  /** 이후: 기록일 >= dateAfter (포함) */
  dateAfter?: string
  /** 범위: start <= 기록일 <= end (양끝 포함) */
  dateRangeStart?: string
  dateRangeEnd?: string
  /** 대소문자 무시 부분 문자열 */
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

/**
 * 마커 필터링 (기록과 동일 RecordFilters).
 * - types: 마커는 토 종류 속성이 없으므로 무시
 * - catIds: 고양이 선택 시 연관 고양이가 있어야 표시, 미선택 시 모두 표시
 */
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
