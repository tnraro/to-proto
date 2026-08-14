import { describe, expect, test } from 'bun:test'
import type { Marker, VomitRecord } from '../types'
import { EMPTY_FILTERS, filterMarkers, filterRecords, type RecordFilters } from './filters'

function rec(datetime: string, catId: string, types: VomitRecord['types'], memo = ''): VomitRecord {
  return {
    id: `${datetime}-${catId}-${types.join('')}`,
    datetime,
    catId,
    types,
    memo,
    photos: [],
    createdAt: datetime,
    updatedAt: datetime,
  }
}

function marker(datetime: string, catIds: string[], memo?: string): Marker {
  return {
    id: `${datetime}-${catIds.join('')}`,
    datetime,
    typeId: 't1',
    catIds,
    memo,
    photos: [],
    createdAt: datetime,
    updatedAt: datetime,
  }
}

const records = [
  rec('2026-08-13T10:00:00', 'c1', ['food', 'foam'], '밥 먹고 토함'),
  rec('2026-08-13T08:00:00', 'c2', ['food'], ''),
  rec('2026-08-10T12:00:00', 'c1', ['hairball'], '털뭉치'),
  rec('2026-07-30T09:00:00', 'c2', ['bile'], ''),
  rec('2025-12-31T23:00:00', 'c1', ['bloody'], '피 발견'),
]

describe('filterRecords', () => {
  test('빈 필터 = 전체 반환', () => {
    expect(filterRecords(records, EMPTY_FILTERS)).toHaveLength(5)
  })

  test('사용자 예시: (A or B) AND (사료 or 거품) AND (2026년 이후)', () => {
    const f: RecordFilters = {
      ...EMPTY_FILTERS,
      catIds: ['c1', 'c2'],
      types: ['food', 'foam'],
      dateMode: 'after',
      dateAfter: '2026-01-01',
    }
    const result = filterRecords(records, f)
    expect(result).toHaveLength(2)
    expect(result.map((r) => r.id)).toContain('2026-08-13T10:00:00-c1-foodfoam')
    expect(result.map((r) => r.id)).toContain('2026-08-13T08:00:00-c2-food')
  })

  test('고양이 복수 선택 OR', () => {
    const f: RecordFilters = { ...EMPTY_FILTERS, catIds: ['c1', 'c2'] }
    expect(filterRecords(records, f)).toHaveLength(5)
  })

  test('고양이 단일 선택', () => {
    const f: RecordFilters = { ...EMPTY_FILTERS, catIds: ['c1'] }
    expect(filterRecords(records, f)).toHaveLength(3)
  })

  test('종류 복수 선택 OR (포함 매칭)', () => {
    const f: RecordFilters = { ...EMPTY_FILTERS, types: ['hairball', 'bloody'] }
    expect(filterRecords(records, f)).toHaveLength(2)
  })

  test('이전: 기준일 미만 (해당일 제외)', () => {
    const f: RecordFilters = { ...EMPTY_FILTERS, dateMode: 'before', dateBefore: '2026-08-10' }
    expect(filterRecords(records, f)).toHaveLength(2) // 07-30, 12-31
  })

  test('이후: 기준일 이상 (해당일 포함)', () => {
    const f: RecordFilters = { ...EMPTY_FILTERS, dateMode: 'after', dateAfter: '2026-08-10' }
    expect(filterRecords(records, f)).toHaveLength(3) // 08-10, 08-13 x2
  })

  test('범위: 양끝 포함', () => {
    const f: RecordFilters = {
      ...EMPTY_FILTERS,
      dateMode: 'range',
      dateRangeStart: '2026-08-01',
      dateRangeEnd: '2026-08-13',
    }
    expect(filterRecords(records, f)).toHaveLength(3)
  })

  test('메모: 대소문자 무시 부분 문자열', () => {
    const f: RecordFilters = { ...EMPTY_FILTERS, memo: '털' }
    expect(filterRecords(records, f)).toHaveLength(1)
    expect(filterRecords(records, f)[0].memo).toBe('털뭉치')
  })

  test('날짜는 로컬 기준 (timezone 무관): 로컬 08-13 23:30 기록은 이후(08-13)에 포함', () => {
    const late = rec(new Date(2026, 7, 13, 23, 30).toISOString(), 'c1', ['food'])
    const f: RecordFilters = { ...EMPTY_FILTERS, dateMode: 'after', dateAfter: '2026-08-13' }
    expect(filterRecords([late], f)).toHaveLength(1)
  })

  test('계열 간 AND: 메모 + 종류', () => {
    const f: RecordFilters = { ...EMPTY_FILTERS, memo: '토', types: ['hairball'] }
    expect(filterRecords(records, f)).toHaveLength(0)
    const f2: RecordFilters = { ...EMPTY_FILTERS, memo: '토', types: ['food'] }
    expect(filterRecords(records, f2)).toHaveLength(1)
  })
})

