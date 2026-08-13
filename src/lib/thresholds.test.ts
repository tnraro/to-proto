import { describe, expect, test } from 'bun:test'
import type { Cat, ThresholdRule, VomitRecord } from '../types'
import { evaluateRules } from './thresholds'

const cats: Cat[] = [{ id: 'c1', name: '나비' }]

const now = new Date('2026-08-13T12:00:00')

function rec(datetime: Date, catId = 'c1', type: VomitRecord['type'] = 'food'): VomitRecord {
  return {
    id: Math.random().toString(36).slice(2),
    datetime: datetime.toISOString(),
    catId,
    type,
    memo: '',
    createdAt: datetime.toISOString(),
    updatedAt: datetime.toISOString(),
  }
}

const rule1d: ThresholdRule = { id: 'r1', catId: 'c1', windowDays: 1, maxCount: 3, type: null, enabled: true }

describe('evaluateRules', () => {
  test('24시간 내 4회면 3회 초과 규칙 위반', () => {
    const records = [
      rec(new Date('2026-08-13T06:00:00')),
      rec(new Date('2026-08-13T08:00:00')),
      rec(new Date('2026-08-13T10:00:00')),
      rec(new Date('2026-08-13T11:30:00')),
    ]
    const violations = evaluateRules([rule1d], records, cats, now)
    expect(violations).toHaveLength(1)
    expect(violations[0].count).toBe(4)
    expect(violations[0].catName).toBe('나비')
  })

  test('3회면 위반 아님 (초과만 경고)', () => {
    const records = [
      rec(new Date('2026-08-13T06:00:00')),
      rec(new Date('2026-08-13T08:00:00')),
      rec(new Date('2026-08-13T10:00:00')),
    ]
    expect(evaluateRules([rule1d], records, cats, now)).toHaveLength(0)
  })

  test('윈도우 밖 기록은 집계 제외', () => {
    const records = [
      rec(new Date('2026-08-10T06:00:00')), // 3일 전
      rec(new Date('2026-08-13T06:00:00')),
      rec(new Date('2026-08-13T08:00:00')),
      rec(new Date('2026-08-13T10:00:00')),
      rec(new Date('2026-08-13T11:00:00')),
    ]
    const violations = evaluateRules([rule1d], records, cats, now)
    expect(violations).toHaveLength(1)
    expect(violations[0].count).toBe(4) // 윈도우 밖 기록 미포함
  })

  test('고양이 필터: 다른 고양이 기록은 제외', () => {
    const records = [
      rec(new Date('2026-08-13T06:00:00'), 'c1'),
      rec(new Date('2026-08-13T07:00:00'), 'c1'),
      rec(new Date('2026-08-13T08:00:00'), 'c1'),
      rec(new Date('2026-08-13T09:00:00'), 'c1'),
      rec(new Date('2026-08-13T11:00:00'), 'c2'), // 대상 아닌 고양이
    ]
    const violations = evaluateRules([rule1d], records, cats, now)
    expect(violations).toHaveLength(1)
    expect(violations[0].count).toBe(4)
  })

  test('종류 필터: 특정 종류만 집계', () => {
    const rule = { ...rule1d, type: 'bloody' as const }
    const records = [
      rec(new Date('2026-08-13T06:00:00')), // food
      rec(new Date('2026-08-13T07:00:00'), 'c1', 'bloody'),
      rec(new Date('2026-08-13T08:00:00'), 'c1', 'bloody'),
      rec(new Date('2026-08-13T09:00:00'), 'c1', 'bloody'),
      rec(new Date('2026-08-13T10:00:00'), 'c1', 'bloody'),
    ]
    const violations = evaluateRules([rule], records, cats, now)
    expect(violations).toHaveLength(1)
    expect(violations[0].count).toBe(4)
  })

  test('비활성 규칙은 무시', () => {
    const records = [rec(new Date('2026-08-13T06:00:00')), rec(new Date('2026-08-13T08:00:00')), rec(new Date('2026-08-13T10:00:00')), rec(new Date('2026-08-13T11:00:00'))]
    expect(evaluateRules([{ ...rule1d, enabled: false }], records, cats, now)).toHaveLength(0)
  })
})

describe('addRecord 경고 생성 시뮬레이션 (수정 후)', () => {
  test('3회 → 4회째 추가 시 경고 1건', () => {
    const before = [
      rec(new Date('2026-08-13T06:00:00')),
      rec(new Date('2026-08-13T08:00:00')),
      rec(new Date('2026-08-13T10:00:00')),
    ]
    const created = rec(new Date('2026-08-13T11:30:00'))
    const newAlerts = evaluateRules([rule1d], [...before, created], cats, now)
    expect(newAlerts).toHaveLength(1)
  })

  test('이미 위반 중이어도 기록 추가 시 경고 발생 (버그 수정)', () => {
    const existing = [
      rec(new Date('2026-08-13T06:00:00')),
      rec(new Date('2026-08-13T08:00:00')),
      rec(new Date('2026-08-13T10:00:00')),
      rec(new Date('2026-08-13T11:00:00')),
    ]
    const created = rec(new Date('2026-08-13T11:30:00'))
    const newAlerts = evaluateRules([rule1d], [...existing, created], cats, now)
    expect(newAlerts).toHaveLength(1)
  })

  test('과거 날짜 기록 추가는 윈도우 집계에 영향 없음 → 경고 없음', () => {
    const existing = [
      rec(new Date('2026-08-13T06:00:00')),
      rec(new Date('2026-08-13T08:00:00')),
      rec(new Date('2026-08-13T10:00:00')),
    ]
    const created = rec(new Date('2026-08-10T09:00:00')) // 3일 전 기록을 이제 추가
    const newAlerts = evaluateRules([rule1d], [...existing, created], cats, now)
    expect(newAlerts).toHaveLength(0)
  })
})
