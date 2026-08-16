import { describe, expect, test } from 'bun:test'
import { blockCount, monthFromIndex, monthHeight, monthIndex, rowsInMonth, type MonthLayout } from './monthList'

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

describe('monthHeight', () => {
  test('높이 = 헤더 + 행 수 × 행 높이', () => {
    const idx = monthIndex(new Date(2026, 7, 1)) // 6행
    expect(monthHeight(idx, LAYOUT)).toBe(64 + 6 * 52)
  })

  test('4행 월이 최소 높이', () => {
    const idx = monthIndex(new Date(2026, 1, 1))
    expect(monthHeight(idx, LAYOUT)).toBe(64 + 4 * 52)
  })
})

describe('blockCount', () => {
  test('뷰포트가 0이면 최소 블록 수', () => {
    expect(blockCount(0, LAYOUT)).toBe(Math.ceil((64 + 6 * 52) / (64 + 4 * 52)) + 1)
  })

  test('뷰포트가 커질수록 블록 수 증가', () => {
    const small = blockCount(300, LAYOUT)
    const large = blockCount(900, LAYOUT)
    expect(large).toBeGreaterThan(small)
  })

  test('항상 앵커 위 1개월 포함해 커버', () => {
    const vh = 300
    const count = blockCount(vh, LAYOUT)
    const minH = 64 + 4 * 52
    const maxH = 64 + 6 * 52
    // 아래쪽 블록 (count-1)개가 maxH + vh를 덮어야 함
    expect((count - 1) * minH).toBeGreaterThanOrEqual(maxH + vh)
  })
})
