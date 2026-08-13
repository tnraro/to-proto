import { useState } from 'react'
import type { Cat, VomitType } from '../types'
import { VOMIT_TYPE_KEYS, VOMIT_TYPES } from '../types'
import { EMPTY_FILTERS, type DateMode, type RecordFilters } from '../lib/filters'

const DATE_MODES: { id: DateMode; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'before', label: '이전' },
  { id: 'after', label: '이후' },
  { id: 'range', label: '범위' },
]

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

  return (
    <div className="border-b border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full items-center justify-between px-4"
      >
        <span className="text-sm font-medium text-gray-700">필터</span>
        <span className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{resultCount}건</span>
          <span className="text-gray-400">{open ? '▲' : '▼'}</span>
        </span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-gray-100 px-4 py-3">
          <div>
            <span className="mb-1.5 block text-xs font-medium text-gray-500">토의 종류</span>
            <div className="flex flex-wrap gap-1.5">
              {VOMIT_TYPE_KEYS.map((k) => {
                const selected = filters.types.includes(k)
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => toggleType(k)}
                    className={`min-h-9 rounded-full border px-3 text-sm ${
                      selected
                        ? `border-transparent bg-white ring-2 ${VOMIT_TYPES[k].ring}`
                        : 'border-gray-300 bg-white text-gray-600'
                    }`}
                  >
                    {VOMIT_TYPES[k].label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-gray-500">고양이</span>
            <div className="flex flex-wrap gap-1.5">
              {cats.map((c) => {
                const selected = filters.catIds.includes(c.id)
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCat(c.id)}
                    className={`min-h-9 rounded-full border px-3 text-sm ${
                      selected
                        ? 'border-transparent bg-emerald-600 text-white'
                        : 'border-gray-300 bg-white text-gray-600'
                    }`}
                  >
                    {c.name}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-gray-500">날짜</span>
            <div className="flex flex-wrap items-center gap-2">
              {DATE_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onChange({ ...filters, dateMode: m.id })}
                  className={`min-h-9 rounded-full border px-3 text-sm ${
                    filters.dateMode === m.id
                      ? 'border-transparent bg-emerald-600 text-white'
                      : 'border-gray-300 bg-white text-gray-600'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {filters.dateMode === 'before' && (
                <input
                  type="date"
                  value={filters.dateBefore ?? ''}
                  onChange={(e) => onChange({ ...filters, dateBefore: e.target.value })}
                  className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                />
              )}
              {filters.dateMode === 'after' && (
                <input
                  type="date"
                  value={filters.dateAfter ?? ''}
                  onChange={(e) => onChange({ ...filters, dateAfter: e.target.value })}
                  className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                />
              )}
              {filters.dateMode === 'range' && (
                <>
                  <input
                    type="date"
                    value={filters.dateRangeStart ?? ''}
                    onChange={(e) => onChange({ ...filters, dateRangeStart: e.target.value })}
                    className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                  />
                  <span className="text-gray-400">~</span>
                  <input
                    type="date"
                    value={filters.dateRangeEnd ?? ''}
                    onChange={(e) => onChange({ ...filters, dateRangeEnd: e.target.value })}
                    className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </>
              )}
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-gray-500">메모 내용</span>
            <input
              type="text"
              value={filters.memo}
              onChange={(e) => onChange({ ...filters, memo: e.target.value })}
              placeholder="메모에 포함된 단어"
              className="min-h-9 w-full rounded-lg border border-gray-300 px-3 text-sm"
            />
          </div>

          <button
            type="button"
            onClick={() => onChange({ ...EMPTY_FILTERS })}
            className="min-h-9 w-full rounded-lg border border-gray-300 text-sm text-gray-500 hover:bg-gray-50"
          >
            필터 초기화
          </button>
        </div>
      )}
    </div>
  )
}
