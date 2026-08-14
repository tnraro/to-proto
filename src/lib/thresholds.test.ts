import { describe, expect, test } from 'bun:test'
import type { Cat, ThresholdRule, VomitRecord, VomitType } from '../types'
import { evaluateNewRecord, evaluateRules } from './thresholds'

const cats: Cat[] = [{ id: 'c1', name: '나비' }]

const now = new Date('2026-08-13T12:00:00')

function rec(datetime: Date, catId = 'c1', types: VomitType[] = ['food']): VomitRecord {
  return {
    id: Math.random().toString(36).slice(2),
    datetime: datetime.toISOString(),
    catId,
    types,
    memo: '',
    createdAt: datetime.toISOString(),
    updatedAt: datetime.toISOString(),
  }
}

const rule1d: ThresholdRule = { id: 'r1', catId: 'c1', windowDays: 1, maxCount: 3, type: null, enabled: true }

describe('evaluateRules', () => {
  test('24시간 내 4회면 3회 이상 규칙 위반', () => {
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

  test('2회면 위반 아님', () => {
    const records = [
      rec(new Date('2026-08-13T06:00:00')),
      rec(new Date('2026-08-13T08:00:00')),
    ]
    expect(evaluateRules([rule1d], records, cats, now)).toHaveLength(0)
  })

  test('정확히 3회면 위반 (이상 규칙)', () => {
    const records = [
      rec(new Date('2026-08-13T06:00:00')),
      rec(new Date('2026-08-13T08:00:00')),
      rec(new Date('2026-08-13T10:00:00')),
    ]
    const violations = evaluateRules([rule1d], records, cats, now)
    expect(violations).toHaveLength(1)
    expect(violations[0].count).toBe(3)
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

  test('종류 필터: 포함 매칭 (다중 종류 기록도 집계)', () => {
    const rule = { ...rule1d, type: 'bloody' as const }
    const records = [
      rec(new Date('2026-08-13T06:00:00')), // food
      rec(new Date('2026-08-13T07:00:00'), 'c1', ['bloody']),
      rec(new Date('2026-08-13T08:00:00'), 'c1', ['food', 'bloody']), // 다중: 포함 매칭
      rec(new Date('2026-08-13T09:00:00'), 'c1', ['bloody']),
      rec(new Date('2026-08-13T10:00:00'), 'c1', ['bloody']),
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

describe('addRecord 경고 생성 시뮬레이션 (evaluateNewRecord)', () => {
  test('2회 → 3회째 추가 시 경고 1건 (기준 도달)', () => {
    const before = [
      rec(new Date('2026-08-13T06:00:00')),
      rec(new Date('2026-08-13T08:00:00')),
    ]
    const created = rec(new Date('2026-08-13T10:00:00'))
    const newAlerts = evaluateNewRecord([rule1d], before, cats, created, now)
    expect(newAlerts).toHaveLength(1)
    expect(newAlerts[0].count).toBe(3)
  })

  test('임계값 미달 상태의 추가는 경고 없음 (0회·1회 상태에서 3회 규칙)', () => {
    const created = rec(new Date('2026-08-13T10:00:00'))
    expect(evaluateNewRecord([rule1d], [], cats, created, now)).toHaveLength(0)
    const one = [rec(new Date('2026-08-13T06:00:00'))]
    expect(evaluateNewRecord([rule1d], one, cats, created, now)).toHaveLength(0)
  })

  test('이미 위반 중이어도 일치 기록 추가 시 경고 (이상 규칙 재경고)', () => {
    const existing = [
      rec(new Date('2026-08-13T06:00:00')),
      rec(new Date('2026-08-13T08:00:00')),
      rec(new Date('2026-08-13T10:00:00')),
      rec(new Date('2026-08-13T11:00:00')),
    ]
    const created = rec(new Date('2026-08-13T11:30:00'))
    const newAlerts = evaluateNewRecord([rule1d], existing, cats, created, now)
    expect(newAlerts).toHaveLength(1)
    expect(newAlerts[0].count).toBe(5)
  })

  test('과거 날짜 기록 추가는 윈도우 집계에 영향 없음 → 경고 없음', () => {
    const existing = [
      rec(new Date('2026-08-13T06:00:00')),
      rec(new Date('2026-08-13T08:00:00')),
    ]
    const created = rec(new Date('2026-08-10T09:00:00')) // 3일 전 기록을 이제 추가
    expect(evaluateNewRecord([rule1d], existing, cats, created, now)).toHaveLength(0)
  })

  test('비일치 기록 추가 시: 이미 만족 중인 헤어볼 규칙은 경고 없음, 종류 무관만 경고', () => {
    const anyRule: ThresholdRule = { id: 'r3', catId: 'c1', windowDays: 7, maxCount: 5, type: null, enabled: true }
    const hairballRule: ThresholdRule = { id: 'r2', catId: 'c1', windowDays: 7, maxCount: 2, type: 'hairball', enabled: true }
    const existing = [
      rec(new Date('2026-08-12T06:00:00'), 'c1', ['hairball']),
      rec(new Date('2026-08-12T10:00:00'), 'c1', ['hairball']), // 헤어볼 2회 → 헤어볼 규칙 이미 만족
      rec(new Date('2026-08-13T06:00:00')), // food
      rec(new Date('2026-08-13T08:00:00')), // food
    ]
    const created = rec(new Date('2026-08-13T10:00:00')) // food → 종류 무관 5회째로 교차, 헤어볼 규칙엔 불일치
    const newAlerts = evaluateNewRecord([anyRule, hairballRule], existing, cats, created, now)
    expect(newAlerts).toHaveLength(1)
    expect(newAlerts[0].rule.id).toBe(anyRule.id)
    expect(newAlerts[0].count).toBe(5)
  })

  test('일치 기록 추가 시: 영향받는 규칙 모두 경고', () => {
    const anyRule: ThresholdRule = { id: 'r3', catId: 'c1', windowDays: 7, maxCount: 5, type: null, enabled: true }
    const hairballRule: ThresholdRule = { id: 'r2', catId: 'c1', windowDays: 7, maxCount: 2, type: 'hairball', enabled: true }
    const existing = [
      rec(new Date('2026-08-12T06:00:00'), 'c1', ['hairball']), // 헤어볼 1회
      rec(new Date('2026-08-13T06:00:00')), // food
      rec(new Date('2026-08-13T08:00:00')), // food
      rec(new Date('2026-08-13T10:00:00')), // food
    ]
    const created = rec(new Date('2026-08-13T11:00:00'), 'c1', ['hairball', 'food'])
    const newAlerts = evaluateNewRecord([anyRule, hairballRule], existing, cats, created, now)
    expect(newAlerts).toHaveLength(2)
  })
})
