import { useState } from 'react'
import type { Store } from '../hooks/useStore'
import { CatManager } from './CatManager'
import { MarkerTypeManager } from './MarkerTypeManager'
import { Card } from './ui/Card'
import { applyUpdate, checkForUpdate, usePwaStatus } from '../lib/pwa'

type NavTab = 'record' | 'calendar' | 'stats' | 'alert' | 'settings'

export function SettingsView({
  cats,
  records,
  rules,
  alertLog,
  markers,
  markerTypes,
  resetAll,
  renameCat,
  updateCatPhoto,
  deleteCat,
  addMarkerType,
  renameMarkerType,
  deleteMarkerType,
  onAddCat,
  onNavigate,
  showRecordCount,
  onShowRecordCountChange,
}: Store & {
  onAddCat: () => void
  onNavigate: (tab: NavTab) => void
  showRecordCount: boolean
  onShowRecordCountChange: (v: boolean) => void
}) {
  const [confirming, setConfirming] = useState(false)
  const pwaStatus = usePwaStatus()

  return (
    <div className="space-y-6 p-4">
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-600">고양이 관리</h2>
        <CatManager cats={cats} renameCat={renameCat} updateCatPhoto={updateCatPhoto} deleteCat={deleteCat} onAddCat={onAddCat} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-600">마커 종류 관리</h2>
        <MarkerTypeManager
          markerTypes={markerTypes}
          markersCountByType={(typeId) => markers.filter((m) => m.typeId === typeId).length}
          addMarkerType={addMarkerType}
          renameMarkerType={renameMarkerType}
          deleteMarkerType={deleteMarkerType}
        />
      </section>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">데이터 현황</h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="고양이" value={cats.length} onClick={() => onNavigate('settings')} />
          <Stat label="기록" value={records.length} onClick={() => onNavigate('record')} />
          <Stat label="규칙" value={rules.length} onClick={() => onNavigate('alert')} />
          <Stat label="경고 이력" value={alertLog.length} onClick={() => onNavigate('alert')} />
        </dl>
        <p className="mt-3 text-xs text-gray-400">데이터는 이 기기에만 저장됩니다</p>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">업데이트</h2>
        {pwaStatus === 'update-ready' && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-gray-600">새 버전이 준비되었습니다</p>
            <button
              onClick={applyUpdate}
              className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
            >
              업데이트 설치
            </button>
          </div>
        )}
        {pwaStatus === 'up-to-date' && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-gray-600">최신 버전입니다</p>
            <button
              onClick={() => void checkForUpdate()}
              className="shrink-0 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              업데이트 확인
            </button>
          </div>
        )}
        {pwaStatus === 'unsupported' && (
          <p className="text-sm text-gray-400">이 브라우저에서는 업데이트 확인을 지원하지 않습니다</p>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">실험</h2>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-600">캘린더 일자 표시 — 토 N회 (실험)</p>
          <button
            type="button"
            role="switch"
            aria-checked={showRecordCount}
            onClick={() => onShowRecordCountChange(!showRecordCount)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${
              showRecordCount ? 'bg-primary' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
                showRecordCount ? 'left-[calc(100%-1.625rem)]' : 'left-0.5'
              }`}
            />
          </button>
        </div>
      </Card>

      <section className="rounded-card border border-red-200 bg-red-50 p-4">
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

function Stat({ label, value, onClick }: { label: string; value: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg bg-gray-50 px-3 py-2.5 text-center hover:bg-gray-100"
    >
      <div className="text-lg font-bold text-gray-800">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </button>
  )
}
