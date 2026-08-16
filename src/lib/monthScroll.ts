import { monthHeight, type MonthLayout } from './monthList'

export const DRAG_START_THRESHOLD = 10
export const SNAP_RATIO = 0.5
export const FLICK_VELOCITY = 0.5 // px/ms
export const VELOCITY_WINDOW_MS = 200
export const MAX_SAMPLES = 8

export type ScrollSession = 'idle' | 'pressed' | 'dragging'

export interface MonthScrollState {
  /** Month containing the viewport top edge */
  anchorIdx: number
  /** Offset of the viewport top edge within the anchor month, [0, h(anchor)] */
  viewTop: number
  session: ScrollSession
  startY: number | null
  lastY: number | null
  /** (t, y) samples for flick velocity */
  samples: { t: number; y: number }[]
}

export interface MoveResult {
  state: MonthScrollState
  active: boolean
}

export function createMonthScroll(anchorIdx: number, viewTop = 0): MonthScrollState {
  return { anchorIdx, viewTop, session: 'idle', startY: null, lastY: null, samples: [] }
}

export function beginMonthScroll(s: MonthScrollState, y: number, t: number): MonthScrollState {
  if (s.session !== 'idle') return s
  return { ...s, session: 'pressed', startY: y, lastY: y, samples: [{ t, y }] }
}

/** Finger drag. Pressed → dragging after the start threshold (stable takeover). */
export function moveMonthScroll(s: MonthScrollState, y: number, t: number, layout: MonthLayout): MoveResult {
  if (s.session === 'idle') return { state: s, active: false }
  if (s.session === 'pressed') {
    const dy = y - (s.startY ?? y)
    if (Math.abs(dy) < DRAG_START_THRESHOLD) return { state: { ...s, lastY: y }, active: false }
    return { state: { ...s, session: 'dragging', lastY: y, samples: pushSample(s.samples, t, y) }, active: true }
  }
  // Finger up (y decreasing) means content moves up → viewTop increases
  return applyOffset(s, (s.lastY ?? y) - y, y, t, layout)
}

/** Wheel input — moves like a drag without a pressed phase.
 *  Positive deltaY (wheel down) moves toward future months, matching natural
 *  scroll; sampled y is inverted so flick direction matches finger semantics. */
export function wheelMonthScroll(s: MonthScrollState, dy: number, t: number, layout: MonthLayout): MoveResult {
  if (s.session !== 'idle' && s.session !== 'dragging') return { state: s, active: false }
  return applyOffset({ ...s, session: 'dragging', lastY: 0 }, dy, lastSampleY(s) - dy, t, layout)
}

/** Release. Flick velocity wins. Positional rule: past the midpoint of the
 *  anchor month → advance (+1), otherwise stay on the anchor. A backward
 *  change (-1) only happens via flick — crossing a boundary already shifted
 *  the anchor, so "returning" is +1 relative to the new anchor. */
export function endMonthScroll(
  s: MonthScrollState,
  layout: MonthLayout,
): { state: MonthScrollState; change: -1 | 0 | 1 } {
  if (s.session !== 'dragging') return { state: createMonthScroll(s.anchorIdx), change: 0 }
  const v = velocity(s.samples)
  const h = monthHeight(s.anchorIdx, layout)
  let change: -1 | 0 | 1 = 0
  if (v < -FLICK_VELOCITY) change = 1
  else if (v > FLICK_VELOCITY) change = -1
  else if (s.viewTop > SNAP_RATIO * h) change = 1
  return { state: createMonthScroll(s.anchorIdx + change), change }
}

/** Animation start state for a snap — screen position is continuous with the release moment */
export function snapStartState(s: MonthScrollState, change: -1 | 0 | 1, layout: MonthLayout): MonthScrollState {
  const anchorIdx = s.anchorIdx + change
  let viewTop = s.viewTop
  if (change > 0) viewTop -= monthHeight(s.anchorIdx, layout)
  if (change < 0) viewTop += monthHeight(anchorIdx, layout)
  return createMonthScroll(anchorIdx, viewTop)
}

function applyOffset(s: MonthScrollState, dy: number, y: number, t: number, layout: MonthLayout): MoveResult {
  let anchorIdx = s.anchorIdx
  let viewTop = s.viewTop + dy
  while (viewTop > monthHeight(anchorIdx, layout)) {
    viewTop -= monthHeight(anchorIdx, layout)
    anchorIdx += 1
  }
  while (viewTop < 0) {
    anchorIdx -= 1
    viewTop += monthHeight(anchorIdx, layout)
  }
  viewTop = Math.min(viewTop, monthHeight(anchorIdx, layout))
  return {
    state: { ...s, anchorIdx, viewTop, lastY: y, samples: pushSample(s.samples, t, y) },
    active: true,
  }
}

function pushSample(samples: { t: number; y: number }[], t: number, y: number): { t: number; y: number }[] {
  const kept = samples.filter((s) => t - s.t <= VELOCITY_WINDOW_MS)
  kept.push({ t, y })
  return kept.slice(-MAX_SAMPLES)
}

function velocity(samples: { t: number; y: number }[]): number {
  if (samples.length < 2) return 0
  const first = samples[0]
  const last = samples[samples.length - 1]
  const dt = last.t - first.t
  if (dt <= 0) return 0
  return (last.y - first.y) / dt
}

function lastSampleY(s: MonthScrollState): number {
  return s.samples.length > 0 ? s.samples[s.samples.length - 1].y : 0
}
