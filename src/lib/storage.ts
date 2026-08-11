import type { Cat, VomitRecord } from '../types'

const CATS_KEY = 'to.cats'
const RECORDS_KEY = 'to.records'

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
