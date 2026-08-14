import { useEffect, useState } from 'react'
import type { Cat, ThresholdRule, VomitType } from '../types'
import { VOMIT_TYPES, VOMIT_TYPE_KEYS } from '../types'
import { RULE_PRESETS } from '../lib/thresholds'
import { RelativeTime } from './ui/RelativeTime'
import type { RuleInput, Store } from '../hooks/useStore'

const WINDOWS = [
  { label: '1일', days: 1 },
  { label: '7일', days: 7 },
  { label: '30일', days: 30 },
]

interface Props {
  cats: Cat[]
  rules: ThresholdRule[]
  alertLog: Store['alertLog']
  addRule: Store['addRule']
  updateRule: Store['updateRule']
  deleteRule: Store['deleteRule']
  deleteAlert: Store['deleteAlert']
  clearAlerts: Store['clearAlerts']
}

export function ThresholdManager({ cats, rules, alertLog, addRule, updateRule, deleteRule, deleteAlert, clearAlerts }: Props) {
  const [editing, setEditing] = useState<ThresholdRule | null>(null)

  const handleSubmit = (input: RuleInput) => {
    if (editing) {
      updateRule(editing.id, input)
      setEditing(null)
    } else {
      addRule(input)
    }
  }

  return (
    <div className="space-y-8 p-4">
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-600">임계값 규칙</h2>
        <RuleForm cats={cats} editing={editing} onSubmit={handleSubmit} onCancel={() => setEditing(null)} />
        <ul className="mt-3 divide-y divide-gray-100 rounded-card border border-gray-100 bg-white shadow-card">
          {rules.map((rule) => (
            <RuleItem key={rule.id} rule={rule} cats={cats} onUpdate={updateRule} onDelete={deleteRule} onEdit={setEditing} />
          ))}
          {rules.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-gray-400">설정된 규칙이 없습니다</li>
          )}
        </ul>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-600">경고 이력 ({alertLog.length})</h2>
          {alertLog.length > 0 && (
            <button
              onClick={() => {
                if (confirm('경고 이력을 모두 지울까요?')) clearAlerts()
              }}
              className="text-sm text-red-500 hover:text-red-600"
            >
              전체 지우기
            </button>
          )}
        </div>
        {alertLog.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">경고 이력이 없습니다</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-card border border-gray-100 bg-white shadow-card">
            {alertLog.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                <span className="inline-block h-3 w-3 shrink-0 rounded-full bg-red-500" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">
                    {a.catName} · {a.typeLabel} · {a.windowDays}일 내 {a.maxCount}회 이상 (현재 {a.count}회)
                  </div>
                  <RelativeTime iso={a.createdAt} />
                </div>
                <button
                  onClick={() => deleteAlert(a.id)}
                  className="shrink-0 rounded px-2 py-1 text-sm text-gray-400 hover:bg-gray-100"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function RuleForm({
  cats,
  editing,
  onSubmit,
  onCancel,
}: {
  cats: Cat[]
  editing: ThresholdRule | null
  onSubmit: (input: RuleInput) => void
  onCancel: () => void
}) {
  const [catId, setCatId] = useState<string>(editing?.catId ?? 'all')
  const [windowDays, setWindowDays] = useState<number>(editing?.windowDays ?? 1)
  const [maxCount, setMaxCount] = useState<number>(editing?.maxCount ?? 3)
  const [type, setType] = useState<'all' | VomitType>(editing?.type ?? 'all')

  useEffect(() => {
    setCatId(editing?.catId ?? 'all')
    setWindowDays(editing?.windowDays ?? 1)
    setMaxCount(editing?.maxCount ?? 3)
    setType(editing?.type ?? 'all')
  }, [editing])

  const toInput = (): RuleInput => ({
    catId: catId === 'all' ? null : catId,
    windowDays,
    maxCount,
    type: type === 'all' ? null : type,
    enabled: true,
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!maxCount || maxCount < 1) return
    onSubmit(toInput())
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-card border border-gray-100 bg-white p-4 shadow-card">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-600">고양이</span>
          <select
            value={catId}
            onChange={(e) => setCatId(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus:border-primary focus:bg-white focus:outline-none"
          >
            <option value="all">전체 고양이</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-600">토 종류</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'all' | VomitType)}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus:border-primary focus:bg-white focus:outline-none"
          >
            <option value="all">종류 무관</option>
            {VOMIT_TYPE_KEYS.map((k) => (
              <option key={k} value={k}>
                {VOMIT_TYPES[k].label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-600">집계 기간</span>
          <select
            value={windowDays}
            onChange={(e) => setWindowDays(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus:border-primary focus:bg-white focus:outline-none"
          >
            {WINDOWS.map((w) => (
              <option key={w.days} value={w.days}>
                {w.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-600">이상 기준 횟수</span>
          <input
            type="number"
            min={1}
            value={maxCount}
            onChange={(e) => setMaxCount(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus:border-primary focus:bg-white focus:outline-none"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
        >
          {editing ? '규칙 수정' : '규칙 추가'}
        </button>
        {editing && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600"
          >
            취소
          </button>
        )}
        <span className="mx-1 h-6 w-px bg-gray-200" />
        {RULE_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => {
              onCancel()
              setWindowDays(p.windowDays)
              setMaxCount(p.maxCount)
              setType(p.type ?? 'all')
            }}
            className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-500 hover:bg-gray-50"
          >
            {p.label}
          </button>
        ))}
      </div>
    </form>
  )
}

function RuleItem({
  rule,
  cats,
  onUpdate,
  onDelete,
  onEdit,
}: {
  rule: ThresholdRule
  cats: Cat[]
  onUpdate: (id: string, input: RuleInput) => void
  onDelete: (id: string) => void
  onEdit: (rule: ThresholdRule) => void
}) {
  const catName = rule.catId === null ? '전체 고양이' : (cats.find((c) => c.id === rule.catId)?.name ?? '?')
  const typeLabel = rule.type === null ? '종류 무관' : VOMIT_TYPES[rule.type].label

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span
        className={`inline-block h-3 w-3 shrink-0 rounded-full ${rule.enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
      />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">
          {catName} · {typeLabel}
        </div>
        <div className="text-xs text-gray-400">
          {rule.windowDays}일 내 {rule.maxCount}회 이상 시 경고 {rule.enabled ? '' : '(비활성)'}
        </div>
      </div>
      <button
        onClick={() => onEdit(rule)}
        className="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
      >
        수정
      </button>
      <button
        onClick={() => onUpdate(rule.id, { ...rule, enabled: !rule.enabled })}
        className="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
      >
        {rule.enabled ? '비활성화' : '활성화'}
      </button>
      <button
        onClick={() => {
          if (confirm('규칙을 삭제할까요?')) onDelete(rule.id)
        }}
        className="rounded px-2 py-1 text-sm text-red-500 hover:bg-red-50"
      >
        삭제
      </button>
    </li>
  )
}
