import { useEffect, useRef, useState } from 'react'
import type { Cat, VomitRecord, VomitType } from '../types'
import { VOMIT_TYPE_KEYS, VOMIT_TYPES } from '../types'
import { fromLocalDateTimeInput, toLocalDateTimeInput } from '../lib/dates'
import { getPhoto } from '../lib/storage'

export type RecordInput = Omit<VomitRecord, 'id' | 'createdAt' | 'updatedAt' | 'photos'> & {
  photos?: Blob[]
  removedPhotos?: string[]
}

const MAX_PHOTOS = 6

interface Props {
  cats: Cat[]
  initial?: VomitRecord | null
  onSubmit: (input: RecordInput) => void
  onCancel?: () => void
}

interface ExistingPhoto {
  id: string
  blob: Blob
}

export function RecordForm({ cats, initial, onSubmit, onCancel }: Props) {
  const now = new Date()
  const [datetime, setDatetime] = useState(() =>
    initial ? toLocalDateTimeInput(new Date(initial.datetime)) : toLocalDateTimeInput(now),
  )
  const [catId, setCatId] = useState(() => initial?.catId ?? cats[0]?.id ?? '')
  const [types, setTypes] = useState<VomitType[]>(() =>
    initial && initial.types.length > 0 ? initial.types : ['food'],
  )
  const [memo, setMemo] = useState(() => initial?.memo ?? '')
  const [newPhotos, setNewPhotos] = useState<Blob[]>([])
  const [existingPhotos, setExistingPhotos] = useState<ExistingPhoto[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!initial || initial.photos.length === 0) return
    let cancelled = false
    void (async () => {
      const loaded: ExistingPhoto[] = []
      for (const id of initial.photos) {
        const blob = await getPhoto(id)
        if (blob) loaded.push({ id, blob })
      }
      if (!cancelled) setExistingPhotos(loaded)
    })()
    return () => {
      cancelled = true
    }
  }, [initial])

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
      removedPhotos:
        initial && initial.photos.filter((id) => !existingPhotos.some((p) => p.id === id)).length > 0
          ? initial.photos.filter((id) => !existingPhotos.some((p) => p.id === id))
          : undefined,
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
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
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-600">고양이</span>
          <select
            value={catId}
            onChange={(e) => setCatId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
            required
          >
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            {cats.length === 0 && <option value="">고양이를 먼저 등록하세요</option>}
          </select>
        </label>
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
              onRemove={() => setExistingPhotos((prev) => prev.filter((x) => x.id !== p.id))}
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
