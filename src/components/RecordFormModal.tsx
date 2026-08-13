import type { Cat, VomitRecord } from '../types'
import { RecordForm, type RecordInput } from './RecordForm'
import { Modal } from './Modal'

interface Props {
  open: boolean
  cats: Cat[]
  initial?: VomitRecord | null
  presetDate?: string | null
  onSubmit: (input: RecordInput) => void
  /** 취소 버튼: draft 삭제 후 닫기 */
  onCancel: () => void
  /** Esc/백드롭 등 암묵적 닫기: draft 유지 */
  onClose: () => void
  onAddCat: () => void
}

export function RecordFormModal({
  open,
  cats,
  initial,
  presetDate,
  onSubmit,
  onCancel,
  onClose,
  onAddCat,
}: Props) {
  return (
    <Modal open={open} onClose={onClose} contentClassName="max-h-[85vh] overflow-y-auto">
      <h2 className="mb-4 text-lg font-bold">{initial ? '기록 수정' : '토 기록 추가'}</h2>
      <RecordForm
        cats={cats}
        initial={initial}
        presetDate={presetDate}
        onSubmit={onSubmit}
        onCancel={onCancel}
        onAddCat={onAddCat}
      />
    </Modal>
  )
}
