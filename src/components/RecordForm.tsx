import { useEffect, useRef, useState } from 'react'
import type { Cat, RecordDraft, VomitRecord, VomitType } from '../types'
import { VOMIT_TYPE_KEYS, VOMIT_TYPES } from '../types'
import { fromLocalDateTimeInput, toLocalDateTimeInput } from '../lib/dates'
import { deleteDraft, getPhoto, loadDraft, saveDraft } from '../lib/storage'

export type RecordInput = Omit<VomitRecord, 'id' | 'createdAt' | 'updatedAt' | 'photos'> & {
  photos?: Blob[]
  removedPhotos?: string[]
}

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

interface ExistingPhoto {
  id: string
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
    initial && initial.types.length > 0 ? initial.types : ['food'],
  )
  const [memo, setMemo] = useState(() => initial?.memo ?? '')
  const [newPhotos, setNewPhotos] = useState<Blob[]>([])
  const [existingPhotos, setExistingPhotos] = useState<ExistingPhoto[]>([])
  const [removedPhotoIds, setRemovedPhotoIds] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const draftReady = useRef(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const draft = await loadDraft()
      if (cancelled) return
      const context = initial ? initial.id : 'add'
      if (draft && draft.applyTo === context && Date.now() - draft.savedAt <= DRAFT_TTL_MS) {
        setDatetime(draft.datetime)
        setCatId(draft.catId)
        if (draft.types.length > 0) setTypes(draft.types)
        setMemo(draft.memo)
        if (draft.newPhotos.length > 0) setNewPhotos(draft.newPhotos.map((p) => p.blob))
        setRemovedPhotoIds(draft.removedPhotos)
      } else if (draft && Date.now() - draft.savedAt > DRAFT_TTL_MS) {
        void deleteDraft()
      }
      draftReady.current = true
    })()
    return () => {
      cancelled = true
    }
  }, [initial])

  useEffect(() => {
    if (!initial || initial.photos.length === 0) return
    let cancelled = false
    void (async () => {
      const loaded: ExistingPhoto[] = []
      for (const id of initial.photos) {
        if (removedPhotoIds.includes(id)) continue
        const blob = await getPhoto(id)
        if (blob) loaded.push({ id, blob })
      }
      if (!cancelled) setExistingPhotos(loaded)
    })()
    return () => {
      cancelled = true
    }
  }, [initial, removedPhotoIds])

  useEffect(() => {
    if (!draftReady.current) return
    const draft: RecordDraft = {
      id: 'record',
      applyTo: initial ? initial.id : 'add',
      datetime,
      catId,
      types,
      memo,
      newPhotos: newPhotos.map((blob, i) => ({ id: `d${i}`, blob })),
      removedPhotos: removedPhotoIds,
      savedAt: Date.now(),
    }
    const t = setTimeout(() => void saveDraft(draft), DRAFT_SAVE_MS)
    return () => clearTimeout(t)
  }, [datetime, catId, types, memo, newPhotos, removedPhotoIds, initial])

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
    const added = Array.from(files).slice(0, MAX_PHOTOS - newPhotos.length - existingPhotos.length)
    if (added.length > 0) setNewPhotos((prev) => [...prev, ...added])
    if (fileRef.current) fileRef.current.value = ''
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!datetime || !catId || types.length === 0) return
    onSubmit({
      datetime: fromLocalDateTimeInput(datetime).toISOString(),
      catId,
      types,
      memo: memo.trim(),
      photos: newPhotos.length > 0 ? newPhotos : undefined,
      removedPhotos: removedPhotoIds.length > 0 ? removedPhotoIds : undefined,
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
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
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
              className="mt-2 min-h-11 rounded-lg bg-emerald-600 px-4 font-medium text-white hover:bg-emerald-700"
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
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
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
          className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2"
        />
      </label>

      <div>
        <span className="mb-1 block text-sm font-medium text-gray-600">
          사진 ({existingPhotos.length + newPhotos.length}/{MAX_PHOTOS})
        </span>
        <div className="flex flex-wrap gap-2">
          {existingPhotos.map((p) => (
            <PhotoPreview
              key={p.id}
              blob={p.blob}
              onRemove={() => {
                setExistingPhotos((prev) => prev.filter((x) => x.id !== p.id))
                setRemovedPhotoIds((prev) => (prev.includes(p.id) ? prev : [...prev, p.id]))
              }}
            />
          ))}
          {newPhotos.map((blob, i) => (
            <PhotoPreview
              key={i}
              blob={blob}
              onRemove={() => setNewPhotos((prev) => prev.filter((_, j) => j !== i))}
            />
          ))}
          {existingPhotos.length + newPhotos.length < MAX_PHOTOS && (
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
          className="rounded-lg bg-emerald-600 px-5 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
        >
          {initial ? '수정 저장' : '기록 추가'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-lg border border-gray-300 px-4 py-2 text-gray-600">
            취소
          </button>
        )}
      </div>
    </form>
  )
}

function useObjectUrl(blob: Blob | undefined): string | undefined {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!blob) return
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url
}

function PhotoPreview({ blob, onRemove }: { blob: Blob; onRemove: () => void }) {
  const src = useObjectUrl(blob)
  return (
    <div className="relative h-20 w-20">
      {src && <img src={src} alt="사진 미리보기" className="h-full w-full rounded-lg object-cover" />}
      <button
        type="button"
        onClick={onRemove}
        className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white"
        aria-label="사진 제거"
      >
        ✕
      </button>
    </div>
  )
}
