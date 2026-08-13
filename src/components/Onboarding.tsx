import { useRef, useState } from 'react'

interface Props {
  onAdd: (name: string) => void
}

export function Onboarding({ onAdd }: Props) {
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onAdd(name.trim())
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-emerald-50 via-white to-purple-50 px-6">
      <img
        src="./icon.svg"
        alt=""
        className="h-20 w-20 rounded-3xl shadow-lg shadow-purple-300/50"
      />
      <h1 className="mt-5 text-2xl font-bold text-gray-900">고양이 토 기록</h1>
      <p className="mt-2 text-center text-sm text-gray-500">
        고양이의 토 기록을 남기고, 캘린더와 통계로 살펴보세요.
        <br />
        시작하려면 먼저 고양이를 등록해 주세요.
      </p>

      <form onSubmit={submit} className="mt-8 w-full max-w-xs space-y-3">
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="고양이 이름"
          autoFocus
          className="min-h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-center text-base"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="min-h-12 w-full rounded-xl bg-emerald-600 font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
        >
          등록하고 시작하기
        </button>
      </form>
      <p className="mt-6 text-xs text-gray-400">
        여러 고양이를 기르는 경우 설정에서 언제든 추가할 수 있어요
      </p>
    </div>
  )
}
