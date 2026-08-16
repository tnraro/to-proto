import { monthHeight, type MonthLayout } from './monthList'

export const DRAG_START_THRESHOLD = 10
export const SNAP_RATIO = 0.5
export const FLICK_VELOCITY = 0.5 // px/ms
export const VELOCITY_WINDOW_MS = 200
export const MAX_SAMPLES = 8

export type ScrollSession = 'idle' | 'pressed' | 'dragging' | 'wheel'

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
  /** Sign of the last wheel delta — wheel snap never cancels, it moves one
   *  month in this direction regardless of distance */
  wheelDir: -1 | 0 | 1
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
    wheelDir: 0,
    samples: [],
  }
}

/** Starts a fresh pointer gesture from the current position. Any previous
 *  session (e.g. a lingering wheel burst) is discarded — input handoff must
 *  never carry over stale lastY or velocity samples. */
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
 *  Other sessions (wheel, idle) are ignored. */
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

/** Wheel input — moves like a drag without a pressed phase. Uses its own
 *  session so it can never be driven by, or feed, pointer gestures.
 *  Positive deltaY (wheel down) moves toward future months, matching natural
 *  scroll. Samples are not used for wheel decisions (no flick). */
export function wheelMonthScroll(s: MonthScrollState, dy: number, t: number, layout: MonthLayout): MoveResult {
  if (s.session !== 'idle' && s.session !== 'wheel') return { state: s, active: false }
  const startAnchorIdx = s.session === 'idle' ? s.anchorIdx : s.startAnchorIdx
  const wheelDir = dy > 0 ? 1 : dy < 0 ? -1 : s.wheelDir
  return applyOffset({ ...s, session: 'wheel', startAnchorIdx, lastY: null, wheelDir }, dy, lastSampleY(s), t, layout)
}

/** Converts device-dependent wheel deltas to pixels: line mode (Firefox mice
 *  report ~3px notches) and page mode need scaling to be usable as px. */
export function normalizeWheelDelta(deltaY: number, deltaMode: number, viewportH: number): number {
  if (deltaMode === 1) return deltaY * 16
  if (deltaMode === 2) return deltaY * viewportH
  return deltaY
}

/** Release. Three rules:
 *  - wheel: never cancels — any nonzero wheel movement snaps one month in the
 *    last wheel direction (wheel intent is unambiguous even for tiny deltas).
 *  - positional (finger, no flick): relative to the release anchor — past the
 *    midpoint snaps to the nearest boundary ahead (+1), otherwise stay.
 *  - flick (finger only): relative to the gesture-start anchor — target is one
 *    month in the flick direction from the start (start ± 1), unless the drag
 *    already crossed further in that direction (release anchor wins). */
export function endMonthScroll(
  s: MonthScrollState,
  layout: MonthLayout,
): { state: MonthScrollState; change: -1 | 0 | 1 } {
  if (s.session !== 'dragging' && s.session !== 'wheel') return { state: createMonthScroll(s.anchorIdx), change: 0 }
  const v = velocity(s.samples)
  const h = monthHeight(s.anchorIdx, layout)
  let change: -1 | 0 | 1 = 0
  let flick = false
  if (s.session === 'wheel') {
    change = s.wheelDir
  } else if (v < -FLICK_VELOCITY) {
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

function lastSampleY(s: MonthScrollState): number {
  return s.samples.length > 0 ? s.samples[s.samples.length - 1].y : 0
}
