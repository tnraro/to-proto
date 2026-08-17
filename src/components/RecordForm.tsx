import { useEffect, useState, type Ref } from 'react'
import { useImperativeHandle } from 'react'
import { useFormDraft } from '../hooks/useFormDraft'
import type { FormOpenState } from '../hooks/useFormOpener'
import type { Cat, RecordDraft, RecordInput, VomitType } from '../types'
import { VOMIT_TYPE_KEYS, VOMIT_TYPES } from '../types'
import { fromLocalDateTimeInput } from '../lib/dates'
import { PhotoSection } from './ui/PhotoSection'

export interface RecordFormValues {
  datetime: string
  catId: string
  types: VomitType[]
  memo: string
}

interface Props {
  cats: Cat[]
  initial: FormOpenState<RecordFormValues>
  onSubmit: (input: RecordInput) => Promise<void> | void
  /** Close callback (confirm/draft discard are handled inside the form) */
  onClose: () => void
  onAddCat: () => void
}

export interface RecordFormHandle {
  requestClose: () => void
}

export function RecordForm({ cats, initial, onSubmit, onClose, onAddCat, ref }: Props & { ref?: Ref<RecordFormHandle> }) {
  const [datetime, setDatetime] = useState(initial.values.datetime)
  const [catId, setCatId] = useState(initial.values.catId)
  const [types, setTypes] = useState<VomitType[]>(initial.values.types)
  const [memo, setMemo] = useState(initial.values.memo)
  const [photoItems, setPhotoItems] = useState(initial.photoItems)

  if (cats.length > 0 && !cats.some((c) => c.id === catId)) {
    setCatId(cats[cats.length - 1].id)
  }

  const { hasDraft, onStateChange, discard } = useFormDraft<RecordDraft>(
    'record',
    [datetime, catId, types, memo, photoItems],
    () => ({
      applyTo: initial.context,
      datetime,
      catId,
      types,
      memo,
      newPhotos: photoItems.filter((p) => !p.id).map((p, i) => ({ id: `d${i}`, blob: p.blob })),
      removedPhotos: initial.originalPhotoIds.filter((id) => !photoItems.some((p) => p.id === id)),
    }),
  )

  useEffect(() => {
    onStateChange()
  }, [datetime, catId, types, memo, photoItems, onStateChange])

  const requestClose = () => {
    if (hasDraft && !confirm('정말 나가시겠습니까? 작성 중인 내용은 저장되지 않습니다')) return
    discard()
    onClose()
  }

  useImperativeHandle(ref, () => ({ requestClose }))

  const toggleType = (k: VomitType) => {
    setTypes((prev) => (prev.includes(k) ? prev.filter((t) => t !== k) : [...prev, k]))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!datetime || !catId || types.length === 0) return
    try {
      await onSubmit({
        datetime: fromLocalDateTimeInput(datetime).toISOString(),
        catId,
        types,
        memo: memo.trim(),
        photos: photoItems.length > 0 ? photoItems.map((p) => (p.id ?? p.blob)) : undefined,
      })
      discard()
    } catch {
      alert('저장에 실패했습니다. 다시 시도해 주세요')
    }
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
            className="w-full min-w-0 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus:border-primary focus:bg-white focus:outline-none"
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
        <span className="mb-1 block text-sm font-medium text-gray-600">사진</span>
        <PhotoSection items={photoItems} onChange={setPhotoItems} />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!catId || !datetime || types.length === 0}
          className="rounded-lg bg-primary px-5 py-2 font-medium text-white hover:bg-primary-hover disabled:opacity-40"
        >
          {initial.context !== 'add' ? '수정 저장' : '기록 추가'}
        </button>
        <button type="button" onClick={requestClose} className="rounded-lg border border-gray-200 px-4 py-2 text-gray-600">
          취소
        </button>
      </div>
    </form>
  )
}
