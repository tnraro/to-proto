import type { AlertEntry } from '../types'

interface Props {
  alerts: AlertEntry[]
  onClose: () => void
}

export function AlertModal({ alerts, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:rounded-xl sm:pb-5">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-200 sm:hidden" />
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
          className="mt-5 min-h-11 w-full rounded-lg bg-red-600 font-medium text-white hover:bg-red-700"
        >
          확인
        </button>
      </div>
    </div>
  )
}
