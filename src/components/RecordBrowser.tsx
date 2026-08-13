import { useMemo, useState } from 'react'
import type { Cat, VomitRecord } from '../types'
import { EMPTY_FILTERS, filterRecords, type RecordFilters } from '../lib/filters'
import { RecordList } from './RecordList'
import { FilterPanel } from './FilterPanel'

const PAGE_SIZE = 20

interface Props {
  records: VomitRecord[]
  cats: Cat[]
  onEdit: (record: VomitRecord) => void
  onDelete: (id: string) => void
}

export function RecordBrowser({ records, cats, onEdit, onDelete }: Props) {
  const [filters, setFilters] = useState<RecordFilters>({ ...EMPTY_FILTERS })
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => filterRecords(records, filters), [records, filters])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRecords = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const changeFilters = (f: RecordFilters) => {
    setFilters(f)
    setPage(1)
  }

  return (
    <div className="flex h-full flex-col">
      <FilterPanel cats={cats} filters={filters} onChange={changeFilters} resultCount={filtered.length} />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {records.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">기록이 없습니다</p>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-400">검색 결과가 없습니다</p>
            <button
              onClick={() => changeFilters({ ...EMPTY_FILTERS })}
              className="mt-2 min-h-9 rounded-lg border border-gray-300 px-4 text-sm text-gray-500 hover:bg-gray-50"
            >
              필터 초기화
            </button>
          </div>
        ) : (
          <RecordList records={pageRecords} cats={cats} onEdit={onEdit} onDelete={onDelete} />
        )}
      </div>

      {filtered.length > PAGE_SIZE && (
        <div className="shrink-0 border-t border-gray-200 bg-white py-2 pr-24 sm:pr-0">
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="min-h-10 rounded-full px-4 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40"
            >
              ‹ 이전
            </button>
            <span className="min-w-16 text-center text-sm text-gray-500">
              {safePage} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="min-h-10 rounded-full px-4 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40"
            >
              다음 ›
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
