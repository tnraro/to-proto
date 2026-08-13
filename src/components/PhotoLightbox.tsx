import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePhotoUrl } from '../lib/usePhotoUrl'

const SWIPE_THRESHOLD = 50

interface Props {
  photoIds: string[]
  initialIndex: number
  onClose: () => void
}

export function PhotoLightbox({ photoIds, initialIndex, onClose }: Props) {
  const count = photoIds.length
  const [index, setIndex] = useState(initialIndex)
  const url = usePhotoUrl(photoIds[index % count])
  usePhotoUrl(photoIds[(index - 1 + count) % count])
  usePhotoUrl(photoIds[(index + 1) % count])

  const startRef = useRef<{ x: number } | null>(null)
  const lastPointerOnPadding = useRef(false)
  const suppressClick = useRef(false)

  const go = useCallback(
    (dir: number) => {
      setIndex((i) => (i + dir + count) % count)
    },
    [count],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, go])

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex touch-none flex-col items-center justify-center bg-black/90"
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest('button')) return
        startRef.current = { x: e.clientX }
        lastPointerOnPadding.current = e.target === e.currentTarget
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerUp={(e) => {
        const start = startRef.current
        if (!start) return
        startRef.current = null
        const dx = e.clientX - start.x
        if (Math.abs(dx) > SWIPE_THRESHOLD) {
          suppressClick.current = true
          go(dx < 0 ? 1 : -1)
        }
      }}
      onClick={(e) => {
        if (suppressClick.current) {
          suppressClick.current = false
          return
        }
        if (e.target === e.currentTarget && lastPointerOnPadding.current) {
          lastPointerOnPadding.current = false
          onClose()
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <button
        onClick={onClose}
        className="fixed right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-xl text-white"
        aria-label="닫기"
      >
        ✕
      </button>

      <span className="mb-2 text-sm text-white/70">
        {index + 1} / {count}
      </span>

      <div className="relative flex w-full flex-1 items-center justify-center px-4 pb-4">
        <button
          onClick={() => go(-1)}
          className="absolute left-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-xl text-white hover:bg-black/60"
          aria-label="이전 사진"
        >
          ◀
        </button>
        {url ? (
          <img
            src={url}
            alt="기록 사진 확대"
            className="max-h-full max-w-[calc(100%-6rem)] rounded-lg object-contain"
          />
        ) : (
          <span className="text-sm text-white/50">로딩 중...</span>
        )}
        <button
          onClick={() => go(1)}
          className="absolute right-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-xl text-white hover:bg-black/60"
          aria-label="다음 사진"
        >
          ▶
        </button>
      </div>

      {count > 1 && (
        <div className="mb-4 flex gap-1.5">
          {photoIds.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full ${i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/30'}`}
            />
          ))}
        </div>
      )}
    </div>,
    document.body,
  )
}
