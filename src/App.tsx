import { useState } from 'react'
import { useRoute, Router, useLocation } from 'wouter'
import { useHashLocation } from 'wouter/use-hash-location'
import { useStore } from './hooks/useStore'
import { useFormOpener } from './hooks/useFormOpener'
import { type MarkerInput, type RecordInput, type MarkerDraft, type RecordDraft } from './types'
import { formDatetimeInput } from './lib/dates'
import { RecordBrowser } from './components/RecordBrowser'
import { RecordFormModal } from './components/RecordFormModal'
import { type RecordFormValues } from './components/RecordForm'
import { MarkerFormModal, type MarkerFormValues } from './components/MarkerFormModal'
import { CalendarView } from './components/CalendarView'
import { StatsView } from './components/StatsView'
import { AlertModal } from './components/AlertModal'
import { CatFormModal } from './components/CatFormModal'
import { Onboarding } from './components/Onboarding'
import { ThresholdManager } from './components/ThresholdManager'
import { SettingsView } from './components/SettingsView'
import { AppHeader } from './components/AppHeader'
import { DropdownMenu } from './components/ui/DropdownMenu'
import { useFeatureFlag } from './hooks/useFeatureFlag'
import type { AlertEntry, Marker, VomitRecord } from './types'

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
  const isDefaultTab = !matchRecord && !matchCalendar && !matchStats && !matchAlert && !matchSettings
  const [calendarDate, setCalendarDate] = useState<string | null>(null)
  const [modalAlerts, setModalAlerts] = useState<AlertEntry[]>([])
  const [catModalOpen, setCatModalOpen] = useState(false)
  // Experiment (feature flag)
  const [showRecordCount, setShowRecordCount] = useFeatureFlag('calendar.recordCount', false)

  const recordOpener = useFormOpener<VomitRecord, RecordFormValues, RecordDraft>('record')
  const markerOpener = useFormOpener<Marker, MarkerFormValues, MarkerDraft>('marker')

  const {
    cats,
    records,
    addCat,
    addRecord,
    updateRecord,
    deleteRecord,
    alertLog,
    currentCatId,
    setCurrentCat,
    markers,
    markerTypes,
    addMarker,
    updateMarker,
    deleteMarker,
    addMarkerType,
  } = store

  const activeTab: Tab = TABS.find((t) => `/${t.id}` === path)?.id ?? 'calendar'

  const catFilteredRecords = currentCatId ? records.filter((r) => r.catId === currentCatId) : records
  const catFilteredMarkers = currentCatId ? markers.filter((m) => m.catIds.includes(currentCatId)) : markers

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

  const openRecordForm = (target: VomitRecord | null = null, presetDate: string | null = null) => {
    void recordOpener.open({
      target,
      values: (t, draft, now) => ({
        datetime: formDatetimeInput(draft?.datetime || t?.datetime, presetDate, now),
        catId: draft?.catId ?? t?.catId ?? cats[0]?.id ?? '',
        types: draft?.types ?? t?.types ?? [],
        memo: draft?.memo ?? t?.memo ?? '',
      }),
      photoIds: (t) => t?.photos ?? [],
    })
  }

  const openAddFromFAB = () => {
    if (activeTab === 'calendar' && calendarDate) {
      openRecordForm(null, calendarDate)
    } else {
      openRecordForm()
    }
  }

  const openMarkerForm = (target: Marker | null = null, presetDate: string | null = null) => {
    void markerOpener.open({
      target,
      values: (t, draft, now) => ({
        datetime: formDatetimeInput(draft?.datetime || t?.datetime, presetDate, now),
        typeId: draft?.typeId ?? t?.typeId ?? markerTypes[0]?.id ?? '',
        catIds: draft?.catIds ?? t?.catIds ?? [],
        memo: draft?.memo ?? t?.memo ?? '',
      }),
      photoIds: (t) => t?.photos ?? [],
    })
  }

  const handleMarkerSubmit = async (input: MarkerInput) => {
    const context = markerOpener.state?.context
    if (context && context !== 'add') {
      await updateMarker(context, input)
    } else {
      await addMarker(input)
    }
    markerOpener.close()
  }

  const handleSubmit = async (input: RecordInput) => {
    const context = recordOpener.state?.context
    if (context && context !== 'add') {
      await updateRecord(context, input)
    } else {
      const newAlerts = await addRecord(input)
      if (newAlerts.length > 0) setModalAlerts(newAlerts)
    }
    recordOpener.close()
  }

  const handleEdit = (r: VomitRecord) => {
    openRecordForm(r)
  }

  const handleDelete = (id: string) => {
    if (confirm('기록을 삭제할까요?')) deleteRecord(id)
  }

  const handleEditMarker = (marker: Marker) => {
    openMarkerForm(marker)
  }

  const handleDeleteMarker = (id: string) => {
    if (confirm('마커를 삭제할까요?')) deleteMarker(id)
  }

  const calendarView = (
    <CalendarView
      records={catFilteredRecords}
      cats={cats}
      markers={catFilteredMarkers}
      markerTypes={markerTypes}
      showRecordCount={showRecordCount}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onEditMarker={handleEditMarker}
      onDeleteMarker={handleDeleteMarker}
      onSelectedDateChange={setCalendarDate}
    />
  )

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-gray-100 text-gray-900">
      <AppHeader cats={cats} currentCatId={currentCatId} onChange={setCurrentCat} />
      <main className="no-scrollbar relative mx-auto min-h-0 w-full max-w-3xl flex-1 overflow-y-auto overscroll-contain">
        {matchRecord && (
          <RecordBrowser
            records={records}
            cats={cats}
            markers={markers}
            markerTypes={markerTypes}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onEditMarker={handleEditMarker}
            onDeleteMarker={handleDeleteMarker}
          />
        )}
        {(matchCalendar || isDefaultTab) && calendarView}
        {matchStats && <StatsView records={catFilteredRecords} />}
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
          <SettingsView
            {...store}
            onAddCat={openCatModal}
            onNavigate={(t) => navigate(`/${t}`)}
            showRecordCount={showRecordCount}
            onShowRecordCountChange={setShowRecordCount}
          />
        )}
      </main>

      {(activeTab === 'record' || activeTab === 'calendar') && (
        <DropdownMenu
          ariaLabel="추가 메뉴"
          placement="top"
          items={[
            { label: '구토 기록 추가', onClick: openAddFromFAB },
            { label: '마커 추가', onClick: () => openMarkerForm(null, activeTab === 'calendar' ? calendarDate : null) },
          ]}
          renderTrigger={(toggle, ref) => (
            <button
              ref={ref}
              type="button"
              onClick={toggle}
              className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-white shadow-[0_8px_20px_rgba(5,150,105,0.45),0_2px_6px_rgba(0,0,0,0.15)] active:scale-95 active:shadow-[0_4px_10px_rgba(5,150,105,0.35)]"
            >
              +
            </button>
          )}
        />
      )}

      <RecordFormModal
        cats={cats}
        initial={recordOpener.state}
        onSubmit={handleSubmit}
        onClose={recordOpener.close}
        onAddCat={openCatModal}
      />

      <MarkerFormModal
        markerTypes={markerTypes}
        cats={cats}
        initial={markerOpener.state}
        onSubmit={handleMarkerSubmit}
        onClose={markerOpener.close}
        onAddMarkerType={addMarkerType}
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
