import type { Cat } from '../types'
import { usePhotoUrl } from '../lib/usePhotoUrl'

interface Props {
  cat?: Cat
  sizeClass?: string
  /** 'photo': settings tab */
  variant?: 'plain' | 'photo'
  onClick?: () => void
}

export function CatAvatar({ cat, sizeClass = 'h-10 w-10', variant = 'plain', onClick }: Props) {
  const url = usePhotoUrl(cat?.photoId)

  const content = url ? (
    <img
      src={url}
      alt={cat?.name ?? ''}
      className={`${sizeClass} shrink-0 rounded-full object-cover`}
    />
  ) : (
    <span
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-gray-200`}
      aria-hidden="true"
    >
      {variant === 'photo' && <span className="text-lg font-semibold text-gray-400">+</span>}
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
