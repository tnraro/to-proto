import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Cat, Marker, MarkerType, TimelineItem, VomitRecord, VomitType } from '../types'
import { VOMIT_TYPES } from '../types'
import { WEEKDAYS, addDays, groupByDay, monthLabel, parseDateKey, startOfMonth, toDateKey, weekDayKeys } from '../lib/dates'
import { pieSegments } from '../lib/pieSegments'
import type { CalendarIndicator } from '../lib/calendarIndicator'
import { blockOffset, blockWindow, monthFromIndex, monthIndex, rowsInMonth, type MonthLayout } from '../lib/monthList'
import {
  beginMonthScroll,
  createMonthScroll,
  endMonthScroll,
  moveMonthScroll,
  normalizeWheelDelta,
  wheelMonthScroll,
  type MonthScrollState,
} from '../lib/monthScroll'
import { useMonthScrollStore } from '../hooks/useMonthScrollStore'
import { DayView } from './DayView'

const MAX_TYPE_PAIRS = 3
/** Must match the CSS below: month label + 52px cells with 4px gaps */
const MONTH_LAYOUT: MonthLayout = { headerH: 64, rowH: 56 }
const SNAP_MS = 200
const WHEEL_IDLE_MS = 250

interface Props {
  records: VomitRecord[]
  cats: Cat[]
  markers: Marker[]
  markerTypes: MarkerType[]
  /** Experiment (feature flag): per-day indicator style */
  indicator?: CalendarIndicator
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
  indicator = 'summary',
  onEdit,
  onDelete,
  onEditMarker,
  onDeleteMarker,
  onSelectedDateChange,
}: Props) {
  const today = new Date()
  const { scrollState, commit, getState } = useMonthScrollStore(monthIndex(startOfMonth(today)))
  const [selectedKey, setSelectedKey] = useState(() => toDateKey(today))
  const [dayViewOpen, setDayViewOpen] = useState(false)
  const [vh, setVh] = useState(0)
  const viewportRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const suppressClickRef = useRef(false)
  const wheelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const snapRafRef = useRef<number | null>(null)
  const snapGenRef = useRef(0)
  const dayViewOpenRef = useRef(false)
  useEffect(() => {
    dayViewOpenRef.current = dayViewOpen
  }, [dayViewOpen])

  useEffect(() => {
    onSelectedDateChange(selectedKey)
  }, [selectedKey, onSelectedDateChange])

  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return
    const ro = new ResizeObserver((entries) => {
      setVh(entries[0].contentRect.height)
    })
    ro.observe(vp)
    return () => ro.disconnect()
  }, [])

  const cancelSnap = useCallback(() => {
    snapGenRef.current++
    if (snapRafRef.current !== null) cancelAnimationFrame(snapRafRef.current)
    snapRafRef.current = null
  }, [])

  const cancelWheel = useCallback(() => {
    if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current)
    wheelTimerRef.current = null
  }, [])

  // Snap tween: animate the rendered position from its current (measured)
  // position to the target anchor's top. Declarative target, rAF-driven — the
  // tween starts from the actually painted transform so deferred React renders
  // can never cause a jump. Shared by gesture release and header jumps.
  const animateTo = useCallback(
    (target: number) => {
      const preEnd = getState()
      const renderedViewTop = -(measureContainerY(containerRef.current) ?? -preEnd.viewTop)
      // Target may be several months away (flick clamp / today jump)
      const targetBlockTop = blockOffset(preEnd.anchorIdx, target, MONTH_LAYOUT)
      const startViewTop = renderedViewTop - targetBlockTop
      const gen = ++snapGenRef.current
      commit({ ...createMonthScroll(target), viewTop: startViewTop })
      const t0 = performance.now()
      const tick = (now: number) => {
        if (gen !== snapGenRef.current) return
        const t = Math.min(1, (now - t0) / SNAP_MS)
        const eased = 1 - Math.pow(1 - t, 3)
        commit({ ...createMonthScroll(target), viewTop: startViewTop * (1 - eased) })
        if (t < 1) {
          snapRafRef.current = requestAnimationFrame(tick)
        } else {
          snapRafRef.current = null
          commit(createMonthScroll(target))
        }
      }
      snapRafRef.current = requestAnimationFrame(tick)
    },
    [commit, getState],
  )

  // Release: decide the target from the gesture (declarative), then tween to it
  const finishGesture = useCallback(
    (preEnd: MonthScrollState) => {
      const r = endMonthScroll(preEnd, MONTH_LAYOUT)
      const target = r.state.anchorIdx
      if (r.change !== 0 || preEnd.viewTop !== 0) {
        animateTo(target)
      } else {
        commit(createMonthScroll(target))
      }
    },
    [animateTo, commit],
  )

  const goToMonth = useCallback(
    (delta: number) => {
      cancelSnap()
      cancelWheel()
      animateTo(getState().anchorIdx + delta)
    },
    [animateTo, cancelSnap, cancelWheel, getState],
  )

  const goToday = useCallback(() => {
    cancelSnap()
    cancelWheel()
    const now = new Date()
    animateTo(monthIndex(startOfMonth(now)))
    setSelectedKey(toDateKey(now))
  }, [animateTo, cancelSnap, cancelWheel])

  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (dayViewOpenRef.current) return
      cancelSnap()
      const r = wheelMonthScroll(
        getState(),
        normalizeWheelDelta(e.deltaY, e.deltaMode, vh),
        performance.now(),
        MONTH_LAYOUT,
      )
      // Refused (finger gesture in progress): ignore entirely — scheduling the
      // idle timer here would fire finishGesture mid-drag and reset the session
      if (!r.active) return
      commit(r.state)
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current)
      wheelTimerRef.current = setTimeout(() => {
        wheelTimerRef.current = null
        finishGesture(getState())
      }, WHEEL_IDLE_MS)
    }
    vp.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      vp.removeEventListener('wheel', onWheel)
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current)
      if (snapRafRef.current !== null) cancelAnimationFrame(snapRafRef.current)
    }
  }, [cancelSnap, commit, finishGesture, getState, vh])

  useEffect(() => {
    // No pointer capture: capturing retargets the click event to the capture
    // element, which would swallow day-cell taps
    const onPointerMove = (e: PointerEvent) => {
      if (getState().session === 'idle') return
      const r = moveMonthScroll(getState(), e.clientY, performance.now(), MONTH_LAYOUT)
      commit(r.state)
      if (r.active) suppressClickRef.current = true
    }
    const onPointerUp = () => {
      if (getState().session === 'idle') return
      finishGesture(getState())
    }
    const onPointerCancel = () => {
      cancelWheel()
      cancelSnap()
      commit(createMonthScroll(getState().anchorIdx))
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)
    }
  }, [cancelSnap, cancelWheel, commit, finishGesture, getState])

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

  const weekKeys = useMemo(() => weekDayKeys(selectedKey), [selectedKey])

  const navigateDay = useCallback((delta: -1 | 1) => {
    setSelectedKey((key) => toDateKey(addDays(parseDateKey(key), delta)))
  }, [])

  const blocks = useMemo(
    () => blockWindow(scrollState.anchorIdx, scrollState.viewTop, vh, MONTH_LAYOUT),
    [vh, scrollState.anchorIdx, scrollState.viewTop],
  )

  const anchorLabel = monthLabel(monthFromIndex(scrollState.anchorIdx))

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between px-4 py-2">
        {dayViewOpen ? (
          <button
            onClick={() => setDayViewOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 hover:bg-gray-200"
            aria-label="월 보기"
          >
            ‹
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={() => goToMonth(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 hover:bg-gray-200"
              aria-label="이전 달"
            >
              ‹
            </button>
            <button
              onClick={() => goToMonth(1)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 hover:bg-gray-200"
              aria-label="다음 달"
            >
              ›
            </button>
            <button
              onClick={goToday}
              className="ml-1 min-h-9 rounded-full px-3 text-sm font-medium text-primary hover:bg-emerald-50"
            >
              오늘
            </button>
          </div>
        )}
        <h2 className="text-lg font-bold">
          {dayViewOpen ? monthLabel(parseDateKey(selectedKey)) : anchorLabel}
        </h2>
        <span className="w-24" />
      </div>
      <div className="grid shrink-0 grid-cols-7 gap-1 px-4 pb-1">
        {WEEKDAYS.map((w, i) => {
          const key = weekKeys[i]
          const isToday = key === toDateKey(today)
          const isSelected = key === selectedKey
          return (
            <div key={w} className="flex flex-col items-center pb-1">
              <span
                className={`text-center text-xs font-medium ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500'}`}
              >
                {w}
              </span>
              <button
                onClick={() => setSelectedKey(key)}
                aria-label={`${key} 선택`}
                className={`relative mt-1 flex h-7 w-7 items-center justify-center rounded-full text-sm transition ${
                  isSelected
                    ? 'bg-primary font-bold text-white'
                    : isToday
                      ? 'bg-emerald-100 font-semibold text-primary'
                      : 'text-gray-700 hover:bg-gray-100'
                }`}
                style={{
                  opacity: dayViewOpen ? 1 : 0,
                  visibility: dayViewOpen ? 'visible' : 'hidden',
                  transition: 'opacity 200ms ease-out',
                }}
              >
                {Number(key.slice(8))}
                {(recordsByDay.get(key)?.length ?? 0) + (markersByDay.get(key)?.length ?? 0) > 0 && (
                  <span className={`absolute bottom-0.5 h-1 w-1 rounded-full ${isSelected ? 'bg-white' : 'bg-gray-400'}`} />
                )}
              </button>
            </div>
          )
        })}
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          className="absolute inset-0"
          style={{
            transition: 'opacity 200ms ease-out, transform 200ms ease-out',
            opacity: dayViewOpen ? 0 : 1,
            transform: dayViewOpen ? 'scale(0.98) translateY(-6px)' : 'none',
            pointerEvents: dayViewOpen ? 'none' : undefined,
          }}
        >
          <div
            ref={viewportRef}
            className="relative h-full touch-none overflow-hidden"
            onPointerDown={(e) => {
              if (e.pointerType === 'mouse' && e.button !== 0) return
              cancelSnap()
              cancelWheel()
              suppressClickRef.current = false
              commit(beginMonthScroll(getState(), e.clientY, performance.now()))
            }}
          >
            <div
              ref={containerRef}
              className="absolute inset-0"
              style={{ transform: `translateY(${-scrollState.viewTop}px)` }}
            >
              {blocks.map(({ idx, top, height }) => {
            const cells = buildMonthCells(monthFromIndex(idx))
            const rows = rowsInMonth(idx)
            return (
              <div key={idx} className="absolute left-0 right-0" style={{ top, height }}>
                <h3 className="px-4 pb-1 pt-2 text-sm font-semibold text-gray-700">
                  {monthLabel(monthFromIndex(idx))}
                </h3>
                <div
                  className="grid grid-cols-7 gap-1 px-4"
                  style={{ gridTemplateRows: `repeat(${rows}, ${MONTH_LAYOUT.rowH - 4}px)` }}
                >
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
                        onClick={() => {
                          if (suppressClickRef.current || !cell) return
                          setSelectedKey(toDateKey(cell))
                          setDayViewOpen(true)
                        }}
                        className={`flex flex-col rounded-lg p-1 text-left transition ${
                          isSelected ? 'bg-emerald-50 ring-2 ring-primary' : 'hover:bg-gray-100'
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
                        {indicator === 'count' ? (
                          list && list.length > 0 ? (
                            <span className="mt-0.5 flex items-center gap-1">
                              <span className="inline-block h-2 w-2 rounded-full bg-gray-400" />
                              <span className="text-[10px] leading-none text-gray-500">{list.length}</span>
                            </span>
                          ) : null
                        ) : indicator === 'pie' ? (
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
              </div>
            )
          })}
        </div>
      </div>
    </div>
    <div
      className="absolute inset-0"
      style={{
        transition: 'opacity 200ms ease-out, transform 200ms ease-out',
        opacity: dayViewOpen ? 1 : 0,
        transform: dayViewOpen ? 'none' : 'scale(0.98) translateY(6px)',
        pointerEvents: dayViewOpen ? undefined : 'none',
      }}
    >
      <DayView
        selectedKey={selectedKey}
        items={dayItems}
        cats={cats}
        markerTypes={markerTypes}
        onEdit={onEdit}
        onDelete={onDelete}
        onEditMarker={onEditMarker}
        onDeleteMarker={onDeleteMarker}
        onClose={() => setDayViewOpen(false)}
        onNavigate={navigateDay}
      />
    </div>
    </div>
    </div>
  )
}

/** Actual painted translateY of the content container (render-lag independent) */
function measureContainerY(el: HTMLDivElement | null): number | null {
  if (!el) return null
  const t = getComputedStyle(el).transform
  if (!t || t === 'none') return 0
  const m2 = t.match(/matrix\(([^)]+)\)/)
  if (m2) {
    const v = m2[1].split(',').map(Number)
    return v.length >= 6 ? v[5] : 0
  }
  const m3 = t.match(/matrix3d\(([^)]+)\)/)
  if (m3) {
    const v = m3[1].split(',').map(Number)
    return v.length >= 13 ? v[13] : 0
  }
  return 0
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
