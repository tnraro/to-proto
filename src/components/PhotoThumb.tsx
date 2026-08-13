import { useEffect, useState } from 'react'
import { getPhoto } from '../lib/storage'

export function PhotoThumb({ photoId }: { photoId: string }) {
  const [url, setUrl] = useState<string>()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | undefined
    void (async () => {
      const blob = await getPhoto(photoId)
      if (!blob || cancelled) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    })()
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [photoId])

  if (!url) return null

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="shrink-0">
        <img src={url} alt="기록 사진" className="h-14 w-14 rounded-lg object-cover" />
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setOpen(false)}
        >
          <img src={url} alt="기록 사진 확대" className="max-h-[85vh] max-w-full rounded-lg object-contain" />
          <button
            onClick={() => setOpen(false)}
            className="fixed right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-xl text-white"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
      )}
    </>
  )
}
