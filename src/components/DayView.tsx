import { useEffect, useRef, useState } from 'react'
import type { Cat, Marker, MarkerType, TimelineItem, VomitRecord } from '../types'
import { dayLabel } from '../lib/dates'
import {
  beginDrag,
  createDragSession,
  endDrag,
  moveDrag,
  type DragContext,
  type DragSession,
} from '../lib/dragSession'
import { beginSwipe, createSwipeSession, endSwipe, moveSwipe, type SwipeSession } from '../lib/horizontalSwipe'
import { RecordList } from './RecordList'

const DAY_SLIDE_OFFSET = 80
const SWIPE_SETTLE_MS = 200

interface Props {
  selectedKey: string
  items: TimelineItem[]
  cats: Cat[]
  markerTypes: MarkerType[]
  onEdit: (record: VomitRecord) => void
  onDelete: (id: string) => void
  onEditMarker: (marker: Marker) => void
  onDeleteMarker: (id: string) => void
  onClose: () => void
  /** Horizontal swipe — ±1 in calendar days */
  onNavigate: (delta: -1 | 1) => void
}

/** Day view: date header + timeline. Pulling down from the top of the timeline
 *  (chain-pull) closes back to the month view. */
export function DayView({
  selectedKey,
  items,
  cats,
  markerTypes,
  onEdit,
  onDelete,
  onEditMarker,
  onDeleteMarker,
  onClose,
  onNavigate,
}: Props) {
  const areaRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const sessionRef = useRef<DragSession>(createDragSession())
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const swipeSessionRef = useRef<SwipeSession>(createSwipeSession())
  const swipeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onNavigateRef = useRef(onNavigate)
  onNavigateRef.current = onNavigate
  const [dragY, setDragY] = useState<number | null>(null)
  const [dx, setDx] = useState(0)
  const [swipeTransitioning, setSwipeTransitioning] = useState(false)

  useEffect(() => {
    const area = areaRef.current
    if (!area) return
    const container = scrollRef.current
      ? {
          get scrollTop() {
            return scrollRef.current?.scrollTop ?? 0
          },
          contains: (t: unknown) => scrollRef.current?.contains(t as Node | null) ?? false,
        }
      : null
    const ctx = (): DragContext => ({ container, sheetHeight: area.offsetHeight })
    const applyMove = (y: number) => {
      const r = moveDrag(sessionRef.current, y, ctx())
      sessionRef.current = r.session
      setDragY(r.session.dragY)
    }
    const applyEnd = () => {
      const r = endDrag(sessionRef.current, ctx())
      sessionRef.current = r.session
      setDragY(null)
      if (r.close) onCloseRef.current()
    }

    // Mouse/pen path — touch pointers are ignored here because the touch path
    // below must stay live during native scroll (pointer events get cancelled)
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      sessionRef.current = beginDrag(sessionRef.current, e.target instanceof Element ? e.target : null, e.clientY)
    }
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      applyMove(e.clientY)
    }
    const onPointerEnd = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      applyEnd()
    }

    // Touch path — non-passive move so the session can stop native scroll on takeover
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0]
      if (!t) return
      sessionRef.current = beginDrag(sessionRef.current, e.target instanceof Element ? e.target : null, t.clientY)
    }
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0]
      if (!t) return
      const r = moveDrag(sessionRef.current, t.clientY, ctx())
      sessionRef.current = r.session
      if (r.preventDefault) e.preventDefault()
      setDragY(r.session.dragY)
    }
    const onTouchEnd = () => applyEnd()

    area.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerEnd)
    window.addEventListener('pointercancel', onPointerEnd)
    area.addEventListener('touchstart', onTouchStart, { passive: true })
    area.addEventListener('touchmove', onTouchMove, { passive: false })
    area.addEventListener('touchend', onTouchEnd, { passive: true })
    area.addEventListener('touchcancel', onTouchEnd, { passive: true })
    return () => {
      area.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerEnd)
      window.removeEventListener('pointercancel', onPointerEnd)
      area.removeEventListener('touchstart', onTouchStart)
      area.removeEventListener('touchmove', onTouchMove)
      area.removeEventListener('touchend', onTouchEnd)
      area.removeEventListener('touchcancel', onTouchEnd)
      sessionRef.current = createDragSession()
    }
  }, [])

  // Horizontal day swipe — shares the pointer stream with the vertical
  // chain-pull above; each machine arbitrates its own axis
  useEffect(() => {
    const area = areaRef.current
    if (!area) return
    const applyMove = (x: number, y: number) => {
      const r = moveSwipe(swipeSessionRef.current, x, y)
      swipeSessionRef.current = r.session
      if (r.session.state === 'horizontal') setDx(r.dx)
    }
    // Animate the content back to 0; the timer (not transitionend) resets the
    // gate so gestures can never get stuck after a no-op release
    const settleBack = () => {
      setSwipeTransitioning(true)
      setDx(0)
      if (swipeTimerRef.current) clearTimeout(swipeTimerRef.current)
      swipeTimerRef.current = setTimeout(() => setSwipeTransitioning(false), SWIPE_SETTLE_MS)
    }
    const applyEnd = () => {
      const finalDx = swipeSessionRef.current.dx
      const r = endSwipe(swipeSessionRef.current)
      swipeSessionRef.current = r.session
      if (r.change !== 0) {
        onNavigateRef.current(-r.change as -1 | 1)
        // New day slides in from the swipe direction; offset first, then transition to 0
        setSwipeTransitioning(false)
        setDx((r.change > 0 ? 1 : -1) * DAY_SLIDE_OFFSET)
        requestAnimationFrame(() => {
          requestAnimationFrame(() => settleBack())
        })
      } else if (finalDx !== 0) {
        settleBack()
      }
    }

    // Mouse/pen path — touch pointers are ignored here because the touch path
    // below must stay live during native scroll (pointer events get cancelled)
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      swipeSessionRef.current = beginSwipe(swipeSessionRef.current, e.clientX, e.clientY)
    }
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      applyMove(e.clientX, e.clientY)
    }
    const onPointerEnd = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      applyEnd()
    }

    // Touch path — non-passive move so horizontal takeover can stop native scroll
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0]
      if (!t) return
      swipeSessionRef.current = beginSwipe(swipeSessionRef.current, t.clientX, t.clientY)
    }
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0]
      if (!t) return
      const r = moveSwipe(swipeSessionRef.current, t.clientX, t.clientY)
      swipeSessionRef.current = r.session
      if (r.session.state === 'horizontal') e.preventDefault()
      setDx(r.dx)
    }
    const onTouchEnd = () => applyEnd()

    area.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerEnd)
    window.addEventListener('pointercancel', onPointerEnd)
    area.addEventListener('touchstart', onTouchStart, { passive: true })
    area.addEventListener('touchmove', onTouchMove, { passive: false })
    area.addEventListener('touchend', onTouchEnd, { passive: true })
    area.addEventListener('touchcancel', onTouchEnd, { passive: true })
    return () => {
      area.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerEnd)
      window.removeEventListener('pointercancel', onPointerEnd)
      area.removeEventListener('touchstart', onTouchStart)
      area.removeEventListener('touchmove', onTouchMove)
      area.removeEventListener('touchend', onTouchEnd)
      area.removeEventListener('touchcancel', onTouchEnd)
      if (swipeTimerRef.current) clearTimeout(swipeTimerRef.current)
      swipeSessionRef.current = createSwipeSession()
    }
  }, [])

  return (
    <div
      ref={areaRef}
      className="absolute inset-0 flex flex-col"
      style={{
        transform: dragY !== null ? `translateY(${dragY}px)` : undefined,
        transition: dragY !== null ? 'none' : 'transform 200ms ease-out',
      }}
    >
      <div
        className="flex min-h-0 flex-1 flex-col"
        style={{
          transform: dx !== 0 ? `translateX(${dx}px)` : undefined,
          transition: swipeTransitioning ? `transform ${SWIPE_SETTLE_MS}ms ease-out` : 'none',
        }}
      >
        <h3 className="shrink-0 px-4 pb-2 pt-1 text-sm font-semibold text-gray-600">{dayLabel(selectedKey)}</h3>
        <div ref={scrollRef} className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain">
          <RecordList
            items={items}
            cats={cats}
            markerTypes={markerTypes}
            onEdit={onEdit}
            onDelete={onDelete}
            onEditMarker={onEditMarker}
            onDeleteMarker={onDeleteMarker}
          />
        </div>
      </div>
    </div>
  )
}
