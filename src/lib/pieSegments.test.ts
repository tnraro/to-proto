import { describe, expect, test } from 'bun:test'
import { pieSegments } from './pieSegments'
import { VOMIT_TYPES, type VomitType } from '../types'

describe('pieSegments', () => {
  test('빈 목록이면 빈 세그먼트', () => {
    expect(pieSegments([])).toEqual([])
  })

  test('단일 종류는 0-100% 한 바퀴', () => {
    const segs = pieSegments([{ type: 'food', count: 3 }])
    expect(segs).toEqual([{ color: VOMIT_TYPES.food.hex, start: 0, end: 100 }])
  })

  test('여러 종류는 횟수 비례 세그먼트', () => {
    const segs = pieSegments([
      { type: 'food', count: 1 },
      { type: 'hairball', count: 1 },
    ])
    expect(segs).toHaveLength(2)
    expect(segs[0]).toEqual({ color: VOMIT_TYPES.food.hex, start: 0, end: 50 })
    expect(segs[1]).toEqual({ color: VOMIT_TYPES.hairball.hex, start: 50, end: 100 })
  })

  test('비율이 다른 경우 시작/끝 계산', () => {
    const segs = pieSegments([
      { type: 'foam', count: 2 },
      { type: 'bile', count: 1 },
      { type: 'bloody', count: 1 },
    ])
    expect(segs).toEqual([
      { color: VOMIT_TYPES.foam.hex, start: 0, end: 50 },
      { color: VOMIT_TYPES.bile.hex, start: 50, end: 75 },
      { color: VOMIT_TYPES.bloody.hex, start: 75, end: 100 },
    ])
  })

  test('전체 종류(8개)를 병합 없이 모두 유지', () => {
    const items = (Object.keys(VOMIT_TYPES) as VomitType[]).map((type) => ({ type, count: 1 }))
    const segs = pieSegments(items)
    expect(segs).toHaveLength(8)
    expect(segs[0].start).toBe(0)
    expect(segs[7].end).toBe(100)
  })

  test('입력 순서(횟수 내림차순) 유지', () => {
    const segs = pieSegments([
      { type: 'food', count: 5 },
      { type: 'other', count: 1 },
    ])
    expect(segs[0].color).toBe(VOMIT_TYPES.food.hex)
    expect(segs[1].color).toBe(VOMIT_TYPES.other.hex)
  })
})
