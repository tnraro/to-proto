import type { Cat } from '../types'

interface Props {
  cats: Cat[]
  currentCatId: string | null
  onChange: (catId: string | null) => void
}

export function AppHeader({ cats, currentCatId, onChange }: Props) {
  return (
    <header className="shrink-0 border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2.5">
        <img src="./icon.svg" alt="" className="h-8 w-8 rounded-lg" />
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
