import type { Cat, Marker, MarkerType, TimelineItem, VomitRecord } from '../types'
import { VOMIT_TYPES } from '../types'
import { PhotoThumb } from './PhotoThumb'
import { CatAvatar } from './CatAvatar'
import { DropdownMenu } from './ui/DropdownMenu'
import { RelativeTime } from './ui/RelativeTime'

interface Props {
  items: TimelineItem[]
  cats: Cat[]
  markerTypes?: MarkerType[]
  onEdit: (record: VomitRecord) => void
  onDelete: (id: string) => void
  onEditMarker?: (marker: Marker) => void
  onDeleteMarker?: (id: string) => void
  emptyText?: string
}

export function RecordList({
  items,
  cats,
  markerTypes = [],
  onEdit,
  onDelete,
  onEditMarker,
  onDeleteMarker,
  emptyText,
}: Props) {
  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">{emptyText ?? '기록이 없습니다'}</p>
  }

  return (
    <ul className="divide-y divide-gray-100 bg-white">
      {items.map((item) =>
        item.kind === 'record' ? (
          <RecordListItem
            key={item.payload.id}
            record={item.payload}
            cat={cats.find((c) => c.id === item.payload.catId)}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ) : (
          <MarkerListItem
            key={item.payload.id}
            marker={item.payload}
            markerType={markerTypes.find((t) => t.id === item.payload.typeId)}
            cats={cats}
            onEdit={onEditMarker ?? (() => {})}
            onDelete={onDeleteMarker ?? (() => {})}
          />
        ),
      )}
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
          <RelativeTime iso={record.datetime} />
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

function MarkerListItem({
  marker,
  markerType,
  cats,
  onEdit,
  onDelete,
}: {
  marker: Marker
  markerType?: MarkerType
  cats: Cat[]
  onEdit: (marker: Marker) => void
  onDelete: (id: string) => void
}) {
  return (
    <li className="flex gap-3 px-4 py-3.5">
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-500">
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-base font-semibold text-gray-900">{markerType?.name ?? '알 수 없는 종류'}</span>
          <RelativeTime iso={marker.datetime} />
        </div>
        {marker.catIds.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {marker.catIds.map((id) => {
              const cat = cats.find((c) => c.id === id)
              return (
                <span key={id} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                  {cat?.name ?? '?'}
                </span>
              )
            })}
          </div>
        )}
        {marker.memo && <p className="mt-1 break-words text-sm text-gray-500">{marker.memo}</p>}
        {marker.photos.length > 0 && (
          <div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-5">
            {marker.photos.map((pid, i) => (
              <PhotoThumb key={pid} photos={marker.photos} index={i} />
            ))}
          </div>
        )}
      </div>

      <DropdownMenu
        ariaLabel="마커 메뉴"
        items={[
          { label: '수정', onClick: () => onEdit(marker) },
          { label: '삭제', danger: true, onClick: () => onDelete(marker.id) },
        ]}
      />
    </li>
  )
}
