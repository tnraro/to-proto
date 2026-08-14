import type { AlertEntry } from '../types'
import { Modal } from './ui/Modal'

interface Props {
  alerts: AlertEntry[]
  onClose: () => void
}

export function AlertModal({ alerts, onClose }: Props) {
  return (
    <Modal
      open={alerts.length > 0}
      onClose={onClose}
      drawer={false}
      contentClassName="max-h-[80vh] overflow-y-auto"
    >
      <h2 className="text-lg font-bold text-red-600">⚠ 임계값 이상 경고</h2>
      <p className="mt-1 text-sm text-gray-500">기록 추가로 인해 다음 임계값 이상이 되었습니다</p>
      <ul className="mt-4 space-y-2">
        {alerts.map((a) => (
          <li key={a.id} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm">
            <div className="font-medium text-red-700">{a.catName}</div>
            <div className="text-red-600">
              {a.typeLabel} · {a.windowDays}일 내 {a.maxCount}회 이상 (현재 {a.count}회)
            </div>
          </li>
        ))}
      </ul>
      <button
        onClick={onClose}
        className="mt-5 min-h-11 w-full rounded-lg bg-red-600 font-medium text-white hover:bg-red-700"
      >
        확인
      </button>
    </Modal>
  )
}
