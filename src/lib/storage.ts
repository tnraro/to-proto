import type { AlertEntry, Cat, ThresholdRule, VomitRecord } from '../types'
import { dbGet, dbSet } from './db'

const CATS_KEY = 'cats'
const RECORDS_KEY = 'records'
const RULES_KEY = 'rules'
const ALERT_LOG_KEY = 'alertLog'

export function uid(): string {
  return crypto.randomUUID()
}

export async function loadCats(): Promise<Cat[]> {
  return (await dbGet<Cat[]>(CATS_KEY)) ?? []
}

export async function saveCats(cats: Cat[]) {
  await dbSet(CATS_KEY, cats)
}

export async function loadRecords(): Promise<VomitRecord[]> {
  return (await dbGet<VomitRecord[]>(RECORDS_KEY)) ?? []
}

export async function saveRecords(records: VomitRecord[]) {
  await dbSet(RECORDS_KEY, records)
}

export async function loadRules(): Promise<ThresholdRule[]> {
  return (await dbGet<ThresholdRule[]>(RULES_KEY)) ?? []
}

export async function saveRules(rules: ThresholdRule[]) {
  await dbSet(RULES_KEY, rules)
}

export async function loadAlertLog(): Promise<AlertEntry[]> {
  return (await dbGet<AlertEntry[]>(ALERT_LOG_KEY)) ?? []
}

export async function saveAlertLog(entries: AlertEntry[]) {
  await dbSet(ALERT_LOG_KEY, entries)
}
