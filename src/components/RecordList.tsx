import type { Cat, VomitRecord } from '../types'
import { VOMIT_TYPES } from '../types'
import { formatRelativeTime } from '../lib/dates'
import { PhotoThumb } from './PhotoThumb'

interface Props {
  records: VomitRecord[]
  cats: Cat[]
  onEdit: (record: VomitRecord) => void
  onDelete: (id: string) => void
  catNameFor: (catId: string) => string
  emptyText?: string
}

export function RecordList({ records, onEdit, onDelete, catNameFor, emptyText }: Props) {
  if (records.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">{emptyText ?? '기록이 없습니다'}</p>
  }

  return (
    <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm">
      {records.map((r) => (
        <li key={r.id} className="flex items-center gap-3 px-4 py-3">
          <span className="flex shrink-0 gap-0.5">
            {r.types.map((t) => (
              <span key={t} className={`inline-block h-3 w-3 rounded-full ${VOMIT_TYPES[t].color}`} />
            ))}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium">{formatRelativeTime(r.datetime)}</span>
              <span className="text-xs text-gray-400">{catNameFor(r.catId)}</span>
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
            <button
              onClick={() => onEdit(r)}
              className="min-h-11 rounded px-3 py-2 text-sm text-gray-500 hover:bg-gray-100"
            >
              수정
            </button>
            <button
              onClick={() => onDelete(r.id)}
              className="min-h-11 rounded px-3 py-2 text-sm text-red-500 hover:bg-red-50"
            >
              삭제
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
