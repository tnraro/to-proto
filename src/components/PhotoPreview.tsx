import { useObjectUrl } from '../lib/useObjectUrl'

export function PhotoPreview({ blob, onRemove }: { blob: Blob; onRemove: () => void }) {
  const src = useObjectUrl(blob)
  return (
    <div className="relative h-20 w-20">
      {src && <img src={src} alt="사진 미리보기" className="h-full w-full rounded-lg object-cover" />}
      <button
        type="button"
        onClick={onRemove}
        className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white"
        aria-label="사진 제거"
      >
        ✕
      </button>
    </div>
  )
}
