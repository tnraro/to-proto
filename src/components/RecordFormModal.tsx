import type { Cat, VomitRecord } from '../types'
import { RecordForm, type RecordInput } from './RecordForm'

interface Props {
  open: boolean
  cats: Cat[]
  initial?: VomitRecord | null
  presetDate?: string | null
  onSubmit: (input: RecordInput) => void
  onCancel: () => void
  onAddCat: () => void
}

export function RecordFormModal({ open, cats, initial, presetDate, onSubmit, onCancel, onAddCat }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:rounded-xl sm:pb-5">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-200 sm:hidden" />
        <h2 className="mb-4 text-lg font-bold">{initial ? '기록 수정' : '토 기록 추가'}</h2>
        <RecordForm
          cats={cats}
          initial={initial}
          presetDate={presetDate}
          onSubmit={onSubmit}
          onCancel={onCancel}
          onAddCat={onAddCat}
        />
      </div>
    </div>
  )
}
