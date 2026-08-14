import type { Cat } from '../types'

interface Props {
  cats: Cat[]
  currentCatId: string | null
  onChange: (catId: string | null) => void
}

/** 상단 헤더 — 앱 타이틀과 고양이 전환 select (2마리 이상일 때만 표시) */
export function AppHeader({ cats, currentCatId, onChange }: Props) {
  return (
    <header className="shrink-0 border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2.5">
        <h1 className="truncate text-base font-bold text-gray-900">고양이 토 기록</h1>
        {cats.length > 1 && (
          <select
            value={currentCatId ?? ''}
            onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
            className="min-h-9 max-w-36 shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-2 text-sm focus:border-primary focus:bg-white focus:outline-none"
            aria-label="고양이 선택"
          >
            <option value="">전체</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </header>
  )
}
