import { useState } from 'react'
import type { Store } from '../hooks/useStore'

export function SettingsView({ cats, records, rules, alertLog, resetAll }: Store) {
  const [confirming, setConfirming] = useState(false)

  let storageBytes = 0
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('to.')) {
      storageBytes += (localStorage.getItem(key)?.length ?? 0) * 2
    }
  }
  const storageUsage = (storageBytes / 1024).toFixed(1)

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-600">데이터 현황</h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="고양이" value={cats.length} />
          <Stat label="기록" value={records.length} />
          <Stat label="규칙" value={rules.length} />
          <Stat label="경고 이력" value={alertLog.length} />
        </dl>
        <p className="mt-3 text-xs text-gray-400">localStorage 사용량: 약 {storageUsage} KB</p>
      </section>

      <section className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-red-700">데이터 초기화</h2>
        <p className="mb-3 text-sm text-red-600">
          모든 기록, 고양이, 규칙, 경고 이력이 영구 삭제됩니다. 되돌릴 수 없습니다.
        </p>
        {confirming ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                resetAll()
                setConfirming(false)
              }}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              정말 삭제합니다
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-600"
            >
              취소
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
          >
            데이터 초기화
          </button>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2 text-center">
      <div className="text-lg font-bold text-gray-800">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  )
}
