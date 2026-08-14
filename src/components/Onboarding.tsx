import { useRef, useState } from 'react'
import { putPhoto, uid } from '../lib/storage'
import { resizeImage } from '../lib/image'
import { useObjectUrl } from '../lib/useObjectUrl'
import { PhotoPicker } from './ui/PhotoPicker'
import { Card } from './ui/Card'

interface Props {
  onFinish: (cats: { name: string; photoId?: string }[]) => void
}

interface Item {
  name: string
  photoBlob: Blob | null
}

export function Onboarding({ onFinish }: Props) {
  const [items, setItems] = useState<Item[]>([])
  const [name, setName] = useState('')
  const [starting, setStarting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const add = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    setItems((prev) => [...prev, { name: trimmed, photoBlob: null }])
    setName('')
    inputRef.current?.focus()
  }

  const remove = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const setPhoto = (index: number, blob: Blob) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, photoBlob: blob } : it)))
  }

  const finish = async () => {
    if (starting) return
    setStarting(true)
    const cats = await Promise.all(
      items.map(async (it) => {
        if (!it.photoBlob) return { name: it.name }
        const photoId = uid()
        await putPhoto(photoId, await resizeImage(it.photoBlob))
        return { name: it.name, photoId }
      }),
    )
    onFinish(cats)
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
        <Card>
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

          {items.length > 0 && (
            <ul className="mt-4 flex flex-wrap justify-center gap-2">
              {items.map((it, i) => (
                <li
                  key={`${it.name}-${i}`}
                  className="flex items-center gap-1 rounded-full bg-primary/10 py-1 pl-1.5 pr-1.5 text-sm font-medium text-primary"
                >
                  <PhotoPicker
                    aspect={1}
                    onPhoto={(blob) => setPhoto(i, blob)}
                    renderTrigger={(open) => <ChipPhotoButton blob={it.photoBlob} open={open} name={it.name} />}
                  />
                  <span>{it.name}</span>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-xs text-primary hover:bg-primary/20"
                    aria-label={`${it.name} 제거`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={() => void finish()}
            disabled={items.length === 0 || starting}
            className="mt-4 min-h-12 w-full rounded-xl bg-primary font-semibold text-white hover:bg-primary-hover disabled:opacity-40"
          >
            {starting
              ? '등록 중...'
              : items.length > 0
                ? `${items.length}마리 등록하고 시작하기`
                : '등록하고 시작하기'}
          </button>
        </Card>
      </div>
      <p className="mt-6 text-xs text-gray-400">
        사진은 선택이며, 나중에 설정에서 언제든 추가할 수 있어요
      </p>
    </div>
  )
}

function ChipPhotoButton({ blob, name, open }: { blob: Blob | null; name: string; open: () => void }) {
  const url = useObjectUrl(blob ?? undefined)
  return (
    <button
      type="button"
      onClick={open}
      aria-label={`${name} 사진 등록`}
      className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-xs text-gray-400 ring-1 ring-primary/20 hover:text-primary"
    >
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      )}
    </button>
  )
}
