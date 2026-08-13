import type { AlertEntry, Cat, ThresholdRule, VomitRecord } from '../types'

const CATS_KEY = 'to.cats'
const RECORDS_KEY = 'to.records'
const RULES_KEY = 'to.rules'
const ALERT_LOG_KEY = 'to.alertLog'

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function uid(): string {
  return crypto.randomUUID()
}

export function loadCats(): Cat[] {
  return load<Cat[]>(CATS_KEY, [])
}

export function saveCats(cats: Cat[]) {
  save(CATS_KEY, cats)
}

export function loadRecords(): VomitRecord[] {
  return load<VomitRecord[]>(RECORDS_KEY, [])
}

export function saveRecords(records: VomitRecord[]) {
  save(RECORDS_KEY, records)
}

export function loadRules(): ThresholdRule[] {
  return load<ThresholdRule[]>(RULES_KEY, [])
}

export function saveRules(rules: ThresholdRule[]) {
  save(RULES_KEY, rules)
}

export function loadAlertLog(): AlertEntry[] {
  return load<AlertEntry[]>(ALERT_LOG_KEY, [])
}

export function saveAlertLog(entries: AlertEntry[]) {
  save(ALERT_LOG_KEY, entries)
}
