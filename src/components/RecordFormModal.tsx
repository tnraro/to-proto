import { useRef } from 'react'
import type { Cat, RecordInput } from '../types'
import type { FormOpenState } from '../hooks/useFormOpener'
import { RecordForm, type RecordFormHandle, type RecordFormValues } from './RecordForm'
import { Modal } from './ui/Modal'

interface Props {
  cats: Cat[]
  initial: FormOpenState<RecordFormValues> | null
  onSubmit: (input: RecordInput) => void
  /** Close callback (confirm/draft discard are handled inside RecordForm) */
  onClose: () => void
  onAddCat: () => void
}

export function RecordFormModal({ cats, initial, onSubmit, onClose, onAddCat }: Props) {
  const formRef = useRef<RecordFormHandle | null>(null)
  if (!initial) return null
  return (
    <Modal open onClose={() => formRef.current?.requestClose()} contentClassName="max-h-[85vh] overflow-y-auto">
      <h2 className="mb-4 text-lg font-bold">{initial.context !== 'add' ? '기록 수정' : '토 기록 추가'}</h2>
      <RecordForm
        ref={formRef}
        cats={cats}
        initial={initial}
        onSubmit={onSubmit}
        onClose={onClose}
        onAddCat={onAddCat}
      />
    </Modal>
  )
}
