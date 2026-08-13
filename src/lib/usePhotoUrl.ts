import { useEffect, useState } from 'react'
import { getPhoto } from './storage'

export function usePhotoUrl(photoId: string): string | undefined {
  const [url, setUrl] = useState<string>()

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | undefined
    if (!photoId) {
      setUrl(undefined)
      return
    }
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

  return url
}
