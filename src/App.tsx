import { useState } from 'react'
import { useRoute, Router, useLocation } from 'wouter'
import { useHashLocation } from 'wouter/use-hash-location'
import { useStore } from './hooks/useStore'
import { type RecordInput } from './types'
import { RecordBrowser } from './components/RecordBrowser'
import { RecordFormModal } from './components/RecordFormModal'
import { CalendarView } from './components/CalendarView'
import { StatsView } from './components/StatsView'
import { AlertModal } from './components/AlertModal'
import { CatFormModal } from './components/CatFormModal'
import { Onboarding } from './components/Onboarding'
import { ThresholdManager } from './components/ThresholdManager'
import { SettingsView } from './components/SettingsView'
import { deleteDraft } from './lib/storage'
import type { AlertEntry, VomitRecord } from './types'

type Tab = 'record' | 'calendar' | 'stats' | 'alert' | 'settings'

const TABS: { id: Tab; label: string }[] = [
  { id: 'record', label: '기록' },
  { id: 'calendar', label: '캘린더' },
  { id: 'stats', label: '통계' },
  { id: 'alert', label: '경고' },
  { id: 'settings', label: '설정' },
]

export default function App() {
  return (
    <Router hook={useHashLocation}>
      <Shell />
    </Router>
  )
}

function Shell() {
  const store = useStore()
  const [path, navigate] = useLocation()
  const [matchRecord] = useRoute('/record')
  const [matchCalendar] = useRoute('/calendar')
  const [matchStats] = useRoute('/stats')
  const [matchAlert] = useRoute('/alert')
  const [matchSettings] = useRoute('/settings')
  // 알 수 없는 경로 → 기본 탭(캘린더) 폴백
  const isDefaultTab = !matchRecord && !matchCalendar && !matchStats && !matchAlert && !matchSettings
  const [formOpen, setFormOpen] = useState(false)
  const [formInitial, setFormInitial] = useState<VomitRecord | null>(null)
  const [formPresetDate, setFormPresetDate] = useState<string | null>(null)
  const [calendarDate, setCalendarDate] = useState<string | null>(null)
  const [modalAlerts, setModalAlerts] = useState<AlertEntry[]>([])
  const [catModalOpen, setCatModalOpen] = useState(false)

  const { cats, records, addCat, addRecord, updateRecord, deleteRecord, alertLog } = store

  // 잘못된/빈 경로는 캘린더로 폴백 (기본 탭)
  const activeTab: Tab = TABS.find((t) => `/${t.id}` === path)?.id ?? 'calendar'

  const openCatModal = () => setCatModalOpen(true)
  const handleCatAdd = (name: string, photoId?: string) => {
    addCat(name, photoId)
    setCatModalOpen(false)
  }

  if (!store.hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-400">
        로딩 중...
      </div>
    )
  }

  if (cats.length === 0) {
    return (
      <Onboarding
        onFinish={(cats) => {
          for (const c of cats) addCat(c.name, c.photoId)
        }}
      />
    )
  }

  const openRecordForm = (initial: VomitRecord | null = null, presetDate: string | null = null) => {
    setFormInitial(initial)
    setFormPresetDate(presetDate)
    setFormOpen(true)
  }

  const openAddFromFAB = () => {
    if (activeTab === 'calendar' && calendarDate) {
      openRecordForm(null, calendarDate)
    } else {
      openRecordForm()
    }
  }

  const closeRecordForm = () => {
    setFormOpen(false)
    setFormInitial(null)
    setFormPresetDate(null)
  }

  /** 취소 버튼: draft 삭제 후 닫기 */
  const cancelRecordForm = () => {
    void deleteDraft()
    closeRecordForm()
  }

  const handleSubmit = async (input: RecordInput) => {
    if (formInitial) {
      await updateRecord(formInitial.id, input)
    } else {
      const newAlerts = await addRecord(input)
      if (newAlerts.length > 0) setModalAlerts(newAlerts)
    }
    void deleteDraft()
    closeRecordForm()
  }

  const handleEdit = (r: VomitRecord) => {
    openRecordForm(r)
  }

  const handleDelete = (id: string) => {
    if (confirm('기록을 삭제할까요?')) deleteRecord(id)
  }

  // 기본 탭(캘린더) 폴백과 /calendar 라우트가 같은 뷰를 공유
  const calendarView = (
    <CalendarView
      records={records}
      cats={cats}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onSelectedDateChange={setCalendarDate}
    />
  )

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-gray-100 text-gray-900">
      <main className="no-scrollbar relative mx-auto min-h-0 w-full max-w-3xl flex-1 overflow-y-auto">
        {matchRecord && (
          <RecordBrowser
            records={records}
            cats={cats}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
        {(matchCalendar || isDefaultTab) && calendarView}
        {matchStats && <StatsView records={records} cats={cats} />}
        {matchAlert && (
          <ThresholdManager
            cats={cats}
            rules={store.rules}
            alertLog={alertLog}
            addRule={store.addRule}
            updateRule={store.updateRule}
            deleteRule={store.deleteRule}
            deleteAlert={store.deleteAlert}
            clearAlerts={store.clearAlerts}
          />
        )}
        {matchSettings && (
          <SettingsView {...store} onAddCat={openCatModal} onNavigate={(t) => navigate(`/${t}`)} />
        )}
      </main>

      <button
        onClick={openAddFromFAB}
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-40 flex items-center gap-1.5 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(5,150,105,0.45),0_2px_6px_rgba(0,0,0,0.15)] active:scale-95 active:shadow-[0_4px_10px_rgba(5,150,105,0.35)]"
      >
        <span className="text-base leading-none">+</span>
        기록 추가
      </button>

      <RecordFormModal
        open={formOpen}
        cats={cats}
        initial={formInitial}
        presetDate={formPresetDate}
        onSubmit={handleSubmit}
        onCancel={cancelRecordForm}
        onClose={closeRecordForm}
        onAddCat={openCatModal}
      />

      <CatFormModal open={catModalOpen} onClose={() => setCatModalOpen(false)} onAdd={handleCatAdd} />

      <nav className="shrink-0 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-3xl grid-cols-5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => navigate(`/${t.id}`)}
              className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs ${
                activeTab === t.id ? 'font-semibold text-primary' : 'text-gray-500'
              }`}
            >
              {activeTab === t.id && (
                <span className="absolute top-1 h-1 w-5 rounded-full bg-primary" />
              )}
              {t.label}
              {t.id === 'alert' && alertLog.length > 0 && (
                <span className="rounded-full bg-red-100 px-1.5 py-px text-[10px] font-medium text-red-600">
                  {alertLog.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {modalAlerts.length > 0 && <AlertModal alerts={modalAlerts} onClose={() => setModalAlerts([])} />}
    </div>
  )
}
