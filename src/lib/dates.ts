export function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function toLocalDateTimeInput(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day}T${h}:${min}`
}

export function fromLocalDateTimeInput(value: string): Date {
  return new Date(value)
}

function resolveLocale(): string {
  return typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'ko'
}

const rtf = new Intl.RelativeTimeFormat(resolveLocale(), { numeric: 'auto' })
const absFmt = new Intl.DateTimeFormat(resolveLocale(), {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

const absFullFmt = new Intl.DateTimeFormat(resolveLocale(), {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const MINUTE = 60
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** 기록 시각을 사용자 로케일 기반 상대 시간("n시간 전")으로 표시. 7일 초과/미래는 절대 시각 폴백 */
export function formatRelativeTime(iso: string, now = new Date()): string {
  const diffSec = Math.round((now.getTime() - new Date(iso).getTime()) / 1000)
  if (diffSec < 0 || diffSec >= 7 * DAY) return absFmt.format(new Date(iso))
  if (diffSec < MINUTE) return rtf.format(-diffSec, 'second')
  if (diffSec < HOUR) return rtf.format(-Math.round(diffSec / MINUTE), 'minute')
  if (diffSec < DAY) return rtf.format(-Math.round(diffSec / HOUR), 'hour')
  return rtf.format(-Math.round(diffSec / DAY), 'day')
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 로케일 기반 보기 좋은 절대 시각 (툴팁용) — 예: 2026. 8. 13. 오후 4:47 */
export function formatAbsoluteTime(iso: string): string {
  return absFullFmt.format(new Date(iso))
}

export function sameDayKey(iso: string): string {
  return toDateKey(new Date(iso))
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function monthLabel(d: Date): string {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`
}

export function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
