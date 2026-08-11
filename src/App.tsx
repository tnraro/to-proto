import { useState } from 'react'
import { useStore } from './hooks/useStore'
import { RecordForm, type RecordInput } from './components/RecordForm'
import { RecordList } from './components/RecordList'
import { CalendarView } from './components/CalendarView'
import { StatsView } from './components/StatsView'
import { CatManager } from './components/CatManager'
import type { VomitRecord } from './types'

type Tab = 'record' | 'calendar' | 'stats' | 'cats'

const TABS: { id: Tab; label: string }[] = [
  { id: 'record', label: '기록' },
  { id: 'calendar', label: '캘린더' },
  { id: 'stats', label: '통계' },
  { id: 'cats', label: '고양이' },
]

export default function App() {
  const store = useStore()
  const [tab, setTab] = useState<Tab>('record')
  const [editing, setEditing] = useState<VomitRecord | null>(null)

  const { cats, records, addRecord, updateRecord, deleteRecord } = store

  const catName = (id: string) => cats.find((c) => c.id === id)?.name ?? '?'

  const handleSubmit = (input: RecordInput) => {
    if (editing) {
      updateRecord(editing.id, input)
      setEditing(null)
    } else {
      addRecord(input)
    }
    setTab('record')
  }

  const handleEdit = (r: VomitRecord) => {
    setEditing(r)
    setTab('record')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const recent = records.slice(0, 30)

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold">
            고양이 토 기록
            <span className="ml-2 text-sm font-normal text-gray-400">총 {records.length}회</span>
          </h1>
        </div>
        <nav className="mx-auto flex max-w-3xl gap-1 px-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-t-lg px-4 py-2 text-sm font-medium ${
                tab === t.id ? 'border-b-2 border-emerald-600 text-emerald-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {tab === 'record' && (
          <div className="space-y-6">
            <RecordForm
              cats={cats}
              initial={editing}
              onSubmit={handleSubmit}
              onCancel={editing ? () => setEditing(null) : undefined}
            />
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
          <CalendarView records={records} cats={cats} onEdit={handleEdit} onDelete={deleteRecord} />
        )}

        {tab === 'stats' && <StatsView records={records} cats={cats} />}

        {tab === 'cats' && <CatManager {...store} />}
      </main>
    </div>
  )
}
