import { useImperativeHandle, useRef, useState, type ReactNode, type Ref } from 'react'
import { ImageEditorModal } from './ImageEditorModal'

export interface PhotoPickerHandle {
  open: () => void
}

interface Props {
  /** 크롭 적용 시 편집된 이미지 blob 전달 (취소 시 호출되지 않음) */
  onPhoto: (blob: Blob) => void
  /** 크롭 비율 (undefined = 자유) */
  aspect?: number
  /** 트리거 렌더러 — open()을 호출하면 파일 선택이 열린다 */
  renderTrigger: (open: () => void) => ReactNode
  ref?: Ref<PhotoPickerHandle>
}

/** 사진 공용 픽커: 파일 선택 → 크롭 편집 → blob 반환 */
export function PhotoPicker({ onPhoto, aspect, renderTrigger, ref }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [editingBlob, setEditingBlob] = useState<Blob | null>(null)

  const open = () => fileRef.current?.click()

  useImperativeHandle(ref, () => ({ open }))

  return (
    <>
      {renderTrigger(open)}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) setEditingBlob(file)
          if (fileRef.current) fileRef.current.value = ''
        }}
      />
      <ImageEditorModal
        open={editingBlob !== null}
        image={editingBlob}
        aspect={aspect}
        onCancel={() => setEditingBlob(null)}
        onApply={(blob) => {
          setEditingBlob(null)
          onPhoto(blob)
        }}
      />
    </>
  )
}
