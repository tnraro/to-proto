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
  /** Anchor at gesture start — flick targets are clamped to this so the
   *  flick never stacks on top of boundary crossings made during the drag */
  startAnchorIdx: number
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
  return {
    anchorIdx,
    viewTop,
    startAnchorIdx: anchorIdx,
    session: 'idle',
    startY: null,
    lastY: null,
    samples: [],
  }
}

/** Starts a fresh pointer gesture from the current position. Any previous
 *  session is discarded — input handoff must never carry over stale lastY or
 *  velocity samples. */
export function beginMonthScroll(s: MonthScrollState, y: number, t: number): MonthScrollState {
  return {
    ...createMonthScroll(s.anchorIdx, s.viewTop),
    session: 'pressed',
    startAnchorIdx: s.anchorIdx,
    startY: y,
    lastY: y,
    samples: [{ t, y }],
  }
}

/** Finger drag. Pressed → dragging after the start threshold (stable takeover).
 *  Other sessions (idle) are ignored. */
export function moveMonthScroll(s: MonthScrollState, y: number, t: number, layout: MonthLayout): MoveResult {
  if (s.session !== 'pressed' && s.session !== 'dragging') return { state: s, active: false }
  if (s.session === 'pressed') {
    const dy = y - (s.startY ?? y)
    if (Math.abs(dy) < DRAG_START_THRESHOLD) return { state: { ...s, lastY: y }, active: false }
    return { state: { ...s, session: 'dragging', lastY: y, samples: pushSample(s.samples, t, y) }, active: true }
  }
  // Finger up (y decreasing) means content moves up → viewTop increases
  return applyOffset(s, (s.lastY ?? y) - y, y, t, layout)
}

/** Converts device-dependent wheel deltas to pixels: line mode (Firefox mice
 *  report ~3px notches) and page mode need scaling to be usable as px. */
export function normalizeWheelDelta(deltaY: number, deltaMode: number, viewportH: number): number {
  if (deltaMode === 1) return deltaY * 16
  if (deltaMode === 2) return deltaY * viewportH
  return deltaY
}

/** Release. Two rules with separate reference frames:
 *  - positional (no flick): relative to the release anchor — past the midpoint
 *    snaps to the nearest boundary ahead (+1), otherwise stay.
 *  - flick: relative to the gesture-start anchor — target is one month in the
 *    flick direction from the start (start ± 1), unless the drag already
 *    crossed further in that direction (release anchor wins). */
export function endMonthScroll(
  s: MonthScrollState,
  layout: MonthLayout,
): { state: MonthScrollState; change: -1 | 0 | 1 } {
  if (s.session !== 'dragging') return { state: createMonthScroll(s.anchorIdx), change: 0 }
  const v = velocity(s.samples)
  const h = monthHeight(s.anchorIdx, layout)
  let change: -1 | 0 | 1 = 0
  let flick = false
  if (v < -FLICK_VELOCITY) {
    change = 1
    flick = true
  } else if (v > FLICK_VELOCITY) {
    change = -1
    flick = true
  } else if (s.viewTop > SNAP_RATIO * h) {
    change = 1
  }
  let target = s.anchorIdx + change
  if (flick) {
    if (change === 1) target = Math.max(s.startAnchorIdx + 1, s.anchorIdx)
    else if (change === -1) target = Math.min(s.startAnchorIdx - 1, s.anchorIdx)
  }
  return { state: createMonthScroll(target), change }
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
