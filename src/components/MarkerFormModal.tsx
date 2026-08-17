import { useEffect, useRef, useState, type Ref } from 'react'
import { useImperativeHandle } from 'react'
import type { Cat, MarkerDraft, MarkerInput, MarkerType } from '../types'
import { fromLocalDateTimeInput } from '../lib/dates'
import { catExists, markerTypeExists } from '../lib/storage'
import { useFormDraft } from '../hooks/useFormDraft'
import type { FormOpenState } from '../hooks/useFormOpener'
import { Modal } from './ui/Modal'
import { PhotoSection } from './ui/PhotoSection'

export interface MarkerFormValues {
  datetime: string
  typeId: string
  catIds: string[]
  memo: string
}

interface Props {
  markerTypes: MarkerType[]
  cats: Cat[]
  initial: FormOpenState<MarkerFormValues> | null
  onSubmit: (input: MarkerInput) => void | Promise<void>
  onClose: () => void
  onAddMarkerType: (name: string) => string
  refresh: () => Promise<void>
}

interface MarkerFormHandle {
  requestClose: () => void
}

export function MarkerFormModal({ markerTypes, cats, initial, onSubmit, onClose, onAddMarkerType, refresh }: Props) {
  const contentRef = useRef<MarkerFormHandle | null>(null)
  if (!initial) return null
  return (
    <Modal open onClose={() => contentRef.current?.requestClose()} contentClassName="max-h-[85vh] overflow-y-auto">
      <MarkerFormContent
        ref={contentRef}
        markerTypes={markerTypes}
        cats={cats}
        initial={initial}
        onSubmit={onSubmit}
        onClose={onClose}
        onAddMarkerType={onAddMarkerType}
        refresh={refresh}
      />
    </Modal>
  )
}

function MarkerFormContent({
  markerTypes,
  cats,
  initial,
  onSubmit,
  onClose,
  onAddMarkerType,
  refresh,
  ref,
}: Omit<Props, 'initial'> & { initial: FormOpenState<MarkerFormValues>; ref?: Ref<MarkerFormHandle> }) {
  const [datetime, setDatetime] = useState(initial.values.datetime)
  const [typeId, setTypeId] = useState(initial.values.typeId)
  const [catIds, setCatIds] = useState<string[]>(initial.values.catIds)
  const [memo, setMemo] = useState(initial.values.memo)
  const [photoItems, setPhotoItems] = useState(initial.photoItems)
  const [addingType, setAddingType] = useState(false)
  const [newTypeName, setNewTypeName] = useState('')
  const newTypeRef = useRef<HTMLInputElement>(null)

  const validCatIds = catIds.filter((id) => cats.some((c) => c.id === id))
  if (validCatIds.length !== catIds.length) {
    setCatIds(validCatIds)
  }
  if (typeId && !markerTypes.some((t) => t.id === typeId)) {
    setTypeId(markerTypes[0]?.id ?? '')
  }

  const { hasDraft, onStateChange, discard } = useFormDraft<MarkerDraft>(
    'marker',
    [datetime, typeId, catIds, memo, photoItems],
    () => ({
      applyTo: initial.context,
      datetime,
      typeId,
      catIds,
      memo,
      newPhotos: photoItems.filter((p) => !p.id).map((p, i) => ({ id: `d${i}`, blob: p.blob })),
      removedPhotos: initial.originalPhotoIds.filter((id) => !photoItems.some((p) => p.id === id)),
    }),
  )

  useEffect(() => {
    onStateChange()
  }, [datetime, typeId, catIds, memo, photoItems, onStateChange])

  const requestClose = () => {
    if (hasDraft && !confirm('정말 나가시겠습니까? 작성 중인 내용은 저장되지 않습니다')) return
    discard()
    onClose()
  }

  useImperativeHandle(ref, () => ({ requestClose }))

  const toggleCat = (id: string) => {
    setCatIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))
  }

  const addNewType = () => {
    const trimmed = newTypeName.trim()
    if (!trimmed) return
    setTypeId(onAddMarkerType(trimmed))
    setNewTypeName('')
    setAddingType(false)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!datetime || !typeId) return
    const [typeOk, catsOk] = await Promise.all([
      markerTypeExists(typeId),
      Promise.all(catIds.map(catExists)).then((rs) => rs.every(Boolean)),
    ])
    if (!typeOk) {
      await refresh()
      alert('삭제된 마커 종류입니다. 목록이 갱신되었으니 다시 선택해 주세요')
      return
    }
    if (!catsOk) {
      await refresh()
      alert('삭제된 고양이가 포함되어 있습니다. 목록이 갱신되었으니 다시 선택해 주세요')
      return
    }
    try {
      await onSubmit({
        datetime: fromLocalDateTimeInput(datetime).toISOString(),
        typeId,
        catIds,
        memo: memo.trim() || undefined,
        photos: photoItems.length > 0 ? photoItems.map((p) => p.id ?? p.blob) : undefined,
      })
      discard()
    } catch {
      alert('저장에 실패했습니다. 다시 시도해 주세요')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <h2 className="text-lg font-bold">{initial.context !== 'add' ? '마커 수정' : '마커 추가'}</h2>

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
        <PhotoSection items={photoItems} onChange={setPhotoItems} />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!datetime || !typeId}
          className="rounded-lg bg-primary px-5 py-2 font-medium text-white hover:bg-primary-hover disabled:opacity-40"
        >
          {initial.context !== 'add' ? '수정 저장' : '마커 추가'}
        </button>
        <button type="button" onClick={requestClose} className="rounded-lg border border-gray-200 px-4 py-2 text-gray-600">
          취소
        </button>
      </div>
    </form>
  )
}
