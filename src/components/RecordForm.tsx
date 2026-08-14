import { useCallback, useEffect, useRef, useState, type Ref } from 'react'
import { useImperativeHandle } from 'react'
import { usePhotoReorder } from '../hooks/usePhotoReorder'
import { useFormDraft } from '../hooks/useFormDraft'
import type { Cat, RecordDraft, RecordInput, VomitRecord, VomitType } from '../types'
import { VOMIT_TYPE_KEYS, VOMIT_TYPES } from '../types'
import { fromLocalDateTimeInput, toLocalDateTimeInput } from '../lib/dates'
import { getPhoto, uid } from '../lib/storage'
import { PhotoPreview } from './PhotoPreview'

const MAX_PHOTOS = 6

interface Props {
  cats: Cat[]
  initial?: VomitRecord | null
  /** YYYY-MM-DD: 캘린더에서 날짜 선택 시 프리셋 */
  presetDate?: string | null
  onSubmit: (input: RecordInput) => void
  /** 취소/닫기 완료 콜백 (confirm·draft 폐기는 폼 내부에서 처리) */
  onClose: () => void
  onAddCat: () => void
}

export interface RecordFormHandle {
  requestClose: () => void
}

interface PhotoItem {
  key: string
  /** 기존 사진의 id (새 사진은 undefined) */
  id?: string
  blob: Blob
}

export function RecordForm({ cats, initial, presetDate, onSubmit, onClose, onAddCat, ref }: Props & { ref?: Ref<RecordFormHandle> }) {
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
  const fileRef = useRef<HTMLInputElement>(null)

  const draftContext = initial ? initial.id : 'add'
  const {
    ready: draftReady,
    restored: restoredDraft,
    discard: discardDraft,
    hasDraft: draftHasDraft,
    onStateChange,
  } = useFormDraft<RecordDraft>(
    'record',
    draftContext,
    [datetime, catId, types, memo, photoItems],
    () => {
      const removedPhotos = initial ? initial.photos.filter((id) => !photoItems.some((p) => p.id === id)) : []
      return {
        applyTo: draftContext,
        datetime,
        catId,
        types,
        memo,
        newPhotos: photoItems.filter((p) => !p.id).map((p, i) => ({ id: `d${i}`, blob: p.blob })),
        removedPhotos,
      }
    },
  )

  // 상태 변경 시 draft 저장 (실변경 감지는 훅 내부 스냅샷 비교가 담당)
  useEffect(() => {
    onStateChange()
  }, [datetime, catId, types, memo, photoItems, onStateChange])

  const requestClose = () => {
    // 이번 세션에 draft가 있으면 확인 — 없으면 즉시 닫기
    if (draftHasDraft && !confirm('정말 나가시겠습니까? 작성 중인 내용은 저장되지 않습니다')) return
    discardDraft()
    onClose()
  }

  useImperativeHandle(ref, () => ({ requestClose }))

  // draft 복원: 1회 질문 후 복원 또는 폐기 (StrictMode 이중 실행은 ref로 1회만)
  const restoreAskedRef = useRef(false)
  useEffect(() => {
    if (!draftReady || !restoredDraft || restoreAskedRef.current) return
    restoreAskedRef.current = true
    if (!confirm('이전에 작성 중이던 내용이 있습니다. 불러올까요?')) {
      discardDraft()
      return
    }
    let cancelled = false
    void (async () => {
      setDatetime(restoredDraft.datetime)
      setCatId(restoredDraft.catId)
      if (restoredDraft.types.length > 0) setTypes(restoredDraft.types)
      setMemo(restoredDraft.memo)
      // 사진 목록 복원: 기존 사진(원래 순서, 제거된 것 제외) + 새 사진
      const newBlobs = restoredDraft.newPhotos.map((p) => p.blob)
      const removed = restoredDraft.removedPhotos
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
    })()
    return () => {
      cancelled = true
    }
  }, [draftReady, restoredDraft, initial, discardDraft])

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
    // 원본 그대로 저장이므로 편집 없이 즉시 추가
    setPhotoItems((prev) => [...prev, ...added.map((f) => ({ key: uid(), blob: f }))])
    if (fileRef.current) fileRef.current.value = ''
  }

  const removePhoto = (key: string) => {
    setPhotoItems((prev) => prev.filter((p) => p.key !== key))
  }

  const reorderPhoto = useCallback((fromKey: string, toKey: string) => {
    setPhotoItems((prev) => {
      const from = prev.findIndex((p) => p.key === fromKey)
      const to = prev.findIndex((p) => p.key === toKey)
      if (from < 0 || to < 0 || from === to) return prev
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }, [])
  const { dragKey, onThumbPointerDown } = usePhotoReorder(reorderPhoto)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!datetime || !catId || types.length === 0) return
    discardDraft()
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
        <button type="button" onClick={requestClose} className="rounded-lg border border-gray-200 px-4 py-2 text-gray-600">
          취소
        </button>
      </div>
    </form>
  )
}
