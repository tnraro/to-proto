export interface GestureHandlers {
  /** Same-side pointer/touch down on the target element */
  onDown: (target: Element | null, x: number, y: number) => void
  /** Window-level move. Return true to prevent default touch scroll */
  onMove: (x: number, y: number) => boolean
  onEnd: () => void
}

/**
 * Binds the standard pointer+touch dual-path gesture listeners used by every
 * drag/swipe gesture: pointer events (touch pointers excluded, since the touch
 * path must stay live during native scroll) plus a non-passive touch path so
 * the gesture can stop native scroll. Returns the unbind function.
 */
export function bindGestureListeners(target: HTMLElement, handlers: GestureHandlers): () => void {
  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return
    handlers.onDown(e.target instanceof Element ? e.target : null, e.clientX, e.clientY)
  }
  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return
    handlers.onMove(e.clientX, e.clientY)
  }
  const onPointerEnd = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return
    handlers.onEnd()
  }
  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0]
    if (!t) return
    handlers.onDown(e.target instanceof Element ? e.target : null, t.clientX, t.clientY)
  }
  const onTouchMove = (e: TouchEvent) => {
    const t = e.touches[0]
    if (!t) return
    if (handlers.onMove(t.clientX, t.clientY)) e.preventDefault()
  }
  const onTouchEnd = () => handlers.onEnd()

  target.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerEnd)
  window.addEventListener('pointercancel', onPointerEnd)
  target.addEventListener('touchstart', onTouchStart, { passive: true })
  target.addEventListener('touchmove', onTouchMove, { passive: false })
  target.addEventListener('touchend', onTouchEnd, { passive: true })
  target.addEventListener('touchcancel', onTouchEnd, { passive: true })

  return () => {
    target.removeEventListener('pointerdown', onPointerDown)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerEnd)
    window.removeEventListener('pointercancel', onPointerEnd)
    target.removeEventListener('touchstart', onTouchStart)
    target.removeEventListener('touchmove', onTouchMove)
    target.removeEventListener('touchend', onTouchEnd)
    target.removeEventListener('touchcancel', onTouchEnd)
  }
}