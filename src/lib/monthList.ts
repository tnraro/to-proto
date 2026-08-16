/** Month-index math for the tiled virtual calendar.
 *  idx is an absolute month index from REF_YEAR-01. Block heights are exact
 *  (header + calendar rows), so tiling needs no measurement. Positions derive
 *  from the anchor month and its neighbors only; local offsets over a bounded
 *  range (a single gesture's travel) are computed on demand via blockOffset. */

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

/** Local top of targetIdx's block relative to anchorIdx's block top.
 *  Bounded by a single gesture's travel — the snap tween geometry needs this
 *  when the flick target is more than one month away from the release anchor. */
export function blockOffset(anchorIdx: number, targetIdx: number, layout: MonthLayout = DEFAULT_LAYOUT): number {
  let offset = 0
  if (targetIdx > anchorIdx) {
    for (let i = anchorIdx; i < targetIdx; i++) offset += monthHeight(i, layout)
  } else {
    for (let i = targetIdx; i < anchorIdx; i++) offset -= monthHeight(i, layout)
  }
  return offset
}
