import type { AlertEntry, Cat, ThresholdRule, VomitRecord } from '../types'
import { VOMIT_TYPES } from '../types'
import { DAY_MS } from './dates'
import { uid } from './storage'

export interface Violation {
  rule: ThresholdRule
  catName: string
  count: number
}

export function evaluateRules(
  rules: ThresholdRule[],
  records: VomitRecord[],
  cats: Cat[],
  now: Date,
): Violation[] {
  const violations: Violation[] = []
  for (const rule of rules) {
    if (!rule.enabled) continue
    const cutoff = now.getTime() - rule.windowDays * DAY_MS
    let count = 0
    for (const r of records) {
      const t = new Date(r.datetime).getTime()
      if (t < cutoff || t > now.getTime()) continue
      if (rule.catId !== null && r.catId !== rule.catId) continue
      if (rule.type !== null && !r.types.includes(rule.type)) continue
      count++
    }
    if (count >= rule.maxCount) {
      violations.push({
        rule,
        catName: rule.catId === null ? '전체 고양이' : (cats.find((c) => c.id === rule.catId)?.name ?? '?'),
        count,
      })
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
