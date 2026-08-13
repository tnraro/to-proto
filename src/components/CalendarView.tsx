import { useEffect, useMemo, useState } from 'react'
import type { Cat, VomitRecord, VomitType } from '../types'
import { VOMIT_TYPES } from '../types'
import { monthLabel, startOfMonth, toDateKey } from '../lib/dates'
import { RecordList } from './RecordList'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const MAX_TYPE_PAIRS = 3

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

      <div className="grid grid-cols-7 gap-1">
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
              {list && (
                <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  {summarizeByType(list)
                    .slice(0, MAX_TYPE_PAIRS)
                    .map(({ type, count }) => (
                      <span
                        key={type}
                        className="flex items-center gap-0.5"
                        title={`${VOMIT_TYPES[type].label} ${count}회`}
                      >
                        <span className={`inline-block h-2 w-2 rounded-full ${VOMIT_TYPES[type].color}`} />
                        {count > 1 && <span className="text-[10px] leading-none text-gray-500">{count}</span>}
                      </span>
                    ))}
                  {summarizeByType(list).length > MAX_TYPE_PAIRS && (
                    <span className="text-[10px] leading-none text-gray-400">
                      +{summarizeByType(list).slice(MAX_TYPE_PAIRS).reduce((s, x) => s + x.count, 0)}
                    </span>
                  )}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="rounded-card border border-gray-100 bg-white p-4 shadow-card">
        <h3 className="mb-2 text-sm font-semibold text-gray-600">{selectedKey} 기록</h3>
        <RecordList records={dayRecords} cats={cats} onEdit={onEdit} onDelete={onDelete} />
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

/** 하루 기록을 종류별로 집계해 횟수 내림차순으로 정렬 */
function summarizeByType(records: VomitRecord[]): { type: VomitType; count: number }[] {
  const counts = new Map<VomitType, number>()
  for (const r of records) {
    for (const t of r.types) counts.set(t, (counts.get(t) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
}
