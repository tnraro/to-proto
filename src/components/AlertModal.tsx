import type { AlertEntry } from '../types'

interface Props {
  alerts: AlertEntry[]
  onClose: () => void
}

export function AlertModal({ alerts, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-bold text-red-600">⚠ 임계값 초과 경고</h2>
        <p className="mt-1 text-sm text-gray-500">기록 추가로 인해 다음 임계값을 초과했습니다</p>
        <ul className="mt-4 space-y-2">
          {alerts.map((a) => (
            <li key={a.id} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm">
              <div className="font-medium text-red-700">{a.catName}</div>
              <div className="text-red-600">
                {a.typeLabel} · {a.windowDays}일 내 {a.maxCount}회 초과 (현재 {a.count}회)
              </div>
            </li>
          ))}
        </ul>
        <button
          onClick={onClose}
          className="mt-5 w-full rounded-lg bg-red-600 py-2 font-medium text-white hover:bg-red-700"
        >
          확인
        </button>
      </div>
    </div>
  )
}
