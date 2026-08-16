import type { TimeSeriesItem } from '../types'

export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Local-timezone parse of a YYYY-MM-DD key (new Date(key) would parse as UTC) */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function toLocalDateTimeInput(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

export function fromLocalDateTimeInput(value: string): Date {
  return new Date(value)
}

/** datetime-local input value: existing iso/local value → preset date with current time → now */
export function formDatetimeInput(iso: string | undefined, presetDate: string | null | undefined, now = new Date()): string {
  if (iso) return toLocalDateTimeInput(new Date(iso))
  if (presetDate) {
    const d = new Date(presetDate)
    d.setHours(now.getHours(), now.getMinutes(), 0, 0)
    return toLocalDateTimeInput(d)
  }
  return toLocalDateTimeInput(now)
}

function resolveLocale(): string {
  return typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'ko'
}

const rtf = new Intl.RelativeTimeFormat(resolveLocale(), { numeric: 'auto' })

const absFullFmt = new Intl.DateTimeFormat(resolveLocale(), {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export const DAY_MS = 24 * 60 * 60 * 1000

const MINUTE = 60
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export function formatRelativeTime(iso: string, now = new Date()): string {
  const diffSec = Math.round((now.getTime() - new Date(iso).getTime()) / 1000)
  if (diffSec < 0 || diffSec >= 7 * DAY) return absFullFmt.format(new Date(iso))
  if (diffSec < MINUTE) return rtf.format(-diffSec, 'second')
  if (diffSec < HOUR) return rtf.format(-Math.round(diffSec / MINUTE), 'minute')
  if (diffSec < DAY) return rtf.format(-Math.round(diffSec / HOUR), 'hour')
  return rtf.format(-Math.round(diffSec / DAY), 'day')
}

export function formatAbsoluteTime(iso: string): string {
  return absFullFmt.format(new Date(iso))
}

/** Day key (YYYY-MM-DD, local timezone) from an ISO string */
export function toDayKey(iso: string): string {
  return toDateKey(new Date(iso))
}

export function addDays(d: Date, n: number): Date {
  const next = new Date(d)
  next.setDate(d.getDate() + n)
  return next
}

/** Sunday-start week anchor of the given day */
export function startOfWeek(d: Date): Date {
  const next = new Date(d)
  next.setDate(d.getDate() - d.getDay())
  return next
}

/** The 7 day keys of the week containing the given key (Sunday first) */
export function weekDayKeys(key: string): string[] {
  const start = startOfWeek(parseDateKey(key))
  return Array.from({ length: 7 }, (_, i) => toDateKey(addDays(start, i)))
}

export function sortByDatetimeDesc<T extends TimeSeriesItem>(items: T[]): T[] {
  return [...items].sort((a, b) => b.datetime.localeCompare(a.datetime))
}

/** Groups time-based data by local day key (YYYY-MM-DD) */
export function groupByDay<T extends TimeSeriesItem>(items: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const key = toDayKey(item.datetime)
    const list = map.get(key) ?? []
    list.push(item)
    map.set(key, list)
  }
  return map
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function monthLabel(d: Date): string {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`
}

/** Localized day header, e.g. "8월 16일 (일)" */
export function dayLabel(key: string): string {
  const d = parseDateKey(key)
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`
}

