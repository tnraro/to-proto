import { useMemo, useState } from 'react'
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { VomitRecord, VomitType } from '../types'
import { VOMIT_TYPES, VOMIT_TYPE_KEYS } from '../types'
import { toDateKey, DAY_MS } from '../lib/dates'
import { Card } from './ui/Card'

const PERIODS = [
  { label: '7일', days: 7 },
  { label: '30일', days: 30 },
  { label: '90일', days: 90 },
  { label: '전체', days: Infinity },
]

interface Props {
  records: VomitRecord[]
}

export function StatsView({ records }: Props) {
  const [periodDays, setPeriodDays] = useState(30)
  const [hoverType, setHoverType] = useState<VomitType | null>(null)

  const filtered = useMemo(() => {
    if (periodDays === Infinity) return records
    const cutoff = Date.now() - periodDays * DAY_MS
    return records.filter((r) => new Date(r.datetime).getTime() >= cutoff)
  }, [records, periodDays])

  const total = filtered.length

  const stackedTypes = useMemo(() => {
    const set = new Set<VomitType>()
    for (const r of filtered) {
      for (const t of r.types) set.add(t)
    }
    return VOMIT_TYPE_KEYS.filter((k) => set.has(k))
  }, [filtered])

  const dailyData = useMemo(() => {
    if (periodDays === Infinity) return []
    const days: string[] = []
    for (let i = periodDays - 1; i >= 0; i--) {
      days.push(toDateKey(new Date(Date.now() - i * DAY_MS)))
    }
    const index = new Map(days.map((d, i) => [d, i]))
    const rows: Record<string, string | number>[] = days.map((day) => ({
      day: day.slice(5),
      ...Object.fromEntries(stackedTypes.map((t) => [t, 0])),
    }))
    for (const r of filtered) {
      const i = index.get(toDateKey(new Date(r.datetime)))
      if (i === undefined) continue
      for (const t of r.types) {
        rows[i][t] = (rows[i][t] as number) + 1
      }
    }
    return rows
  }, [filtered, periodDays, stackedTypes])

  const typeData = useMemo(() => {
    const counts = new Map<VomitType, number>()
    for (const r of filtered) {
      for (const t of r.types) counts.set(t, (counts.get(t) ?? 0) + 1)
    }
    return VOMIT_TYPE_KEYS.filter((k) => counts.has(k)).map((k) => ({
      key: k,
      name: VOMIT_TYPES[k].label,
      value: counts.get(k) ?? 0,
      color: VOMIT_TYPES[k].hex,
    }))
  }, [filtered])

  const hourData = useMemo(() => {
    const rows: Record<string, string | number>[] = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${String(hour).padStart(2, '0')}시`,
      ...Object.fromEntries(stackedTypes.map((t) => [t, 0])),
    }))
    for (const r of filtered) {
      const hour = new Date(r.datetime).getHours()
      for (const t of r.types) {
        rows[hour][t] = (rows[hour][t] as number) + 1
      }
    }
    return rows
  }, [filtered, stackedTypes])

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.label}
            onClick={() => setPeriodDays(p.days)}
            className={`min-h-9 rounded-full px-4 text-sm ${
              periodDays === p.days
                ? 'bg-primary font-medium text-white shadow-sm'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
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
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-gray-700">일별 횟수</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dailyData}>
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={24} />
                  <Tooltip content={<ChartTooltip />} />
                  {stackedTypes.map((t) => (
                    <Bar
                      key={t}
                      dataKey={t}
                      stackId="daily"
                      fill={hoverType === null || hoverType === t ? VOMIT_TYPES[t].hex : '#e5e7eb'}
                      name={VOMIT_TYPES[t].label}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
              {stackedTypes.length > 0 && (
                <Legend
                  items={stackedTypes.map((t) => {
                    const total = typeData.find((x) => x.key === t)?.value ?? 0
                    return { key: t, label: VOMIT_TYPES[t].label, value: total, color: VOMIT_TYPES[t].hex }
                  })}
                  hoverKey={hoverType}
                  onHover={(key) => setHoverType(key as VomitType | null)}
                />
              )}
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-gray-700">종류별 분포</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={typeData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {typeData.map((t) => (
                      <Cell
                        key={t.key}
                        fill={hoverType === null || hoverType === t.key ? t.color : '#e5e7eb'}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <Legend
                items={typeData.map((t) => ({ key: t.key, label: t.name, value: t.value, color: t.color }))}
                hoverKey={hoverType}
                onHover={(key) => setHoverType(key as VomitType | null)}
              />
            </Card>
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-gray-700">시간대별 분포</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={hourData}>
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={24} />
                  <Tooltip content={<ChartTooltip />} />
                  {stackedTypes.map((t) => (
                    <Bar
                      key={t}
                      dataKey={t}
                      stackId="hourly"
                      fill={hoverType === null || hoverType === t ? VOMIT_TYPES[t].hex : '#e5e7eb'}
                      name={VOMIT_TYPES[t].label}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
              {stackedTypes.length > 0 && (
                <Legend
                  items={stackedTypes.map((t) => {
                    const total = typeData.find((x) => x.key === t)?.value ?? 0
                    return { key: t, label: VOMIT_TYPES[t].label, value: total, color: VOMIT_TYPES[t].hex }
                  })}
                  hoverKey={hoverType}
                  onHover={(key) => setHoverType(key as VomitType | null)}
                />
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number | string; color?: string; dataKey?: string | number }>
  label?: string | number
}) {
  if (!active || !payload?.length) return null
  const items = payload.filter((p) => Number(p.value) > 0)
  if (items.length === 0) return null
  return (
    <div className="rounded-lg border border-gray-100 bg-white px-2.5 py-1.5 text-xs shadow-pop">
      <div className="font-medium text-gray-900">{label}</div>
      {items.map((p) => (
        <div key={String(p.dataKey)} className="flex items-center gap-1.5 text-gray-600">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          {p.name}: {p.value}회
        </div>
      ))}
    </div>
  )
}

function Legend({
  items,
  hoverKey,
  onHover,
}: {
  items: { key?: string; label: string; value: number; color: string }[]
  hoverKey?: string | null
  onHover?: (key: string | null) => void
}) {
  return (
    <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
      {items.map((it) => {
        const dimmed = hoverKey !== undefined && hoverKey !== null && hoverKey !== (it.key ?? it.label)
        return (
          <li
            key={it.key ?? it.label}
            onPointerEnter={() => onHover?.(it.key ?? it.label)}
            onPointerLeave={() => onHover?.(null)}
            className={`flex cursor-default items-center gap-1.5 text-xs transition ${
              dimmed ? 'text-gray-300' : 'text-gray-600'
            }`}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: dimmed ? '#d1d5db' : it.color }}
            />
            {it.label} {it.value}회
          </li>
        )
      })}
    </ul>
  )
}
