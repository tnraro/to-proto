import { describe, expect, test } from 'bun:test'
import { addDays, dayLabel, startOfWeek, toDateKey, weekDayKeys } from './dates'

describe('addDays', () => {
  test('일 수만큼 이동', () => {
    expect(toDateKey(addDays(new Date(2026, 7, 10), 3))).toBe('2026-08-13')
  })

  test('월 경계', () => {
    expect(toDateKey(addDays(new Date(2026, 6, 31), 1))).toBe('2026-08-01')
  })

  test('연 경계와 음수 이동', () => {
    expect(toDateKey(addDays(new Date(2026, 0, 1), -1))).toBe('2025-12-31')
  })

  test('원본 Date 불변', () => {
    const d = new Date(2026, 7, 10)
    addDays(d, 5)
    expect(d.getDate()).toBe(10)
  })
})

describe('startOfWeek', () => {
  test('일요일은 그대로', () => {
    expect(toDateKey(startOfWeek(new Date(2026, 7, 16)))).toBe('2026-08-16')
  })

  test('수요일 → 같은 주 일요일', () => {
    expect(toDateKey(startOfWeek(new Date(2026, 7, 19)))).toBe('2026-08-16')
  })

  test('월초 주 경계', () => {
    expect(toDateKey(startOfWeek(new Date(2026, 7, 3)))).toBe('2026-08-02')
  })
})

describe('weekDayKeys', () => {
  test('선택 일이 속한 주의 일~토 7개 키', () => {
    expect(weekDayKeys('2026-08-19')).toEqual([
      '2026-08-16',
      '2026-08-17',
      '2026-08-18',
      '2026-08-19',
      '2026-08-20',
      '2026-08-21',
      '2026-08-22',
    ])
  })

  test('월 경계 주', () => {
    expect(weekDayKeys('2026-09-01')).toEqual([
      '2026-08-30',
      '2026-08-31',
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
      '2026-09-05',
    ])
  })
})

describe('dayLabel', () => {
  test('한국어 라벨', () => {
    expect(dayLabel('2026-08-16')).toBe('8월 16일 (일)')
  })

  test('월 경계', () => {
    expect(dayLabel('2026-09-01')).toBe('9월 1일 (화)')
  })
})
