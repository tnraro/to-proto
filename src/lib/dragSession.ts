export const DRAG_START_THRESHOLD = 10
export const DRAG_CLOSE_RATIO = 0.25

const EXCLUDED_SELECTOR = 'input, textarea, select, [data-photo-key]'

export type DragSessionState = 'idle' | 'pressed' | 'dragging'

export interface DragTarget {
  closest(selector: string): unknown
}

export interface ScrollContainer {
  scrollTop: number
  contains(target: unknown): boolean
}

export interface DragContext {
  container: ScrollContainer | null
  sheetHeight: number
}

export interface DragSession {
  state: DragSessionState
  lastY: number | null
  pull: number
  dragOriginY: number | null
  dragY: number | null
  downTarget: DragTarget | null
}

export function createDragSession(): DragSession {
  return { state: 'idle', lastY: null, pull: 0, dragOriginY: null, dragY: null, downTarget: null }
}

export function beginDrag(session: DragSession, target: DragTarget | null, y: number): DragSession {
  if (session.state !== 'idle') return session
  if (target?.closest(EXCLUDED_SELECTOR)) return session
  return { state: 'pressed', lastY: y, pull: 0, dragOriginY: null, dragY: null, downTarget: target }
}

export function moveDrag(
  session: DragSession,
  y: number,
  ctx: DragContext,
): { session: DragSession; preventDefault: boolean } {
  if (session.state === 'idle') return { session, preventDefault: false }
  if (session.state === 'dragging') {
    const dragY = Math.max(0, y - (session.dragOriginY ?? y))
    return { session: { ...session, dragY, lastY: y }, preventDefault: true }
  }
  const dyFromLast = y - (session.lastY ?? y)
  const atTop =
    !ctx.container || !session.downTarget || !ctx.container.contains(session.downTarget) || ctx.container.scrollTop <= 0
  if (dyFromLast > 0 && atTop) {
    const pull = session.pull + dyFromLast
    if (pull >= DRAG_START_THRESHOLD) {
      return {
        session: { ...session, state: 'dragging', pull, dragOriginY: y, dragY: 0, lastY: y },
        preventDefault: true,
      }
    }
    return { session: { ...session, pull, lastY: y }, preventDefault: false }
  }
  return { session: { ...session, pull: 0, lastY: y }, preventDefault: false }
}

export function endDrag(session: DragSession, ctx: DragContext): { session: DragSession; close: boolean } {
  const close =
    session.state === 'dragging' && ctx.sheetHeight > 0 && (session.dragY ?? 0) > ctx.sheetHeight * DRAG_CLOSE_RATIO
  return { session: createDragSession(), close }
}
