import type { Cat } from '../types'
import { usePhotoUrl } from '../lib/usePhotoUrl'

export function CatAvatar({ cat, sizeClass = 'h-10 w-10' }: { cat?: Cat; sizeClass?: string }) {
  const url = usePhotoUrl(cat?.photoId ?? '')
  if (!url) {
    return <span className={`${sizeClass} shrink-0 rounded-full bg-gray-200`} aria-hidden="true" />
  }
  return (
    <img
      src={url}
      alt={cat?.name ?? ''}
      className={`${sizeClass} shrink-0 rounded-full object-cover`}
    />
  )
}
