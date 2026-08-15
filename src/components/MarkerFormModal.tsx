import { useEffect, useRef, useState, type Ref } from 'react'
import { useImperativeHandle } from 'react'
import type { Cat, Marker, MarkerDraft, MarkerInput, MarkerType } from '../types'
import { fromLocalDateTimeInput, toLocalDateTimeInput } from '../lib/dates'
import { getPhoto, uid } from '../lib/storage'
import { usePhotoReorder } from '../hooks/usePhotoReorder'
import { useFormDraft } from '../hooks/useFormDraft'
import { Modal } from './ui/Modal'
import { PhotoPreview } from './PhotoPreview'

interface Props {
  open: boolean
  markerTypes: MarkerType[]
  cats: Cat[]
  initial?: Marker | null
  /** YYYY-MM-DD: preset when a date is picked in the calendar */
  presetDate?: string | null
  onSubmit: (input: MarkerInput) => void | Promise<void>
  onClose: () => void
  onAddMarkerType: (name: string) => string
}

interface PhotoItem {
  key: string
  id?: string
  blob: Blob
}

interface MarkerFormHandle {
  requestClose: () => void
}

export function MarkerFormModal({
  open,
  markerTypes,
  cats,
  initial,
  presetDate,
  onSubmit,
  onClose,
  onAddMarkerType,
}: Props) {
  const contentRef = useRef<MarkerFormHandle | null>(null)

  return (
    <Modal open={open} onClose={() => contentRef.current?.requestClose()} contentClassName="max-h-[85vh] overflow-y-auto">
      <MarkerFormContent
        key={initial?.id ?? 'new'}
        ref={contentRef}
        markerTypes={markerTypes}
        cats={cats}
        initial={initial}
        presetDate={presetDate}
        onSubmit={onSubmit}
        onClose={onClose}
        onAddMarkerType={onAddMarkerType}
      />
    </Modal>
  )
}

function MarkerFormContent({
  markerTypes,
  cats,
  initial,
  presetDate,
  onSubmit,
  onClose,
  onAddMarkerType,
  ref,
}: Omit<Props, 'open'> & { ref?: Ref<MarkerFormHandle> }) {
  const now = new Date()
  const initialDatetime = () => {
    if (initial) return toLocalDateTimeInput(new Date(initial.datetime))
    if (presetDate) {
      const d = new Date(presetDate)
      d.setHours(now.getHours(), now.getMinutes(), 0, 0)
      return toLocalDateTimeInput(d)
    }
    return toLocalDateTimeInput(now)
  }
  const [datetime, setDatetime] = useState(initialDatetime)
  const [typeId, setTypeId] = useState(initial?.typeId ?? markerTypes[0]?.id ?? '')
  const [catIds, setCatIds] = useState<string[]>(initial?.catIds ?? [])
  const [memo, setMemo] = useState(initial?.memo ?? '')
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([])
  const [addingType, setAddingType] = useState(false)
  const [newTypeName, setNewTypeName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const newTypeRef = useRef<HTMLInputElement>(null)

  const draftContext = initial ? initial.id : 'add'
  const {
    ready: draftReady,
    restored: restoredDraft,
    deleteDraft: deleteMarkerDraft,
    discard: discardMarkerDraft,
    hasDraft: draftHasDraft,
    onStateChange,
  } = useFormDraft<MarkerDraft>(
    'marker',
    draftContext,
    [datetime, typeId, catIds, memo, photoItems],
    () => ({
      applyTo: draftContext,
      datetime,
      typeId,
      catIds,
      memo,
      newPhotos: photoItems.filter((p) => !p.id).map((p, i) => ({ id: `d${i}`, blob: p.blob })),
      removedPhotos: initial ? initial.photos.filter((id) => !photoItems.some((p) => p.id === id)) : [],
    }),
  )

  useEffect(() => {
    onStateChange()
  }, [datetime, typeId, catIds, memo, photoItems, onStateChange])

  const requestClose = () => {
    if (draftHasDraft && !confirm('정말 나가시겠습니까? 작성 중인 내용은 저장되지 않습니다')) return
    discardMarkerDraft()
    onClose()
  }

  useImperativeHandle(ref, () => ({ requestClose }))

  useEffect(() => {
    if (!initial || restoredDraft) return
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
  }, [initial, restoredDraft])

  // Draft restore: ask once, then restore or discard (StrictMode double-run guarded by ref)
  const restoreAskedRef = useRef(false)
  useEffect(() => {
    if (!draftReady || !restoredDraft || restoreAskedRef.current) return
    restoreAskedRef.current = true
    if (!confirm('이전에 작성 중이던 내용이 있습니다. 불러올까요?')) {
      discardMarkerDraft()
      return
    }
    let cancelled = false
    void (async () => {
      setDatetime(restoredDraft.datetime)
      setTypeId(restoredDraft.typeId)
      setCatIds(restoredDraft.catIds)
      setMemo(restoredDraft.memo)
      const newBlobs = restoredDraft.newPhotos.map((p) => p.blob)
      const removed = restoredDraft.removedPhotos
      if (initial) {
        const items: PhotoItem[] = []
        for (const id of initial.photos) {
          if (removed.includes(id)) continue
          const blob = await getPhoto(id)
          if (blob) items.push({ key: id, id, blob })
        }
        if (!cancelled) setPhotoItems([...items, ...newBlobs.map((blob) => ({ key: uid(), blob }))])
      } else if (!cancelled) {
        setPhotoItems(newBlobs.map((blob) => ({ key: uid(), blob })))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [draftReady, restoredDraft, initial, discardMarkerDraft])

  const toggleCat = (id: string) => {
    setCatIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))
  }

  const onFiles = (files: FileList | null) => {
    if (!files) return
    const added = Array.from(files)
    setPhotoItems((prev) => [...prev, ...added.map((f) => ({ key: uid(), blob: f }))])
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
    if (!datetime || !typeId) return
    deleteMarkerDraft()
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
            className="w-full min-w-0 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus:border-primary focus:bg-white focus:outline-none"
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
        <span className="mb-1 block text-sm font-medium text-gray-600">연관 고양이 (복수 선택 가능)</span>
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
          disabled={!datetime || !typeId}
          className="rounded-lg bg-primary px-5 py-2 font-medium text-white hover:bg-primary-hover disabled:opacity-40"
        >
          {initial ? '수정 저장' : '마커 추가'}
        </button>
        <button type="button" onClick={requestClose} className="rounded-lg border border-gray-200 px-4 py-2 text-gray-600">
          취소
        </button>
      </div>
    </form>
  )
}
