import { useState } from 'react'
import type { Cat, VomitRecord, VomitType } from '../types'
import { VOMIT_TYPE_KEYS, VOMIT_TYPES } from '../types'
import { fromLocalDateTimeInput, toLocalDateTimeInput } from '../lib/dates'

export type RecordInput = Omit<VomitRecord, 'id' | 'createdAt' | 'updatedAt'>

interface Props {
  cats: Cat[]
  initial?: VomitRecord | null
  onSubmit: (input: RecordInput) => void
  onCancel?: () => void
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

  const toggleType = (k: VomitType) => {
    setTypes((prev) => (prev.includes(k) ? prev.filter((t) => t !== k) : [...prev, k]))
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!datetime || !catId || types.length === 0) return
    onSubmit({
      datetime: fromLocalDateTimeInput(datetime).toISOString(),
      catId,
      types,
      memo: memo.trim(),
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
