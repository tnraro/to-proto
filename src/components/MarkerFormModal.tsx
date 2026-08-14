import { useEffect, useRef, useState } from 'react'
import type { Cat, Marker, MarkerInput, MarkerType } from '../types'
import { fromLocalDateTimeInput, toLocalDateTimeInput } from '../lib/dates'
import { getPhoto, uid } from '../lib/storage'
import { usePhotoReorder } from '../hooks/usePhotoReorder'
import { Modal } from './Modal'
import { PhotoPreview } from './PhotoPreview'

interface Props {
  open: boolean
  markerTypes: MarkerType[]
  cats: Cat[]
  initial?: Marker | null
  onSubmit: (input: MarkerInput) => void | Promise<void>
  /** Esc/백드롭 닫기 */
  onClose: () => void
  /** 마커 종류 인라인 추가 (새 id 반환) */
  onAddMarkerType: (name: string) => string
}

interface PhotoItem {
  key: string
  id?: string
  blob: Blob
}

export function MarkerFormModal({ open, markerTypes, cats, initial, onSubmit, onClose, onAddMarkerType }: Props) {
  return (
    <Modal open={open} onClose={onClose} contentClassName="max-h-[85vh] overflow-y-auto">
      {open && (
        <MarkerFormContent
          key={initial?.id ?? 'new'}
          markerTypes={markerTypes}
          cats={cats}
          initial={initial}
          onSubmit={onSubmit}
          onAddMarkerType={onAddMarkerType}
        />
      )}
    </Modal>
  )
}

function MarkerFormContent({
  markerTypes,
  cats,
  initial,
  onSubmit,
  onAddMarkerType,
}: Omit<Props, 'open' | 'onClose'>) {
  const [datetime, setDatetime] = useState(() =>
    initial ? toLocalDateTimeInput(new Date(initial.datetime)) : toLocalDateTimeInput(new Date()),
  )
  const [typeId, setTypeId] = useState(initial?.typeId ?? markerTypes[0]?.id ?? '')
  const [catIds, setCatIds] = useState<string[]>(initial?.catIds ?? [])
  const [memo, setMemo] = useState(initial?.memo ?? '')
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([])
  const [addingType, setAddingType] = useState(false)
  const [newTypeName, setNewTypeName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const newTypeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!initial) return
    let cancelled = false
    void (async () => {
      const items: PhotoItem[] = []
      for (const id of initial.photos) {
        const blob = await getPhoto(id)
        if (blob) items.push({ key: id, id, blob })
      }
      if (!cancelled) setPhotoItems(items)
    })()
    return () => {
      cancelled = true
    }
  }, [initial])

  const toggleCat = (id: string) => {
    setCatIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))
  }

  const onFiles = (files: FileList | null) => {
    if (!files) return
    setPhotoItems((prev) => [...prev, ...Array.from(files).map((f) => ({ key: uid(), blob: f }))])
    if (fileRef.current) fileRef.current.value = ''
  }

  const removePhoto = (key: string) => {
    setPhotoItems((prev) => prev.filter((p) => p.key !== key))
  }

  const reorderPhoto = (fromKey: string, toKey: string) => {
    setPhotoItems((prev) => {
      const from = prev.findIndex((p) => p.key === fromKey)
      const to = prev.findIndex((p) => p.key === toKey)
      if (from < 0 || to < 0 || from === to) return prev
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }
  const { dragKey, onThumbPointerDown } = usePhotoReorder(reorderPhoto)

  const addNewType = () => {
    const trimmed = newTypeName.trim()
    if (!trimmed) return
    setTypeId(onAddMarkerType(trimmed))
    setNewTypeName('')
    setAddingType(false)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!datetime || !typeId || catIds.length === 0) return
    void onSubmit({
      datetime: fromLocalDateTimeInput(datetime).toISOString(),
      typeId,
      catIds,
      memo: memo.trim() || undefined,
      photos: photoItems.length > 0 ? photoItems.map((p) => p.id ?? p.blob) : undefined,
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <h2 className="text-lg font-bold">{initial ? '마커 수정' : '마커 추가'}</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-600">날짜 · 시간</span>
          <input
            type="datetime-local"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus:border-primary focus:bg-white focus:outline-none"
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-600">마커 종류</span>
          <select
            value={addingType ? '__new' : typeId}
            onChange={(e) => {
              if (e.target.value === '__new') {
                setAddingType(true)
                setTimeout(() => newTypeRef.current?.focus(), 0)
              } else {
                setAddingType(false)
                setTypeId(e.target.value)
              }
            }}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus:border-primary focus:bg-white focus:outline-none"
            required
          >
            <option value="" disabled>
              종류 선택
            </option>
            {markerTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
            <option value="__new">+ 새 종류 등록</option>
          </select>
          {addingType && (
            <div className="mt-2 flex gap-2">
              <input
                ref={newTypeRef}
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addNewType()
                  }
                  if (e.key === 'Escape') setAddingType(false)
                }}
                placeholder="새 종류 이름"
                className="min-h-10 w-full flex-1 rounded-lg border border-gray-300 px-3 text-sm"
              />
              <button
                type="button"
                onClick={addNewType}
                disabled={!newTypeName.trim()}
                className="min-h-10 shrink-0 rounded-lg bg-primary px-3 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-40"
              >
                등록
              </button>
            </div>
          )}
        </label>
      </div>

      <div>
        <span className="mb-1 block text-sm font-medium text-gray-600">연관 고양이 (복수 선택)</span>
        <div className="flex flex-wrap gap-2">
          {cats.map((c) => {
            const selected = catIds.includes(c.id)
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleCat(c.id)}
                className={`min-h-10 rounded-full border px-3.5 text-sm transition ${
                  selected
                    ? 'border-transparent bg-primary text-white'
                    : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {c.name}
              </button>
            )
          })}
        </div>
        {catIds.length === 0 && <p className="mt-1 text-xs text-red-500">연관 고양이를 1마리 이상 선택하세요</p>}
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-gray-600">메모 (선택)</span>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={2}
          placeholder="검진 결과, 사료 변경 사유 등 간단한 메모"
          className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus:border-primary focus:bg-white focus:outline-none"
        />
      </label>

      <div>
        <span className="mb-1 block text-sm font-medium text-gray-600">사진</span>
        <div className="flex flex-wrap gap-2">
          {photoItems.map((p) => (
            <div
              key={p.key}
              data-photo-key={p.key}
              onPointerDown={(e) => onThumbPointerDown(e, p.key)}
              className={`relative touch-none select-none rounded-lg ${
                dragKey === p.key ? 'opacity-70 ring-2 ring-primary' : ''
              }`}
            >
              <PhotoPreview blob={p.blob} onRemove={() => removePhoto(p.key)} />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-0.5 right-0.5 z-10 flex h-6 w-6 items-center justify-center rounded-md bg-black/45 text-white"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                  <circle cx="9" cy="6" r="1.4" />
                  <circle cx="15" cy="6" r="1.4" />
                  <circle cx="9" cy="12" r="1.4" />
                  <circle cx="15" cy="12" r="1.4" />
                  <circle cx="9" cy="18" r="1.4" />
                  <circle cx="15" cy="18" r="1.4" />
                </svg>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-2xl text-gray-400 hover:border-emerald-400 hover:text-emerald-500"
          >
            +
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!datetime || !typeId || catIds.length === 0}
          className="rounded-lg bg-primary px-5 py-2 font-medium text-white hover:bg-primary-hover disabled:opacity-40"
        >
          {initial ? '수정 저장' : '마커 추가'}
        </button>
      </div>
    </form>
  )
}
