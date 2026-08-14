import type { AlertEntry, Cat, ThresholdRule, VomitRecord } from '../types'
import { VOMIT_TYPES } from '../types'
import { DAY_MS } from './dates'
import { uid } from './storage'

export interface Violation {
  rule: ThresholdRule
  catName: string
  count: number
}

function ruleMatchesRecord(rule: ThresholdRule, r: Pick<VomitRecord, 'catId' | 'types'>): boolean {
  if (rule.catId !== null && r.catId !== rule.catId) return false
  if (rule.type !== null && !r.types.includes(rule.type)) return false
  return true
}

function countInWindow(rule: ThresholdRule, records: VomitRecord[], nowMs: number, cutoff: number): number {
  let count = 0
  for (const r of records) {
    const t = new Date(r.datetime).getTime()
    if (t < cutoff || t > nowMs) continue
    if (ruleMatchesRecord(rule, r)) count++
  }
  return count
}

function catNameOf(rule: ThresholdRule, cats: Cat[]): string {
  return rule.catId === null ? '전체 고양이' : (cats.find((c) => c.id === rule.catId)?.name ?? '?')
}

export function evaluateRules(
  rules: ThresholdRule[],
  records: VomitRecord[],
  cats: Cat[],
  now: Date,
): Violation[] {
  const violations: Violation[] = []
  const nowMs = now.getTime()
  for (const rule of rules) {
    if (!rule.enabled) continue
    const cutoff = nowMs - rule.windowDays * DAY_MS
    const count = countInWindow(rule, records, nowMs, cutoff)
    if (count >= rule.maxCount) {
      violations.push({ rule, catName: catNameOf(rule, cats), count })
    }
  }
  return violations
}

/**
 * 기록 추가 시 새 경고 판정: 새 기록이 일치하는 규칙만 재평가하고,
 * 이번 기록이 임계값을 넘게 만든 경우(교차)에만 경고를 반환한다.
 * 이미 위반 중인 규칙은 재경고하지 않는다.
 */
export function evaluateNewRecord(
  rules: ThresholdRule[],
  records: VomitRecord[],
  cats: Cat[],
  newRecord: VomitRecord,
  now: Date,
): Violation[] {
  const violations: Violation[] = []
  const nowMs = now.getTime()
  for (const rule of rules) {
    if (!rule.enabled || !ruleMatchesRecord(rule, newRecord)) continue
    const cutoff = nowMs - rule.windowDays * DAY_MS
    const t = new Date(newRecord.datetime).getTime()
    if (t < cutoff || t > nowMs) continue
    const countBefore = countInWindow(rule, records, nowMs, cutoff)
    // 이번 기록이 일치·집계되어 count가 임계값 이상이면 경고 (이미 위반 중이어도 재경고)
    const count = countBefore + 1
    if (count >= rule.maxCount) {
      violations.push({ rule, catName: catNameOf(rule, cats), count })
    }
  }
  return violations
}

export function violationToAlertEntry(v: Violation): AlertEntry {
  return {
    id: uid(),
    ruleId: v.rule.id,
    createdAt: new Date().toISOString(),
    catName: v.catName,
    typeLabel: v.rule.type === null ? '종류 무관' : VOMIT_TYPES[v.rule.type].label,
    windowDays: v.rule.windowDays,
    maxCount: v.rule.maxCount,
    count: v.count,
  }
}

export const RULE_PRESETS = [
  { label: '하루 3회', windowDays: 1, maxCount: 3 },
  { label: '7일 7회', windowDays: 7, maxCount: 7 },
  { label: '7일 3회(피·담즙)', windowDays: 7, maxCount: 3, type: 'bloody' as const },
]
