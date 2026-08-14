import { useMemo, useState } from 'react'
import type { Cat, Marker, MarkerType, TimelineItem, VomitRecord } from '../types'
import { EMPTY_FILTERS, filterMarkers, filterRecords, type RecordFilters } from '../lib/filters'
import { RecordList } from './RecordList'
import { FilterPanel } from './FilterPanel'

const PAGE_SIZE = 20

interface Props {
  records: VomitRecord[]
  cats: Cat[]
  markers: Marker[]
  markerTypes: MarkerType[]
  onEdit: (record: VomitRecord) => void
  onDelete: (id: string) => void
  onEditMarker: (marker: Marker) => void
  onDeleteMarker: (id: string) => void
}

export function RecordBrowser({
  records,
  cats,
  markers,
  markerTypes,
  onEdit,
  onDelete,
  onEditMarker,
  onDeleteMarker,
}: Props) {
  const [filters, setFilters] = useState<RecordFilters>({ ...EMPTY_FILTERS })
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => filterRecords(records, filters), [records, filters])

  // 기록과 마커를 같은 필터로 거르고 datetime 내림차순 병합 — 페이지네이션은 타입을 모른다
  const timeline = useMemo<TimelineItem[]>(() => {
    const includeRecords = filters.kinds.length === 0 || filters.kinds.includes('record')
    const includeMarkers = filters.kinds.length === 0 || filters.kinds.includes('marker')
    const items: TimelineItem[] = [
      ...(includeRecords ? filtered.map((r) => ({ kind: 'record' as const, payload: r })) : []),
      ...(includeMarkers ? filterMarkers(markers, filters).map((m) => ({ kind: 'marker' as const, payload: m })) : []),
    ]
    return items.sort((a, b) => b.payload.datetime.localeCompare(a.payload.datetime))
  }, [filtered, markers, filters])

  const totalPages = Math.max(1, Math.ceil(timeline.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = timeline.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const changeFilters = (f: RecordFilters) => {
    setFilters(f)
    setPage(1)
  }

  return (
    <div className="flex h-full flex-col">
      <FilterPanel
        cats={cats}
        markerTypes={markerTypes}
        filters={filters}
        onChange={changeFilters}
        resultCount={filtered.length}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {records.length === 0 && markers.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">기록이 없습니다</p>
        ) : timeline.length === 0 ? (
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
          <RecordList
            items={pageItems}
            cats={cats}
            markerTypes={markerTypes}
            onEdit={onEdit}
            onDelete={onDelete}
            onEditMarker={onEditMarker}
            onDeleteMarker={onDeleteMarker}
          />
        )}
      </div>

      {timeline.length > PAGE_SIZE && (
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
