/** Virtualized month-list math. Month blocks use exact computed heights
 *  (header + calendar rows), so virtualization needs no measurement.
 *  idx is an absolute month index from REF_YEAR-01. */

export const REF_YEAR = 2000

export interface MonthLayout {
  headerH: number
  rowH: number
}

export const DEFAULT_LAYOUT: MonthLayout = { headerH: 64, rowH: 52 }

export function monthIndex(d: Date): number {
  return (d.getFullYear() - REF_YEAR) * 12 + d.getMonth()
}

export function monthFromIndex(idx: number): Date {
  return new Date(REF_YEAR + Math.floor(idx / 12), ((idx % 12) + 12) % 12, 1)
}

/** Calendar rows needed for the month (4-6) */
export function rowsInMonth(idx: number): number {
  const first = monthFromIndex(idx)
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  return Math.ceil((first.getDay() + daysInMonth) / 7)
}

export function monthHeight(idx: number, layout: MonthLayout = DEFAULT_LAYOUT): number {
  return layout.headerH + rowsInMonth(idx) * layout.rowH
}

/** Cumulative height of months [start, end) */
export function prefixHeight(start: number, end: number, layout: MonthLayout = DEFAULT_LAYOUT): number {
  let sum = 0
  for (let i = start; i < end; i++) sum += monthHeight(i, layout)
  return sum
}

/** Index of the month containing the given offset from the window start */
export function monthAtOffset(start: number, offset: number, layout: MonthLayout = DEFAULT_LAYOUT): number {
  let lo = start
  let hi = start + 1
  while (prefixHeight(start, hi, layout) <= offset) hi *= 2
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (prefixHeight(start, mid + 1, layout) <= offset) lo = mid + 1
    else hi = mid
  }
  return lo
}

/** Months intersecting the viewport [scrollTop, scrollTop + viewportH) within the window */
export function visibleMonths(
  start: number,
  end: number,
  scrollTop: number,
  viewportH: number,
  layout: MonthLayout = DEFAULT_LAYOUT,
): [number, number] {
  const first = Math.max(start, monthAtOffset(start, Math.max(0, scrollTop), layout))
  const bottom = scrollTop + viewportH
  let last = first
  while (last < end && prefixHeight(start, last + 1, layout) < bottom) last++
  return [first, Math.min(end, last + 1)]
}
