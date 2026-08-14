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

/** 하루 = 86,400,000ms */
export const DAY_MS = 24 * 60 * 60 * 1000

const MINUTE = 60
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** 기록 시각을 사용자 로케일 기반 상대 시간("n시간 전")으로 표시. 7일 초과/미래는 절대 시각 폴백 */
export function formatRelativeTime(iso: string, now = new Date()): string {
  const diffSec = Math.round((now.getTime() - new Date(iso).getTime()) / 1000)
  if (diffSec < 0 || diffSec >= 7 * DAY) return absFullFmt.format(new Date(iso))
  if (diffSec < MINUTE) return rtf.format(-diffSec, 'second')
  if (diffSec < HOUR) return rtf.format(-Math.round(diffSec / MINUTE), 'minute')
  if (diffSec < DAY) return rtf.format(-Math.round(diffSec / HOUR), 'hour')
  return rtf.format(-Math.round(diffSec / DAY), 'day')
}

/** 로케일 기반 보기 좋은 절대 시각 (툴팁용) — 예: 2026. 8. 13. 오후 4:47 */
export function formatAbsoluteTime(iso: string): string {
  return absFullFmt.format(new Date(iso))
}

/** ISO 문자열의 날짜 키(YYYY-MM-DD, 로컬 타임존) */
export function toDayKey(iso: string): string {
  return toDateKey(new Date(iso))
}

/** 시간축 데이터를 datetime 내림차순(최신순)으로 정렬 — 원본 배열은 변경하지 않음 */
export function sortByDatetimeDesc<T extends TimeSeriesItem>(items: T[]): T[] {
  return [...items].sort((a, b) => b.datetime.localeCompare(a.datetime))
}

/** 시간축 데이터를 로컬 날짜 키(YYYY-MM-DD) 기준으로 그룹화 */
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

