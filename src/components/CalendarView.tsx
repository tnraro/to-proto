import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Cat, Marker, MarkerType, TimelineItem, VomitRecord, VomitType } from '../types'
import { VOMIT_TYPES } from '../types'
import { monthLabel, startOfMonth, toDateKey, groupByDay } from '../lib/dates'
import { beginSwipe, createSwipeSession, endSwipe, moveSwipe, type SwipeSession } from '../lib/horizontalSwipe'
import { pieSegments } from '../lib/pieSegments'
import { RecordList } from './RecordList'
import { Card } from './ui/Card'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const MAX_TYPE_PAIRS = 3
const SLIDE_IN_OFFSET = 80
const SETTLE_MS = 200

interface Props {
  records: VomitRecord[]
  cats: Cat[]
  markers: Marker[]
  markerTypes: MarkerType[]
  /** Experiment (feature flag) */
  showRecordCount?: boolean
  onEdit: (record: VomitRecord) => void
  onDelete: (id: string) => void
  onEditMarker: (marker: Marker) => void
  onDeleteMarker: (id: string) => void
  /** Selected date (YYYY-MM-DD) — FAB preset source */
  onSelectedDateChange: (dateKey: string) => void
}

export function CalendarView({
  records,
  cats,
  markers,
  markerTypes,
  showRecordCount = false,
  onEdit,
  onDelete,
  onEditMarker,
  onDeleteMarker,
  onSelectedDateChange,
}: Props) {
  const today = new Date()
  const [cursor, setCursor] = useState(() => startOfMonth(today))
  const [selectedKey, setSelectedKey] = useState(() => toDateKey(today))
  const [dx, setDx] = useState(0)
  const [swipeTransitioning, setSwipeTransitioning] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const swipeSessionRef = useRef<SwipeSession>(createSwipeSession())
  const suppressClickRef = useRef(false)
  const transitioningRef = useRef(false)
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    transitioningRef.current = swipeTransitioning
  }, [swipeTransitioning])

  useEffect(() => {
    onSelectedDateChange(selectedKey)
  }, [selectedKey, onSelectedDateChange])

  const cells = useMemo(() => buildMonthCells(cursor), [cursor])

  const recordsByDay = useMemo(() => groupByDay(records), [records])
  const markersByDay = useMemo(() => groupByDay(markers), [markers])

  const dayItems = useMemo<TimelineItem[]>(() => {
    const recordsOfDay = recordsByDay.get(selectedKey) ?? []
    const markersOfDay = markersByDay.get(selectedKey) ?? []
    return [
      ...recordsOfDay.map((r) => ({ kind: 'record' as const, payload: r })),
      ...markersOfDay.map((m) => ({ kind: 'marker' as const, payload: m })),
    ].sort((a, b) => b.payload.datetime.localeCompare(a.payload.datetime))
  }, [recordsByDay, markersByDay, selectedKey])

  const move = useCallback((delta: number) => {
    setCursor((cur) => {
      const next = new Date(cur)
      next.setMonth(next.getMonth() + delta)
      return startOfMonth(next)
    })
  }, [])

  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const onPointerDown = (e: PointerEvent) => {
      suppressClickRef.current = false
      if (transitioningRef.current) return
      swipeSessionRef.current = beginSwipe(swipeSessionRef.current, e.clientX, e.clientY)
    }
    const onPointerMove = (e: PointerEvent) => {
      const r = moveSwipe(swipeSessionRef.current, e.clientX, e.clientY)
      swipeSessionRef.current = r.session
      if (r.session.state === 'horizontal') {
        suppressClickRef.current = true
        setDx(r.dx)
      }
    }
    // Animate the grid back to 0; the timer (not transitionend) resets the gate
    // so gestures can never get stuck after a no-op release
    const settleBack = () => {
      setSwipeTransitioning(true)
      setDx(0)
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current)
      settleTimerRef.current = setTimeout(() => setSwipeTransitioning(false), SETTLE_MS)
    }
    const onPointerEnd = () => {
      const finalDx = swipeSessionRef.current.dx
      const r = endSwipe(swipeSessionRef.current)
      swipeSessionRef.current = r.session
      if (r.change !== 0) {
        move(r.change > 0 ? -1 : 1)
        // New month slides in from the swipe direction; offset first, then transition to 0
        setSwipeTransitioning(false)
        setDx((r.change > 0 ? 1 : -1) * SLIDE_IN_OFFSET)
        requestAnimationFrame(() => {
          requestAnimationFrame(() => settleBack())
        })
      } else if (finalDx !== 0) {
        settleBack()
      }
    }
    const onPointerCancel = () => {
      swipeSessionRef.current = createSwipeSession()
      suppressClickRef.current = false
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current)
      setSwipeTransitioning(false)
      setDx(0)
    }
    grid.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerEnd)
    window.addEventListener('pointercancel', onPointerCancel)
    return () => {
      grid.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerEnd)
      window.removeEventListener('pointercancel', onPointerCancel)
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current)
    }
  }, [move])

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => move(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 hover:bg-gray-200"
            aria-label="이전 달"
          >
            ‹
          </button>
          <button
            onClick={() => move(1)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 hover:bg-gray-200"
            aria-label="다음 달"
          >
            ›
          </button>
          <button
            onClick={() => {
              setCursor(startOfMonth(today))
              setSelectedKey(toDateKey(today))
            }}
            className="ml-1 min-h-9 rounded-full px-3 text-sm font-medium text-primary hover:bg-emerald-50"
          >
            오늘
          </button>
        </div>
        <h2 className="text-lg font-bold">{monthLabel(cursor)}</h2>
        <span className="w-24" />
      </div>

      <div
        ref={gridRef}
        onClickCapture={(e) => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false
            e.stopPropagation()
          }
        }}
        className={`grid grid-cols-7 gap-1 touch-pan-y`}
        style={{
          transform: dx !== 0 ? `translateX(${dx}px)` : undefined,
          transition: swipeTransitioning ? 'transform 200ms ease-out' : 'none',
        }}
      >
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`pb-1 text-center text-xs font-medium ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500'}`}
          >
            {w}
          </div>
        ))}
        {cells.map((cell, i) => {
          const key = cell ? toDateKey(cell) : null
          const list = key ? recordsByDay.get(key) : undefined
          const dayMarkers = key ? markersByDay.get(key) : undefined
          const summary = list ? summarizeByType(list) : null
          const isSelected = key === selectedKey
          const isToday = key === toDateKey(today)
          return (
            <button
              key={i}
              disabled={!cell}
              onClick={() => cell && setSelectedKey(toDateKey(cell))}
              className={`flex min-h-12 flex-col rounded-lg p-1 text-left transition sm:min-h-16 ${
                isSelected
                  ? 'bg-emerald-50 ring-2 ring-primary'
                  : 'hover:bg-gray-100'
              } ${!cell ? '' : 'bg-white'}`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium ${
                  !cell
                    ? ''
                    : isSelected
                      ? 'bg-primary font-bold text-white'
                      : isToday
                        ? 'bg-emerald-100 text-primary'
                        : 'text-gray-600'
                }`}
              >
                {cell?.getDate()}
              </span>
              {dayMarkers?.map((m) => (
                <span
                  key={m.id}
                  className="mt-0.5 block w-full truncate rounded bg-blue-50 px-1 text-[10px] leading-tight text-blue-600"
                  title={markerTypes.find((t) => t.id === m.typeId)?.name}
                >
                  {markerTypes.find((t) => t.id === m.typeId)?.name ?? '?'}
                </span>
              ))}
              {showRecordCount ? (
                list && list.length > 0 ? (
                  <span className="mt-0.5 flex items-center gap-1">
                    <span
                      className="h-3.5 w-3.5 rounded-full"
                      style={{
                        background: `conic-gradient(${pieSegments(summary ?? []).map((s) => `${s.color} ${s.start}% ${s.end}%`).join(', ')})`,
                      }}
                    />
                    <span className="text-[10px] leading-none text-gray-500">
                      {summary?.reduce((s, x) => s + x.count, 0) ?? 0}
                    </span>
                  </span>
                ) : null
              ) : (
                summary && (
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                    {summary.slice(0, MAX_TYPE_PAIRS).map(({ type, count }) => (
                      <span
                        key={type}
                        className="flex items-center gap-0.5"
                        title={`${VOMIT_TYPES[type].label} ${count}회`}
                      >
                        <span className={`inline-block h-2 w-2 rounded-full ${VOMIT_TYPES[type].color}`} />
                        {count > 1 && <span className="text-[10px] leading-none text-gray-500">{count}</span>}
                      </span>
                    ))}
                    {summary.length > MAX_TYPE_PAIRS && (
                      <span className="text-[10px] leading-none text-gray-400">
                        +{summary.slice(MAX_TYPE_PAIRS).reduce((s, x) => s + x.count, 0)}
                      </span>
                    )}
                  </span>
                )
              )}
            </button>
          )
        })}
      </div>

      <Card>
        <h3 className="mb-2 text-sm font-semibold text-gray-600">{selectedKey} 기록</h3>
        <RecordList
          items={dayItems}
          cats={cats}
          markerTypes={markerTypes}
          onEdit={onEdit}
          onDelete={onDelete}
          onEditMarker={onEditMarker}
          onDeleteMarker={onDeleteMarker}
        />
      </Card>
    </div>
  )
}

function buildMonthCells(cursor: Date): (Date | null)[] {
  const first = startOfMonth(cursor)
  const offset = first.getDay()
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function summarizeByType(records: VomitRecord[]): { type: VomitType; count: number }[] {
  const counts = new Map<VomitType, number>()
  for (const r of records) {
    for (const t of r.types) counts.set(t, (counts.get(t) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
}
