import { useMemo, useState } from 'react'
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Cat, VomitRecord, VomitType } from '../types'
import { VOMIT_TYPES, VOMIT_TYPE_KEYS } from '../types'
import { toDateKey } from '../lib/dates'

const PERIODS = [
  { label: '7일', days: 7 },
  { label: '30일', days: 30 },
  { label: '90일', days: 90 },
  { label: '전체', days: Infinity },
]

interface Props {
  records: VomitRecord[]
  cats: Cat[]
}

export function StatsView({ records, cats }: Props) {
  const [periodDays, setPeriodDays] = useState(30)

  const filtered = useMemo(() => {
    if (periodDays === Infinity) return records
    const cutoff = Date.now() - periodDays * 24 * 60 * 60 * 1000
    return records.filter((r) => new Date(r.datetime).getTime() >= cutoff)
  }, [records, periodDays])

  const total = filtered.length

  const dailyData = useMemo(() => {
    if (periodDays === Infinity) return []
    const counts = new Map<string, number>()
    for (let i = periodDays - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      counts.set(toDateKey(d), 0)
    }
    for (const r of filtered) {
      const key = toDateKey(new Date(r.datetime))
      if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return [...counts.entries()].map(([day, count]) => ({
      day: day.slice(5),
      count,
    }))
  }, [filtered, periodDays])

  const typeData = useMemo(() => {
    const counts = new Map<VomitType, number>()
    for (const r of filtered) {
      for (const t of r.types) counts.set(t, (counts.get(t) ?? 0) + 1)
    }
    return VOMIT_TYPE_KEYS.filter((k) => counts.has(k)).map((k) => ({
      name: VOMIT_TYPES[k].label,
      value: counts.get(k) ?? 0,
      color: VOMIT_TYPES[k].hex,
    }))
  }, [filtered])

  const catData = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of filtered) counts.set(r.catId, (counts.get(r.catId) ?? 0) + 1)
    return [...counts.entries()].map(([catId, count]) => ({
      name: cats.find((c) => c.id === catId)?.name ?? '?',
      count,
    }))
  }, [filtered, cats])

  const hourData = useMemo(() => {
    const counts = new Array(24).fill(0)
    for (const r of filtered) counts[new Date(r.datetime).getHours()]++
    return counts.map((count, hour) => ({ hour: `${String(hour).padStart(2, '0')}시`, count }))
  }, [filtered])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.label}
            onClick={() => setPeriodDays(p.days)}
            className={`rounded-full px-4 py-1.5 text-sm ${
              periodDays === p.days
                ? 'bg-emerald-600 text-white'
                : 'border border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {p.label}
          </button>
        ))}
        <span className="ml-auto text-sm font-semibold text-gray-700">
          {periodDays === Infinity ? '전체' : `최근 ${periodDays}일`} 총 {total}회
        </span>
      </div>

      {total === 0 ? (
        <p className="py-16 text-center text-sm text-gray-400">기간 내 기록이 없습니다</p>
      ) : (
        <>
          {dailyData.length > 0 && (
            <Card title="일별 횟수">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dailyData}>
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={24} />
                  <Tooltip />
                  <Bar dataKey="count" name="횟수" fill="#059669" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="종류별 분포">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={typeData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {typeData.map((t) => (
                      <Cell key={t.name} fill={t.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <Legend items={typeData.map((t) => ({ label: t.name, value: t.value, color: t.color }))} />
            </Card>

            {cats.length >= 2 && (
              <Card title="고양이별 횟수">
                {catData.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">고양이 기록 없음</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={catData}>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={24} />
                      <Tooltip />
                      <Bar dataKey="count" name="횟수" fill="#0ea5e9" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            )}

          </div>

          <Card title="시간대별 분포">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={hourData}>
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={24} />
                <Tooltip />
                <Bar dataKey="count" name="횟수" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-600">{title}</h3>
      {children}
    </div>
  )
}

function Legend({ items }: { items: { label: string; value: number; color: string }[] }) {
  return (
    <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: it.color }} />
          {it.label} {it.value}회
        </li>
      ))}
    </ul>
  )
}
