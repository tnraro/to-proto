import type { VomitRecord, VomitType } from '../types'
import { toDateKey } from './dates'

export type DateMode = 'all' | 'before' | 'after' | 'range'

export interface RecordFilters {
  /** 빈 배열 = 전체 (내부 OR) */
  types: VomitType[]
  /** 빈 배열 = 전체 (내부 OR) */
  catIds: string[]
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
  dateMode: 'all',
  memo: '',
}

function toDayKey(iso: string): string {
  return toDateKey(new Date(iso))
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
