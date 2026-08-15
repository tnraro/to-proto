import { describe, expect, test } from 'bun:test'
import { parseCalendarIndicator } from './calendarIndicator'

describe('parseCalendarIndicator', () => {
  test('없으면 기본값(summary)', () => {
    expect(parseCalendarIndicator(null)).toBe('summary')
  })

  test('유효한 값은 그대로', () => {
    expect(parseCalendarIndicator('summary')).toBe('summary')
    expect(parseCalendarIndicator('count')).toBe('count')
    expect(parseCalendarIndicator('pie')).toBe('pie')
  })

  test('레거시 불리언 값 마이그레이션: 1 → pie', () => {
    expect(parseCalendarIndicator('1')).toBe('pie')
  })

  test('레거시 불리언 값 마이그레이션: 0 → summary', () => {
    expect(parseCalendarIndicator('0')).toBe('summary')
  })

  test('알 수 없는 값은 기본값', () => {
    expect(parseCalendarIndicator('foo')).toBe('summary')
  })
})
