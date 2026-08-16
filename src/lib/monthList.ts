/** Month-index math for the tiled virtual calendar.
 *  idx is an absolute month index from REF_YEAR-01. Block heights are exact
 *  (header + calendar rows), so tiling needs no measurement. Never compute
 *  cumulative heights across arbitrary ranges — positions derive from the
 *  anchor month and its neighbors only. */

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

const MIN_ROWS = 4
const MAX_ROWS = 6

/** Blocks needed so the viewport [viewTop, viewTop + vh] stays covered while the
 *  anchor shifts one month in either direction (viewTop ≤ max month height) */
export function blockCount(vh: number, layout: MonthLayout = DEFAULT_LAYOUT): number {
  const minH = layout.headerH + MIN_ROWS * layout.rowH
  const maxH = layout.headerH + MAX_ROWS * layout.rowH
  return Math.ceil((maxH + vh) / minH) + 1
}
