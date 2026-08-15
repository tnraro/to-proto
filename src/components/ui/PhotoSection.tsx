import { useCallback, useRef, type Dispatch, type SetStateAction } from 'react'
import { usePhotoReorder } from '../../hooks/usePhotoReorder'
import { uid } from '../../lib/storage'
import type { PhotoItem } from '../../lib/photos'
import { PhotoPreview } from '../PhotoPreview'

interface Props {
  items: PhotoItem[]
  onChange: Dispatch<SetStateAction<PhotoItem[]>>
}

export function PhotoSection({ items, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  const onFiles = (files: FileList | null) => {
    if (!files) return
    const added = Array.from(files)
    if (added.length === 0) return
    onChange((prev) => [...prev, ...added.map((f) => ({ key: uid(), blob: f }))])
    if (fileRef.current) fileRef.current.value = ''
  }

  const removePhoto = (key: string) => {
    onChange((prev) => prev.filter((p) => p.key !== key))
  }

  const reorderPhoto = useCallback(
    (fromKey: string, toKey: string) => {
      onChange((prev) => {
        const from = prev.findIndex((p) => p.key === fromKey)
        const to = prev.findIndex((p) => p.key === toKey)
        if (from < 0 || to < 0 || from === to) return prev
        const next = [...prev]
        const [moved] = next.splice(from, 1)
        next.splice(to, 0, moved)
        return next
      })
    },
    [onChange],
  )
  const { dragKey, onThumbPointerDown } = usePhotoReorder(reorderPhoto)

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {items.map((p) => (
          <div
            key={p.key}
            data-photo-key={p.key}
            onPointerDown={(e) => onThumbPointerDown(e, p.key)}
            className={`relative touch-none select-none rounded-lg ${
              dragKey === p.key ? 'opacity-70 ring-2 ring-primary' : ''
            }`}
          >
            <PhotoPreview blob={p.blob} onRemove={() => removePhoto(p.key)} />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0.5 right-0.5 z-10 flex h-6 w-6 items-center justify-center rounded-md bg-black/45 text-white"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                <circle cx="9" cy="6" r="1.4" />
                <circle cx="15" cy="6" r="1.4" />
                <circle cx="9" cy="12" r="1.4" />
                <circle cx="15" cy="12" r="1.4" />
                <circle cx="9" cy="18" r="1.4" />
                <circle cx="15" cy="18" r="1.4" />
              </svg>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-2xl text-gray-400 hover:border-emerald-400 hover:text-emerald-500"
        >
          +
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
    </>
  )
}
