export const SWIPE_DISTANCE = 60
const DOMINANCE_THRESHOLD = 8
const MAX_DX = 96

export type SwipeState = 'idle' | 'pressed' | 'horizontal' | 'vertical'

export interface SwipeSession {
  state: SwipeState
  startX: number
  startY: number
  dx: number
}

export function createSwipeSession(): SwipeSession {
  return { state: 'idle', startX: 0, startY: 0, dx: 0 }
}

export function beginSwipe(session: SwipeSession, x: number, y: number): SwipeSession {
  if (session.state !== 'idle') return session
  return { state: 'pressed', startX: x, startY: y, dx: 0 }
}

export function moveSwipe(session: SwipeSession, x: number, y: number): { session: SwipeSession; dx: number } {
  if (session.state === 'idle' || session.state === 'vertical') return { session, dx: session.dx }
  if (session.state === 'pressed') {
    const dx = x - session.startX
    const dy = y - session.startY
    if (Math.abs(dx) <= DOMINANCE_THRESHOLD && Math.abs(dy) <= DOMINANCE_THRESHOLD) {
      return { session, dx: 0 }
    }
    const horizontal = Math.abs(dx) > Math.abs(dy)
    const next = horizontal
      ? { ...session, state: 'horizontal' as const, dx: clamp(dx) }
      : { ...session, state: 'vertical' as const, dx: 0 }
    return { session: next, dx: next.dx }
  }
  const dx = clamp(x - session.startX)
  return { session: { ...session, dx }, dx }
}

export function endSwipe(session: SwipeSession): { session: SwipeSession; change: -1 | 0 | 1 } {
  const change =
    session.state === 'horizontal' && Math.abs(session.dx) >= SWIPE_DISTANCE ? (session.dx > 0 ? 1 : -1) : 0
  return { session: createSwipeSession(), change }
}

function clamp(n: number): number {
  return Math.max(-MAX_DX, Math.min(MAX_DX, n))
}
