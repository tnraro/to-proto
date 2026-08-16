import { describe, expect, test } from 'bun:test'
import {
  monthAtOffset,
  monthFromIndex,
  monthHeight,
  monthIndex,
  prefixHeight,
  rowsInMonth,
  visibleMonths,
  type MonthLayout,
} from './monthList'

const LAYOUT: MonthLayout = { headerH: 64, rowH: 52 }

describe('monthIndex / monthFromIndex', () => {
  test('왕복', () => {
    for (const d of [new Date(2026, 7, 15), new Date(1999, 11, 1), new Date(2050, 0, 1)]) {
      const idx = monthIndex(d)
      const back = monthFromIndex(idx)
      expect(back.getFullYear()).toBe(d.getFullYear())
      expect(back.getMonth()).toBe(d.getMonth())
    }
  })

  test('REF_YEAR 이전 월은 음수 인덱스', () => {
    expect(monthIndex(new Date(1999, 11, 1))).toBe(-1)
    expect(monthIndex(new Date(1999, 0, 1))).toBe(-12)
  })

  test('음수 인덱스 왕복', () => {
    expect(monthFromIndex(-1).getMonth()).toBe(11)
    expect(monthFromIndex(-1).getFullYear()).toBe(1999)
  })
})

describe('rowsInMonth', () => {
  test('2026-08 (토요일 시작, 31일) → 6행', () => {
    expect(rowsInMonth(monthIndex(new Date(2026, 7, 1)))).toBe(6)
  })

  test('2026-02 (일요일 시작, 28일) → 4행', () => {
    expect(rowsInMonth(monthIndex(new Date(2026, 1, 1)))).toBe(4)
  })

  test('2024-02 (목요일 시작, 29일) → 5행', () => {
    expect(rowsInMonth(monthIndex(new Date(2024, 1, 1)))).toBe(5)
  })
})

describe('monthHeight / prefixHeight', () => {
  test('높이 = 헤더 + 행 수 × 행 높이', () => {
    const idx = monthIndex(new Date(2026, 7, 1)) // 6행
    expect(monthHeight(idx, LAYOUT)).toBe(64 + 6 * 52)
  })

  test('prefixHeight는 연속 월 높이 합', () => {
    const a = monthIndex(new Date(2026, 0, 1))
    const b = monthIndex(new Date(2026, 2, 1))
    expect(prefixHeight(a, b, LAYOUT)).toBe(monthHeight(a, LAYOUT) + monthHeight(b - 1, LAYOUT))
  })

  test('빈 구간은 0', () => {
    const a = monthIndex(new Date(2026, 0, 1))
    expect(prefixHeight(a, a, LAYOUT)).toBe(0)
  })
})

describe('monthAtOffset', () => {
  const start = monthIndex(new Date(2026, 0, 1))

  test('윈도우 시작점', () => {
    expect(monthAtOffset(start, 0, LAYOUT)).toBe(start)
  })

  test('첫 달 내부 오프셋', () => {
    const firstH = monthHeight(start, LAYOUT)
    expect(monthAtOffset(start, firstH - 1, LAYOUT)).toBe(start)
  })

  test('월 경계 오프셋은 다음 월', () => {
    const firstH = monthHeight(start, LAYOUT)
    expect(monthAtOffset(start, firstH, LAYOUT)).toBe(start + 1)
  })

  test('여러 달을 건너는 오프셋', () => {
    const twoH = monthHeight(start, LAYOUT) + monthHeight(start + 1, LAYOUT)
    expect(monthAtOffset(start, twoH + 10, LAYOUT)).toBe(start + 2)
  })
})

describe('visibleMonths', () => {
  const start = monthIndex(new Date(2026, 0, 1))
  const end = start + 12

  test('뷰포트가 첫 달을 덮으면 첫 달부터 렌더', () => {
    // 2026-01은 5행(324px)이라 300px 뷰포트에는 첫 달만 포함
    expect(visibleMonths(start, end, 0, 300, LAYOUT)).toEqual([start, start + 1])
  })

  test('스크롤 위치에 따라 범위 이동', () => {
    const offset = prefixHeight(start, start + 3, LAYOUT)
    const [from, to] = visibleMonths(start, end, offset, 300, LAYOUT)
    expect(from).toBe(start + 3)
    expect(to).toBeGreaterThan(from)
  })

  test('윈도우 끝을 넘지 않음', () => {
    const bottom = prefixHeight(start, end, LAYOUT)
    const [, to] = visibleMonths(start, end, bottom - 100, 400, LAYOUT)
    expect(to).toBeLessThanOrEqual(end)
  })

  test('시작 전 오프셋은 첫 월로 클램프', () => {
    expect(visibleMonths(start, end, -50, 300, LAYOUT)[0]).toBe(start)
  })
})
