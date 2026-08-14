import type { Cat } from '../types'
import { CatAvatar } from './CatAvatar'

interface Props {
  cats: Cat[]
  currentCatId: string | null
  onChange: (catId: string | null) => void
}

/** 상단 고양이 빠른 전환 바 — 가로 스크롤, 현재 고양이 선택 */
export function CatSwitcher({ cats, currentCatId, onChange }: Props) {
  return (
    <header className="shrink-0 border-b border-gray-200 bg-white">
      <div className="no-scrollbar mx-auto flex max-w-3xl items-center gap-2 overflow-x-auto px-4 py-2">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm transition ${
            currentCatId === null
              ? 'border-primary bg-primary/10 font-medium text-primary'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          전체
        </button>
        {cats.map((cat) => {
          const selected = currentCatId === cat.id
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onChange(cat.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-sm transition ${
                selected
                  ? 'border-primary bg-primary/10 font-medium text-primary'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <CatAvatar cat={cat} sizeClass="h-7 w-7" />
              <span className="max-w-24 truncate">{cat.name}</span>
            </button>
          )
        })}
      </div>
    </header>
  )
}
