import { useEffect, useRef, useState } from 'react'
import type { Cat, RecordDraft, RecordInput, VomitRecord, VomitType } from '../types'
import { VOMIT_TYPE_KEYS, VOMIT_TYPES } from '../types'
import { fromLocalDateTimeInput, toLocalDateTimeInput } from '../lib/dates'
import { deleteDraft, getPhoto, loadDraft, saveDraft, uid } from '../lib/storage'
import { PhotoPreview } from './PhotoPreview'
import { ImageEditorModal } from './ImageEditorModal'

const MAX_PHOTOS = 6
const DRAFT_TTL_MS = 30 * 60 * 1000
const DRAFT_SAVE_MS = 500

interface Props {
  cats: Cat[]
  initial?: VomitRecord | null
  /** YYYY-MM-DD: 캘린더에서 날짜 선택 시 프리셋 */
  presetDate?: string | null
  onSubmit: (input: RecordInput) => void
  onCancel?: () => void
  onAddCat: () => void
}

interface PhotoItem {
  key: string
  /** 기존 사진의 id (새 사진은 undefined) */
  id?: string
  blob: Blob
}

export function RecordForm({ cats, initial, presetDate, onSubmit, onCancel, onAddCat }: Props) {
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
  const [catId, setCatId] = useState(() => initial?.catId ?? cats[0]?.id ?? '')
  const [types, setTypes] = useState<VomitType[]>(() =>
    initial && initial.types.length > 0 ? initial.types : [],
  )
  const [memo, setMemo] = useState(() => initial?.memo ?? '')
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([])
  const [editingQueue, setEditingQueue] = useState<File[]>([])
  const editingBlob = editingQueue[0] ?? null
  const fileRef = useRef<HTMLInputElement>(null)
  const draftReady = useRef(false)
  const dragKeyRef = useRef<string | null>(null)
  const [dragKey, setDragKey] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const draft = await loadDraft()
      if (cancelled) return
      const context = initial ? initial.id : 'add'
      const validDraft = draft && draft.applyTo === context && Date.now() - draft.savedAt <= DRAFT_TTL_MS
      if (validDraft) {
        setDatetime(draft.datetime)
        setCatId(draft.catId)
        if (draft.types.length > 0) setTypes(draft.types)
        setMemo(draft.memo)
      } else if (draft && Date.now() - draft.savedAt > DRAFT_TTL_MS) {
        void deleteDraft()
      }
      // 사진 목록 복원: 기존 사진(원래 순서, 제거된 것 제외) + 새 사진
      const newBlobs = validDraft ? draft.newPhotos.map((p) => p.blob) : []
      const removed = validDraft ? draft.removedPhotos : []
      if (initial) {
        const existing: PhotoItem[] = []
        for (const id of initial.photos) {
          if (removed.includes(id)) continue
          const blob = await getPhoto(id)
          if (blob) existing.push({ key: id, id, blob })
        }
        if (!cancelled) setPhotoItems([...existing, ...newBlobs.map((blob) => ({ key: uid(), blob }))])
      } else if (!cancelled) {
        setPhotoItems(newBlobs.map((blob) => ({ key: uid(), blob })))
      }
      draftReady.current = true
    })()
    return () => {
      cancelled = true
    }
  }, [initial])

  useEffect(() => {
    if (!draftReady.current) return
    const removedPhotos = initial ? initial.photos.filter((id) => !photoItems.some((p) => p.id === id)) : []
    const draft: RecordDraft = {
      id: 'record',
      applyTo: initial ? initial.id : 'add',
      datetime,
      catId,
      types,
      memo,
      newPhotos: photoItems.filter((p) => !p.id).map((p, i) => ({ id: `d${i}`, blob: p.blob })),
      removedPhotos,
      savedAt: Date.now(),
    }
    const t = setTimeout(() => void saveDraft(draft), DRAFT_SAVE_MS)
    return () => clearTimeout(t)
  }, [datetime, catId, types, memo, photoItems, initial])

  useEffect(() => {
    if (cats.length === 0) return
    if (!cats.some((c) => c.id === catId)) {
      setCatId(cats[cats.length - 1].id)
    }
  }, [cats, catId])

  const toggleType = (k: VomitType) => {
    setTypes((prev) => (prev.includes(k) ? prev.filter((t) => t !== k) : [...prev, k]))
  }

  const onFiles = (files: FileList | null) => {
    if (!files) return
    const added = Array.from(files).slice(0, MAX_PHOTOS - photoItems.length)
    if (added.length === 0) return
    setEditingQueue((prev) => [...prev, ...added])
    if (fileRef.current) fileRef.current.value = ''
  }

  const removePhoto = (key: string) => {
    setPhotoItems((prev) => prev.filter((p) => p.key !== key))
  }

  const onHandlePointerDown = (e: React.PointerEvent, key: string) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragKeyRef.current = key
    setDragKey(key)
  }

  const onHandlePointerMove = (e: React.PointerEvent) => {
    const fromKey = dragKeyRef.current
    if (!fromKey) return
    const hit = document
      .elementsFromPoint(e.clientX, e.clientY)
      .find((n) => n instanceof HTMLElement && n.hasAttribute('data-photo-key')) as HTMLElement | undefined
    const toKey = hit?.getAttribute('data-photo-key')
    if (!toKey || toKey === fromKey) return
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

  const onHandlePointerEnd = () => {
    dragKeyRef.current = null
    setDragKey(null)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!datetime || !catId || types.length === 0) return
    onSubmit({
      datetime: fromLocalDateTimeInput(datetime).toISOString(),
      catId,
      types,
      memo: memo.trim(),
      photos: photoItems.length > 0 ? photoItems.map((p) => (p.id ?? p.blob)) : undefined,
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
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
        {cats.length === 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
            <p className="text-sm font-medium text-amber-800">고양이를 먼저 등록해 주세요</p>
            <p className="mt-0.5 text-xs text-amber-600">등록하면 바로 기록을 시작할 수 있습니다</p>
            <button
              type="button"
              onClick={onAddCat}
              className="mt-2 min-h-11 rounded-lg bg-primary px-4 font-medium text-white hover:bg-primary-hover"
            >
              고양이 등록
            </button>
          </div>
        ) : (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-600">고양이</span>
            <select
              value={catId}
              onChange={(e) => {
                if (e.target.value === '__new') {
                  onAddCat()
                  return
                }
                setCatId(e.target.value)
              }}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus:border-primary focus:bg-white focus:outline-none"
              required
            >
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value="__new">+ 새 고양이 등록</option>
            </select>
          </label>
        )}
      </div>

      <div>
        <span className="mb-1 block text-sm font-medium text-gray-600">토의 종류 (복수 선택 가능)</span>
        <div className="flex flex-wrap gap-2">
          {VOMIT_TYPE_KEYS.map((k) => {
            const selected = types.includes(k)
            return (
              <button
                key={k}
                type="button"
                onClick={() => toggleType(k)}
                className={`min-h-11 rounded-full border px-3.5 py-2 text-sm transition ${
                  selected
                    ? `border-transparent bg-white ring-2 ${VOMIT_TYPES[k].ring}`
                    : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span
                  className={`mr-1.5 inline-block h-2.5 w-2.5 rounded-full ${VOMIT_TYPES[k].color} ${
                    selected ? '' : 'opacity-40'
                  }`}
                />
                {VOMIT_TYPES[k].label}
              </button>
            )
          })}
        </div>
        {types.length === 0 && <p className="mt-1 text-xs text-red-500">토 종류를 1개 이상 선택하세요</p>}
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-gray-600">메모</span>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={2}
          placeholder="남긴 음식 종류, 상태 등 간단한 메모"
          className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus:border-primary focus:bg-white focus:outline-none"
        />
      </label>

      <div>
        <span className="mb-1 block text-sm font-medium text-gray-600">
          사진 ({photoItems.length}/{MAX_PHOTOS})
        </span>
        <div className="flex flex-wrap gap-2">
          {photoItems.map((p) => (
            <div
              key={p.key}
              data-photo-key={p.key}
              className={`relative rounded-lg ${dragKey === p.key ? 'opacity-70 ring-2 ring-primary' : ''}`}
            >
              <PhotoPreview blob={p.blob} onRemove={() => removePhoto(p.key)} />
              <button
                type="button"
                aria-label="사진 순서 변경"
                onPointerDown={(e) => onHandlePointerDown(e, p.key)}
                onPointerMove={onHandlePointerMove}
                onPointerUp={onHandlePointerEnd}
                onPointerCancel={onHandlePointerEnd}
                className="absolute bottom-0.5 right-0.5 z-10 flex h-6 w-6 touch-none select-none items-center justify-center rounded-md bg-black/45 text-white"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                  <circle cx="9" cy="6" r="1.4" />
                  <circle cx="15" cy="6" r="1.4" />
                  <circle cx="9" cy="12" r="1.4" />
                  <circle cx="15" cy="12" r="1.4" />
                  <circle cx="9" cy="18" r="1.4" />
                  <circle cx="15" cy="18" r="1.4" />
                </svg>
              </button>
            </div>
          ))}
          {photoItems.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-2xl text-gray-400 hover:border-emerald-400 hover:text-emerald-500"
            >
              +
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-400">썸네일 우하단 핸들을 드래그해 순서를 변경하세요</p>
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
          disabled={!catId || !datetime || types.length === 0}
          className="rounded-lg bg-primary px-5 py-2 font-medium text-white hover:bg-primary-hover disabled:opacity-40"
        >
          {initial ? '수정 저장' : '기록 추가'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-lg border border-gray-200 px-4 py-2 text-gray-600">
            취소
          </button>
        )}
      </div>
      <ImageEditorModal
        open={editingBlob !== null}
        image={editingBlob}
        onCancel={() => setEditingQueue((prev) => prev.slice(1))}
        onApply={(blob) => {
          setPhotoItems((prev) => [...prev, { key: uid(), blob }])
          setEditingQueue((prev) => prev.slice(1))
        }}
      />
    </form>
  )
}
