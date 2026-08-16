import { describe, expect, test } from 'bun:test'
import { blockOffset, blockWindow, monthFromIndex, monthHeight, monthIndex, rowsInMonth, type MonthLayout } from './monthList'

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

describe('blockWindow', () => {
  const FEB = monthIndex(new Date(2026, 1, 1))
  const JAN = FEB - 1

  test('앵커 블록이 로컬 top 0 (머신 좌표계 일치)', () => {
    const blocks = blockWindow(FEB, 0, 300, LAYOUT)
    expect(blocks[0].idx).toBe(FEB)
    expect(blocks[0].top).toBe(0)
  })

  test('뷰포트 [viewTop, viewTop+vh] 항상 커버', () => {
    const vh = 300
    for (const viewTop of [0, 100, 271, 272]) {
      const blocks = blockWindow(FEB, viewTop, vh, LAYOUT)
      expect(blocks[0].top).toBeLessThanOrEqual(viewTop)
      const last = blocks[blocks.length - 1]
      expect(last.top + last.height).toBeGreaterThanOrEqual(viewTop + vh)
    }
  })

  test('음수 viewTop (스냅 트윈)은 위쪽 블록을 포함', () => {
    const blocks = blockWindow(FEB, -50, 300, LAYOUT)
    expect(blocks[0].idx).toBe(JAN)
    expect(blocks[0].top).toBeLessThanOrEqual(-50)
    expect(blocks.find((b) => b.idx === FEB)?.top).toBe(0)
  })

  test('블록은 인덱스와 위치가 연속', () => {
    const blocks = blockWindow(FEB, 100, 300, LAYOUT)
    for (let i = 1; i < blocks.length; i++) {
      expect(blocks[i].idx).toBe(blocks[i - 1].idx + 1)
      expect(blocks[i].top).toBe(blocks[i - 1].top + blocks[i - 1].height)
    }
  })

  test('vh가 0이어도 최소 1개 블록', () => {
    expect(blockWindow(FEB, 0, 0, LAYOUT).length).toBeGreaterThan(0)
  })
})

describe('blockOffset', () => {
  const FEB = monthIndex(new Date(2026, 1, 1))
  const JAN = FEB - 1
  const MAR = FEB + 1

  test('같은 앵커는 0', () => {
    expect(blockOffset(FEB, FEB, LAYOUT)).toBe(0)
  })

  test('다음 달은 앵커 높이', () => {
    expect(blockOffset(FEB, MAR, LAYOUT)).toBe(monthHeight(FEB, LAYOUT))
  })

  test('이전 달은 음수 높이', () => {
    expect(blockOffset(FEB, JAN, LAYOUT)).toBe(-monthHeight(JAN, LAYOUT))
  })

  test('여러 달 누적 (양방향 대칭)', () => {
    const two = monthHeight(FEB, LAYOUT) + monthHeight(MAR, LAYOUT)
    expect(blockOffset(FEB, MAR + 1, LAYOUT)).toBe(two)
    expect(blockOffset(MAR + 1, FEB, LAYOUT)).toBe(-two)
  })
})
