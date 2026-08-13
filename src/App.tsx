import { useState } from 'react'
import { useStore } from './hooks/useStore'
import { type RecordInput } from './components/RecordForm'
import { RecordList } from './components/RecordList'
import { RecordFormModal } from './components/RecordFormModal'
import { CalendarView } from './components/CalendarView'
import { StatsView } from './components/StatsView'
import { AlertModal } from './components/AlertModal'
import { CatFormModal } from './components/CatFormModal'
import { Onboarding } from './components/Onboarding'
import { ThresholdManager } from './components/ThresholdManager'
import { SettingsView } from './components/SettingsView'
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
  const store = useStore()
  const [tab, setTab] = useState<Tab>('record')
  const [formOpen, setFormOpen] = useState(false)
  const [formInitial, setFormInitial] = useState<VomitRecord | null>(null)
  const [formPresetDate, setFormPresetDate] = useState<string | null>(null)
  const [calendarDate, setCalendarDate] = useState<string | null>(null)
  const [modalAlerts, setModalAlerts] = useState<AlertEntry[]>([])
  const [catModalOpen, setCatModalOpen] = useState(false)

  const { cats, records, addCat, addRecord, updateRecord, deleteRecord, alertLog } = store

  const openCatModal = () => setCatModalOpen(true)
  const handleCatAdd = (name: string) => {
    addCat(name)
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
        onFinish={(names) => {
          for (const n of names) addCat(n)
        }}
      />
    )
  }

  const catName = (id: string) => cats.find((c) => c.id === id)?.name ?? '?'

  const openRecordForm = (initial: VomitRecord | null = null, presetDate: string | null = null) => {
    setFormInitial(initial)
    setFormPresetDate(presetDate)
    setFormOpen(true)
  }

  const openAddFromFAB = () => {
    if (tab === 'calendar' && calendarDate) {
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

  const handleSubmit = async (input: RecordInput) => {
    if (formInitial) {
      await updateRecord(formInitial.id, input)
    } else {
      const newAlerts = await addRecord(input)
      if (newAlerts.length > 0) setModalAlerts(newAlerts)
    }
    closeRecordForm()
    setTab('record')
  }

  const handleEdit = (r: VomitRecord) => {
    openRecordForm(r)
  }

  const recent = records.slice(0, 30)

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-2.5">
          <h1 className="text-base font-bold">
            고양이 토 기록
            <span className="ml-2 text-xs font-normal text-gray-400">총 {records.length}회</span>
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-32 pt-4 sm:pt-6">
        {tab === 'record' && (
          <div className="space-y-6">
            <section>
              <h2 className="mb-2 text-sm font-semibold text-gray-600">최근 기록</h2>
              <RecordList
                records={recent}
                cats={cats}
                onEdit={handleEdit}
                onDelete={(id) => {
                  if (confirm('기록을 삭제할까요?')) deleteRecord(id)
                }}
                catNameFor={catName}
              />
            </section>
          </div>
        )}

        {tab === 'calendar' && (
          <CalendarView
            records={records}
            cats={cats}
            onEdit={handleEdit}
            onDelete={deleteRecord}
            onSelectedDateChange={setCalendarDate}
          />
        )}

        {tab === 'stats' && <StatsView records={records} cats={cats} />}

        {tab === 'alert' && <ThresholdManager cats={cats} rules={store.rules} alertLog={alertLog} addRule={store.addRule} updateRule={store.updateRule} deleteRule={store.deleteRule} deleteAlert={store.deleteAlert} clearAlerts={store.clearAlerts} />}

        {tab === 'settings' && <SettingsView {...store} onAddCat={openCatModal} />}
      </main>

      <CatFormModal open={catModalOpen} onClose={() => setCatModalOpen(false)} onAdd={handleCatAdd} />

      <RecordFormModal
        open={formOpen}
        cats={cats}
        initial={formInitial}
        presetDate={formPresetDate}
        onSubmit={handleSubmit}
        onCancel={closeRecordForm}
        onAddCat={openCatModal}
      />

      <button
        onClick={openAddFromFAB}
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-40 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 active:scale-95"
      >
        기록 추가
      </button>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-3xl grid-cols-5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs ${
                tab === t.id ? 'font-semibold text-emerald-600' : 'text-gray-500'
              }`}
            >
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
