import { useState } from 'react'
import { usePhotoUrl } from '../lib/usePhotoUrl'
import { PhotoLightbox } from './PhotoLightbox'

interface Props {
  photos: string[]
  index: number
}

export function PhotoThumb({ photos, index }: Props) {
  const url = usePhotoUrl(photos[index])
  const [open, setOpen] = useState(false)

  if (!url) return null

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="block w-full shrink-0">
        <img src={url} alt="기록 사진" className="aspect-square w-full rounded-lg object-cover" />
      </button>
      {open && (
        <PhotoLightbox photoIds={photos} initialIndex={index} onClose={() => setOpen(false)} />
      )}
    </>
  )
}
