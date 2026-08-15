import type { TimeSeriesItem } from '../types'

function pad2(n: number): string {
  return String(n).padStart(2, '0')
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

