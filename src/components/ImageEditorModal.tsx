import { useEffect, useState } from 'react'
import Cropper, { type Area, type Point } from 'react-easy-crop'
import { Modal } from './Modal'
import { cropImage } from '../lib/cropImage'

interface Props {
  open: boolean
  image: Blob | null
  /** 크롭 비율 (undefined = 자유) */
  aspect?: number
  onCancel: () => void
  onApply: (blob: Blob) => void
}

export function ImageEditorModal({ open, image, aspect, onCancel, onApply }: Props) {
  const [imageUrl, setImageUrl] = useState<string>()
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [cropArea, setCropArea] = useState<Area | null>(null)
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    if (!open || !image) return
    const url = URL.createObjectURL(image)
    setImageUrl(url)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
    setCropArea(null)
    setApplying(false)
    return () => URL.revokeObjectURL(url)
  }, [open, image])

  if (!open || !imageUrl) return null

  const apply = async () => {
    if (!cropArea || applying) return
    setApplying(true)
    const blob = await cropImage(image as Blob, cropArea, rotation)
    onApply(blob)
  }

  return (
    <Modal open={open} onClose={onCancel} drawer={false}>
      <h2 className="text-lg font-bold">사진 편집</h2>
      <p className="mt-1 text-sm text-gray-500">크롭 영역을 드래그하고 확대/회전을 조절하세요</p>

      <div className="relative mt-4 h-72 w-full overflow-hidden rounded-card bg-gray-900">
        <Cropper
          image={imageUrl}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={aspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          onCropComplete={(_, area) => setCropArea(area)}
        />
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-3">
          <span className="w-14 shrink-0 text-xs text-gray-500">확대/축소</span>
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-emerald-600"
          />
          <span className="w-8 text-right text-xs text-gray-400">{zoom.toFixed(1)}x</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="w-14 shrink-0 text-xs text-gray-500">회전</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
              className="min-h-9 rounded-full border border-gray-200 px-3 text-sm text-gray-600 hover:bg-gray-50"
            >
              ⟲ 90°
            </button>
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="min-h-9 rounded-full border border-gray-200 px-3 text-sm text-gray-600 hover:bg-gray-50"
            >
              ⟳ 90°
            </button>
          </div>
          <input
            type="range"
            min={0}
            max={360}
            step={1}
            value={rotation}
            onChange={(e) => setRotation(Number(e.target.value))}
            className="flex-1 accent-emerald-600"
          />
          <span className="w-8 text-right text-xs text-gray-400">{rotation}°</span>
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 flex-1 rounded-lg border border-gray-200 text-gray-600"
        >
          취소
        </button>
        <button
          type="button"
          onClick={() => void apply()}
          disabled={applying}
          className="min-h-11 flex-1 rounded-lg bg-primary font-medium text-white hover:bg-primary-hover disabled:opacity-40"
        >
          {applying ? '적용 중...' : '적용'}
        </button>
      </div>
    </Modal>
  )
}
