import type { Cat, VomitRecord } from '../types'
import { VOMIT_TYPES } from '../types'
import { formatRelativeTime } from '../lib/dates'
import { PhotoThumb } from './PhotoThumb'
import { CatAvatar } from './CatAvatar'
import { DropdownMenu } from './DropdownMenu'

interface Props {
  records: VomitRecord[]
  cats: Cat[]
  onEdit: (record: VomitRecord) => void
  onDelete: (id: string) => void
  emptyText?: string
}

export function RecordList({ records, cats, onEdit, onDelete, emptyText }: Props) {
  if (records.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">{emptyText ?? '기록이 없습니다'}</p>
  }

  return (
    <ul className="divide-y divide-gray-100 bg-white">
      {records.map((r) => (
        <RecordListItem
          key={r.id}
          record={r}
          cat={cats.find((c) => c.id === r.catId)}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </ul>
  )
}

function RecordListItem({
  record,
  cat,
  onEdit,
  onDelete,
}: {
  record: VomitRecord
  cat?: Cat
  onEdit: (record: VomitRecord) => void
  onDelete: (id: string) => void
}) {
  return (
    <li className="flex gap-3 px-4 py-3.5">
      <div className="mt-0.5">
        <CatAvatar cat={cat} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-base font-semibold text-gray-900">{cat?.name ?? '?'}</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
            {formatRelativeTime(record.datetime)}
          </span>
        </div>
        {record.memo && <p className="mt-1 break-words text-sm text-gray-500">{record.memo}</p>}
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {record.types.map((t) => (
            <span
              key={t}
              className="flex items-center gap-1.5 rounded-full bg-gray-50 px-2 py-0.5 text-xs text-gray-600"
            >
              <span className={`inline-block h-2 w-2 rounded-full ${VOMIT_TYPES[t].color}`} />
              {VOMIT_TYPES[t].label}
            </span>
          ))}
        </div>
        {record.photos.length > 0 && (
          <div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-5">
            {record.photos.map((pid, i) => (
              <PhotoThumb key={pid} photos={record.photos} index={i} />
            ))}
          </div>
        )}
      </div>

      <DropdownMenu
        ariaLabel="기록 메뉴"
        items={[
          { label: '수정', onClick: () => onEdit(record) },
          { label: '삭제', danger: true, onClick: () => onDelete(record.id) },
        ]}
      />
    </li>
  )
}
