import { useState } from 'react'
import type { Cat, VomitType } from '../types'
import { VOMIT_TYPE_KEYS, VOMIT_TYPES } from '../types'
import { EMPTY_FILTERS, type DateMode, type RecordFilters } from '../lib/filters'
import { toDateKey } from '../lib/dates'
import { Chip } from './ui/Chip'

const DATE_MODES: { id: DateMode; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'before', label: '이전' },
  { id: 'after', label: '이후' },
  { id: 'range', label: '범위' },
]

const DATE_PRESETS = [
  { days: 7 },
  { days: 30 },
  { days: 90 },
]

function presetAfter(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return toDateKey(d)
}

const inputClass =
  'min-h-9 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm focus:border-primary focus:bg-white focus:outline-none'

interface Props {
  cats: Cat[]
  filters: RecordFilters
  onChange: (f: RecordFilters) => void
  resultCount: number
}

export function FilterPanel({ cats, filters, onChange, resultCount }: Props) {
  const [open, setOpen] = useState(false)

  const toggleType = (t: VomitType) => {
    onChange({
      ...filters,
      types: filters.types.includes(t)
        ? filters.types.filter((x) => x !== t)
        : [...filters.types, t],
    })
  }

  const toggleCat = (id: string) => {
    onChange({
      ...filters,
      catIds: filters.catIds.includes(id)
        ? filters.catIds.filter((x) => x !== id)
        : [...filters.catIds, id],
    })
  }

  const activeCount =
    filters.types.length + filters.catIds.length + (filters.dateMode !== 'all' ? 1 : 0) + (filters.memo.trim() ? 1 : 0)

  return (
    <div className="border-b border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-12 w-full items-center justify-between px-4"
      >
        <span className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">필터</span>
          {activeCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </span>
        <span className="flex items-center gap-2 text-xs text-gray-400">
          {resultCount}건
          <span className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
        </span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-gray-100 px-4 py-4">
          <div>
            <span className="mb-2 block text-xs font-medium text-gray-500">토의 종류</span>
            <div className="flex flex-wrap gap-2">
              {VOMIT_TYPE_KEYS.map((k) => (
                <Chip
                  key={k}
                  selected={filters.types.includes(k)}
                  onClick={() => toggleType(k)}
                  className={filters.types.includes(k) ? `ring-2 ring-offset-1 ${VOMIT_TYPES[k].ring}` : ''}
                >
                  {VOMIT_TYPES[k].label}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-2 block text-xs font-medium text-gray-500">고양이</span>
            <div className="flex flex-wrap gap-2">
              {cats.map((c) => (
                <Chip
                  key={c.id}
                  selected={filters.catIds.includes(c.id)}
                  onClick={() => toggleCat(c.id)}
                >
                  {c.name}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-2 block text-xs font-medium text-gray-500">날짜</span>
            <div className="flex flex-wrap gap-2">
              {DATE_MODES.map((m) => (
                <Chip
                  key={m.id}
                  selected={filters.dateMode === m.id}
                  onClick={() => onChange({ ...filters, dateMode: m.id })}
                >
                  {m.label}
                </Chip>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {DATE_PRESETS.map((p) => {
                const date = presetAfter(p.days)
                return (
                  <Chip
                    key={p.days}
                    selected={filters.dateMode === 'after' && filters.dateAfter === date}
                    onClick={() => onChange({ ...filters, dateMode: 'after', dateAfter: date })}
                  >
                    최근 {p.days}일
                  </Chip>
                )
              })}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {filters.dateMode === 'before' && (
                <input
                  type="date"
                  value={filters.dateBefore ?? ''}
                  onChange={(e) => onChange({ ...filters, dateBefore: e.target.value })}
                  className={inputClass}
                />
              )}
              {filters.dateMode === 'after' && (
                <input
                  type="date"
                  value={filters.dateAfter ?? ''}
                  onChange={(e) => onChange({ ...filters, dateAfter: e.target.value })}
                  className={inputClass}
                />
              )}
              {filters.dateMode === 'range' && (
                <>
                  <input
                    type="date"
                    value={filters.dateRangeStart ?? ''}
                    onChange={(e) => onChange({ ...filters, dateRangeStart: e.target.value })}
                    className={inputClass}
                  />
                  <span className="text-gray-400">~</span>
                  <input
                    type="date"
                    value={filters.dateRangeEnd ?? ''}
                    onChange={(e) => onChange({ ...filters, dateRangeEnd: e.target.value })}
                    className={inputClass}
                  />
                </>
              )}
            </div>
          </div>

          <div>
            <span className="mb-2 block text-xs font-medium text-gray-500">메모 내용</span>
            <input
              type="text"
              value={filters.memo}
              onChange={(e) => onChange({ ...filters, memo: e.target.value })}
              placeholder="메모에 포함된 단어"
              className={`${inputClass} w-full`}
            />
          </div>

          <button
            type="button"
            onClick={() => onChange({ ...EMPTY_FILTERS })}
            className="min-h-9 w-full rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50"
          >
            필터 초기화
          </button>
        </div>
      )}
    </div>
  )
}
