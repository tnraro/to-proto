import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
        <RecordListItem
          key={r.id}
          record={r}
          catName={catNameFor(r.catId)}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </ul>
  )
}

const MENU_WIDTH = 112

function RecordListItem({
  record,
  catName,
  onEdit,
  onDelete,
}: {
  record: VomitRecord
  catName: string
  onEdit: (record: VomitRecord) => void
  onDelete: (id: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (buttonRef.current?.contains(target) || dropdownRef.current?.contains(target)) return
      setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    const onScroll = () => setMenuOpen(false)
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [menuOpen])

  const toggleMenu = () => {
    if (menuOpen) {
      setMenuOpen(false)
      return
    }
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    const left = Math.max(8, Math.min(rect.left + rect.width - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8))
    setMenuPos({ top: rect.bottom + 4, left })
    setMenuOpen(true)
  }

  return (
    <li className="flex gap-3 px-4 py-3">
      <span className="mt-0.5 h-10 w-10 shrink-0 rounded-full bg-gray-200" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-base font-medium text-gray-900">{catName}</span>
          <span className="text-xs text-gray-400">{formatRelativeTime(record.datetime)}</span>
        </div>
        {record.memo && <p className="mt-0.5 break-words text-sm text-gray-500">{record.memo}</p>}
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
          {record.types.map((t) => (
            <span key={t} className="flex items-center gap-1.5 text-sm text-gray-600">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${VOMIT_TYPES[t].color}`} />
              {VOMIT_TYPES[t].label}
            </span>
          ))}
        </div>
        {record.photos.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {record.photos.map((pid) => (
              <PhotoThumb key={pid} photoId={pid} />
            ))}
          </div>
        )}
      </div>

      <button
        ref={buttonRef}
        type="button"
        onClick={toggleMenu}
        className="flex min-h-11 w-9 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-gray-100"
        aria-label="기록 메뉴"
      >
        ⋮
      </button>

      {menuOpen &&
        menuPos &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-50"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <div className="w-28 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              <button
                onClick={() => {
                  setMenuOpen(false)
                  onEdit(record)
                }}
                className="block min-h-11 w-full px-4 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                수정
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false)
                  onDelete(record.id)
                }}
                className="block min-h-11 w-full px-4 text-left text-sm text-red-500 hover:bg-red-50"
              >
                삭제
              </button>
            </div>
          </div>,
          document.body,
        )}
    </li>
  )
}
