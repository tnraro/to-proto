import { useEffect, useRef, useState } from 'react'
import type { Cat, Marker, MarkerType, TimelineItem, VomitRecord } from '../types'
import { dayLabel } from '../lib/dates'
import {
  beginDrag,
  createDragSession,
  DRAG_CLOSE_RATIO,
  endDrag,
  moveDrag,
  type DragContext,
  type DragSession,
} from '../lib/dragSession'
import { beginSwipe, createSwipeSession, endSwipe, moveSwipe, type SwipeSession } from '../lib/horizontalSwipe'
import { bindGestureListeners } from '../lib/gestureListeners'
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

  const areaHeight = areaRef.current?.offsetHeight ?? 0
  const dragProgress =
    dragY !== null && areaHeight > 0 ? Math.min(1, dragY / (areaHeight * DRAG_CLOSE_RATIO)) : 0
  // Rotation starts only past the halfway point so the arrow stays put during
  // the initial pull and tracks progress in the second half
  const arrowRotation = Math.max(0, (dragProgress - 0.5) * 2) * 180

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
    const unbind = bindGestureListeners(area, {
      onDown: (target, _, y) => {
        sessionRef.current = beginDrag(sessionRef.current, target, y)
      },
      onMove: (_, y) => {
        const r = moveDrag(sessionRef.current, y, ctx())
        sessionRef.current = r.session
        setDragY(r.session.dragY)
        return r.preventDefault
      },
      onEnd: () => {
        const r = endDrag(sessionRef.current, ctx())
        sessionRef.current = r.session
        setDragY(null)
        if (r.close) onCloseRef.current()
      },
    })
    return () => {
      unbind()
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
      return r.session.state === 'horizontal'
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
    const unbind = bindGestureListeners(area, {
      onDown: (_, x, y) => {
        swipeSessionRef.current = beginSwipe(swipeSessionRef.current, x, y)
      },
      onMove: applyMove,
      onEnd: applyEnd,
    })
    return () => {
      unbind()
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
        <div className="flex shrink-0 flex-col px-4 pb-2 pt-1">
          <div
            className="flex justify-center"
            style={{
              transition: dragY !== null ? 'none' : 'opacity 150ms ease-out',
              opacity: dragY !== null ? 1 : 0,
            }}
            aria-hidden="true"
          >
            <span className="flex items-center gap-1">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`h-6 w-6 ${dragProgress >= 1 ? 'text-blue-500' : 'text-gray-400'}`}
                style={{
                  transform: `rotate(${arrowRotation}deg)`,
                  transition: dragY !== null ? 'none' : 'opacity 150ms ease-out',
                }}
              >
                <path d="M12 5v14" />
                <path d="M19 12l-7 7-7-7" />
              </svg>
              {dragProgress >= 1 && <span className="text-xs font-medium text-blue-500">놓으면 닫힘</span>}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-gray-600">{dayLabel(selectedKey)}</h3>
        </div>
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
