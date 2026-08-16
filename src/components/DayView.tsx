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
import { RecordList } from './RecordList'

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
}: Props) {
  const areaRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const sessionRef = useRef<DragSession>(createDragSession())
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const [dragY, setDragY] = useState<number | null>(null)

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

  return (
    <div
      ref={areaRef}
      className="absolute inset-0 flex flex-col"
      style={{
        transform: dragY !== null ? `translateY(${dragY}px)` : undefined,
        transition: dragY !== null ? 'none' : 'transform 200ms ease-out',
      }}
    >
      <h3 className="shrink-0 px-4 pb-2 pt-1 text-sm font-semibold text-gray-600">{dayLabel(selectedKey)}</h3>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
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
  )
}
