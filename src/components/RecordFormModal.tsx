import { useRef } from 'react'
import type { Cat, RecordInput, VomitRecord } from '../types'
import { RecordForm, type RecordFormHandle } from './RecordForm'
import { Modal } from './ui/Modal'

interface Props {
  open: boolean
  cats: Cat[]
  initial?: VomitRecord | null
  presetDate?: string | null
  onSubmit: (input: RecordInput) => void
  /** Close callback (confirm/draft discard are handled inside RecordForm) */
  onClose: () => void
  onAddCat: () => void
}

export function RecordFormModal({ open, cats, initial, presetDate, onSubmit, onClose, onAddCat }: Props) {
  const formRef = useRef<RecordFormHandle | null>(null)

  return (
    <Modal open={open} onClose={() => formRef.current?.requestClose()} contentClassName="max-h-[85vh] overflow-y-auto">
      <h2 className="mb-4 text-lg font-bold">{initial ? '기록 수정' : '토 기록 추가'}</h2>
      <RecordForm
        ref={formRef}
        cats={cats}
        initial={initial}
        presetDate={presetDate}
        onSubmit={onSubmit}
        onClose={onClose}
        onAddCat={onAddCat}
      />
    </Modal>
  )
}
