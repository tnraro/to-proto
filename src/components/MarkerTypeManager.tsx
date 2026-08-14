import { useRef, useState } from 'react'
import type { MarkerType } from '../types'

interface Props {
  markerTypes: MarkerType[]
  markersCountByType: (typeId: string) => number
  addMarkerType: (name: string) => void
  renameMarkerType: (id: string, name: string) => void
  deleteMarkerType: (id: string) => void
}

export function MarkerTypeManager({
  markerTypes,
  markersCountByType,
  addMarkerType,
  renameMarkerType,
  deleteMarkerType,
}: Props) {
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    addMarkerType(trimmed)
    setName('')
    inputRef.current?.focus()
  }

  const saveEdit = () => {
    const trimmed = editingName.trim()
    if (editingId && trimmed) renameMarkerType(editingId, trimmed)
    setEditingId(null)
  }

  const remove = (t: MarkerType) => {
    const count = markersCountByType(t.id)
    if (
      confirm(
        count > 0
          ? `'${t.name}' 종류의 마커 ${count}개와 사진이 함께 삭제됩니다. 삭제할까요?`
          : `'${t.name}' 종류를 삭제할까요?`,
      )
    ) {
      deleteMarkerType(t.id)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="flex gap-2">
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="새 마커 종류 (예: 건강 검진)"
          className="min-h-11 w-full flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 text-base focus:border-primary focus:bg-white focus:outline-none"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="min-h-11 shrink-0 rounded-xl bg-primary px-4 font-medium text-white hover:bg-primary-hover disabled:opacity-40"
        >
          추가
        </button>
      </form>

      <ul className="divide-y divide-gray-100 rounded-card border border-gray-100 bg-white shadow-card">
        {markerTypes.map((t) => (
          <li key={t.id} className="flex items-center gap-3 px-4 py-3">
            {editingId === t.id ? (
              <>
                <input
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit()
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  className="min-h-10 w-full flex-1 rounded-lg border border-gray-300 px-3 text-sm"
                />
                <button onClick={saveEdit} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white">
                  저장
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500"
                >
                  취소
                </button>
              </>
            ) : (
              <>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.name}</span>
                <button
                  onClick={() => {
                    setEditingId(t.id)
                    setEditingName(t.name)
                  }}
                  className="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
                >
                  이름 변경
                </button>
                <button
                  onClick={() => remove(t)}
                  className="rounded px-2 py-1 text-sm text-red-500 hover:bg-red-50"
                >
                  삭제
                </button>
              </>
            )}
          </li>
        ))}
        {markerTypes.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-gray-400">등록된 마커 종류가 없습니다</li>
        )}
      </ul>
    </div>
  )
}
