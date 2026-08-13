import { useEffect, useMemo, useState } from 'react'
import type { Cat, VomitRecord } from '../types'
import { VOMIT_TYPES } from '../types'
import { formatRelativeTime, monthLabel, startOfMonth, toDateKey } from '../lib/dates'
import { PhotoThumb } from './PhotoThumb'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

interface Props {
  records: VomitRecord[]
  cats: Cat[]
  onEdit: (record: VomitRecord) => void
  onDelete: (id: string) => void
  /** 선택된 날짜(YYYY-MM-DD)를 상위로 보고 — FAB의 프리셋에 사용 */
  onSelectedDateChange: (dateKey: string) => void
}

export function CalendarView({ records, cats, onEdit, onDelete, onSelectedDateChange }: Props) {
  const today = new Date()
  const [cursor, setCursor] = useState(() => startOfMonth(today))
  const [selectedKey, setSelectedKey] = useState(() => toDateKey(today))

  useEffect(() => {
    onSelectedDateChange(selectedKey)
  }, [selectedKey, onSelectedDateChange])

  const catName = (id: string) => cats.find((c) => c.id === id)?.name ?? '?'

  const cells = useMemo(() => buildMonthCells(cursor), [cursor])

  const recordsByDay = useMemo(() => {
    const map = new Map<string, VomitRecord[]>()
    for (const r of records) {
      const key = toDateKey(new Date(r.datetime))
      const list = map.get(key) ?? []
      list.push(r)
      map.set(key, list)
    }
    for (const list of map.values()) list.sort((a, b) => a.datetime.localeCompare(b.datetime))
    return map
  }, [records])

  const dayRecords = recordsByDay.get(selectedKey) ?? []

  const move = (delta: number) => {
    const next = new Date(cursor)
    next.setMonth(next.getMonth() + delta)
    setCursor(startOfMonth(next))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={() => move(-1)} className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50">
            ‹
          </button>
          <button onClick={() => move(1)} className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50">
            ›
          </button>
          <button
            onClick={() => setCursor(startOfMonth(today))}
            className="ml-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            오늘
          </button>
        </div>
        <h2 className="text-lg font-bold">{monthLabel(cursor)}</h2>
        <span className="w-24" />
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`pb-1 text-center text-xs font-medium ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'}`}
          >
            {w}
          </div>
        ))}
        {cells.map((cell, i) => {
          const key = cell ? toDateKey(cell) : null
          const list = key ? recordsByDay.get(key) : undefined
          const isSelected = key === selectedKey
          const isToday = key === toDateKey(today)
          return (
            <button
              key={i}
              disabled={!cell}
              onClick={() => cell && setSelectedKey(toDateKey(cell))}
              className={`flex min-h-12 flex-col rounded-lg border p-1 text-left transition sm:min-h-16 ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-100 bg-white hover:border-gray-300'
              }`}
            >
              <span
                className={`text-xs font-medium ${!cell ? '' : isToday ? 'text-emerald-600' : 'text-gray-600'}`}
              >
                {cell?.getDate()}
              </span>
              {list && (
                <span className="mt-0.5 flex flex-wrap gap-0.5">
                  {list.slice(0, 4).map((r) =>
                    r.types.map((t) => (
                      <span
                        key={`${r.id}-${t}`}
                        title={`${catName(r.catId)} · ${VOMIT_TYPES[t].label}`}
                        className={`inline-block h-2 w-2 rounded-full ${VOMIT_TYPES[t].color}`}
                      />
                    )),
                  )}
                  {list.length > 4 && <span className="text-[10px] text-gray-400">+{list.length - 4}</span>}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-600">{selectedKey} 기록</h3>
        {dayRecords.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">기록이 없습니다</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm">
            {dayRecords.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex shrink-0 gap-0.5">
                  {r.types.map((t) => (
                    <span key={t} className={`inline-block h-3 w-3 rounded-full ${VOMIT_TYPES[t].color}`} />
                  ))}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">
                    {formatRelativeTime(r.datetime)} <span className="ml-1 text-xs text-gray-400">{catName(r.catId)}</span>
                  </div>
                  <div className="truncate text-sm text-gray-500">
                    {r.types.map((t) => VOMIT_TYPES[t].label).join(' + ')}
                    {r.memo && <span className="text-gray-400"> · {r.memo}</span>}
                  </div>
                  {r.photos.length > 0 && (
                    <div className="mt-1.5 flex gap-1.5">
                      {r.photos.map((pid) => (
                        <PhotoThumb key={pid} photoId={pid} />
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => onEdit(r)} className="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100">
                    수정
                  </button>
                  <button
                    onClick={() => onDelete(r.id)}
                    className="rounded px-2 py-1 text-sm text-red-500 hover:bg-red-50"
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
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
