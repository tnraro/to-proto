import { useRef, useState } from 'react'

interface Props {
  onFinish: (names: string[]) => void
}

export function Onboarding({ onFinish }: Props) {
  const [names, setNames] = useState<string[]>([])
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const add = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    setNames((prev) => [...prev, trimmed])
    setName('')
    inputRef.current?.focus()
  }

  const remove = (index: number) => {
    setNames((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-emerald-50 via-white to-purple-50 px-6 py-10">
      <img src="./icon.svg" alt="" className="h-20 w-20 rounded-3xl shadow-pop" />
      <h1 className="mt-5 text-2xl font-bold text-gray-900">고양이 토 기록</h1>
      <p className="mt-2 text-center text-sm text-gray-500">
        고양이의 토 기록을 남기고, 캘린더와 통계로 살펴보세요.
        <br />
        시작하려면 먼저 고양이를 등록해 주세요.
      </p>

      <div className="mt-8 w-full max-w-sm">
        <div className="rounded-card border border-gray-100 bg-white p-5 shadow-card">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  add()
                }
              }}
              placeholder="고양이 이름"
              autoFocus
              className="min-h-12 w-full flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 text-base focus:border-primary focus:bg-white focus:outline-none"
            />
            <button
              type="button"
              onClick={add}
              disabled={!name.trim()}
              className="min-h-12 shrink-0 rounded-xl bg-primary px-4 font-medium text-white hover:bg-primary-hover disabled:opacity-40"
            >
              추가
            </button>
          </div>

          {names.length > 0 && (
            <ul className="mt-4 flex flex-wrap justify-center gap-2">
              {names.map((n, i) => (
                <li
                  key={`${n}-${i}`}
                  className="flex items-center gap-1 rounded-full bg-primary/10 py-1.5 pl-3 pr-1.5 text-sm font-medium text-primary"
                >
                  {n}
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-xs text-primary hover:bg-primary/20"
                    aria-label={`${n} 제거`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={() => onFinish(names)}
            disabled={names.length === 0}
            className="mt-4 min-h-12 w-full rounded-xl bg-primary font-semibold text-white hover:bg-primary-hover disabled:opacity-40"
          >
            {names.length > 0 ? `${names.length}마리 등록하고 시작하기` : '등록하고 시작하기'}
          </button>
        </div>
      </div>
      <p className="mt-6 text-xs text-gray-400">
        나중에 설정에서 언제든 고양이를 추가할 수 있어요
      </p>
    </div>
  )
}