const markers = [
  marker('2026-08-13T11:00:00', ['c1', 'c2'], '건강 검진 다녀옴'),
  marker('2026-08-10T12:00:00', ['c1']),
  marker('2026-07-30T09:00:00', [], '사료 교체'),
]

describe('filterMarkers', () => {
  test('빈 필터 = 전체 반환', () => {
    expect(filterMarkers(markers, EMPTY_FILTERS)).toHaveLength(3)
  })

  test('고양이 선택: 연관 고양이가 있는 마커만 (빈 catIds는 제외)', () => {
    const f: RecordFilters = { ...EMPTY_FILTERS, catIds: ['c1'] }
    const result = filterMarkers(markers, f)
    expect(result).toHaveLength(2)
    expect(result.every((m) => m.catIds.includes('c1'))).toBe(true)
  })

  test('고양이 미선택: 모두 표시', () => {
    const f: RecordFilters = { ...EMPTY_FILTERS, catIds: [] }
    expect(filterMarkers(markers, f)).toHaveLength(3)
  })

  test('types 필터는 무시', () => {
    const f: RecordFilters = { ...EMPTY_FILTERS, types: ['food'] }
    expect(filterMarkers(markers, f)).toHaveLength(3)
  })

  test('날짜 필터 적용 (이후)', () => {
    const f: RecordFilters = { ...EMPTY_FILTERS, dateMode: 'after', dateAfter: '2026-08-10' }
    expect(filterMarkers(markers, f)).toHaveLength(2) // 08-13, 08-10
  })

  test('메모: 대소문자 무시 부분 문자열 (없으면 통과)', () => {
    const f: RecordFilters = { ...EMPTY_FILTERS, memo: '검진' }
    expect(filterMarkers(markers, f)).toHaveLength(1)
    const f2: RecordFilters = { ...EMPTY_FILTERS, memo: '없는단어' }
    expect(filterMarkers(markers, f2)).toHaveLength(0)
  })

  test('고양이 + 날짜 조합', () => {
    const f: RecordFilters = {
      ...EMPTY_FILTERS,
      catIds: ['c2'],
      dateMode: 'after',
      dateAfter: '2026-08-01',
    }
    expect(filterMarkers(markers, f)).toHaveLength(1)
  })

  test('마커 종류 필터: 선택한 종류만 (빈 배열 = 전체)', () => {
    const t1 = marker('2026-08-13T11:00:00', ['c1'], '검진')
    const t2 = marker('2026-08-13T12:00:00', ['c1'], '사료 교체')
    t2.typeId = 't2'
    const f: RecordFilters = { ...EMPTY_FILTERS, markerTypeIds: ['t1'] }
    expect(filterMarkers([t1, t2], f)).toHaveLength(1)
    expect(filterMarkers([t1, t2], { ...EMPTY_FILTERS, markerTypeIds: [] })).toHaveLength(2)
  })

  test('마커 종류 + 고양이 + 날짜 조합', () => {
    const f: RecordFilters = {
      ...EMPTY_FILTERS,
      markerTypeIds: ['t1'],
      catIds: ['c2'],
      dateMode: 'after',
      dateAfter: '2026-08-01',
    }
    expect(filterMarkers(markers, f)).toHaveLength(1)
  })
})
