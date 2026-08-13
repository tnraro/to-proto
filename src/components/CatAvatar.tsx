import type { Cat } from '../types'
import { usePhotoUrl } from '../lib/usePhotoUrl'

interface Props {
  cat?: Cat
  sizeClass?: string
  /** photo: 클릭 가능한 사진 버튼 (설정 탭) — 사진 없으면 중앙 + 표시 */
  variant?: 'plain' | 'photo'
  onClick?: () => void
}

export function CatAvatar({ cat, sizeClass = 'h-10 w-10', variant = 'plain', onClick }: Props) {
  const url = usePhotoUrl(cat?.photoId ?? '')

  const content = url ? (
    <img
      src={url}
      alt={cat?.name ?? ''}
      className={`${sizeClass} shrink-0 rounded-full object-cover`}
    />
  ) : (
    <span
      className={`${sizeClass} relative shrink-0 rounded-full bg-gray-200`}
      aria-hidden="true"
    >
      {variant === 'photo' && (
        <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold text-gray-400">
          +
        </span>
      )}
    </span>
  )

  if (variant === 'photo') {
    return (
      <button
        type="button"
        onClick={onClick}
        className="shrink-0 rounded-full hover:ring-2 hover:ring-emerald-300"
        aria-label={cat?.photoId ? '사진 변경' : '사진 추가'}
      >
        {content}
      </button>
    )
  }

  return content
}
