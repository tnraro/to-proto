import { useRef, useState, type ReactNode } from 'react'
import { ImageEditorModal } from './ImageEditorModal'

interface Props {
  /** 크롭 적용 시 원본 크기 이미지 blob 전달 (취소 시 호출되지 않음) */
  onPhoto: (blob: Blob) => void
  /** 트리거 렌더러 — open()을 호출하면 파일 선택이 열린다 */
  renderTrigger: (open: () => void) => ReactNode
}

/** 고양이 사진 공용 픽커: 파일 선택 → 정사각형 크롭 편집 → blob 반환 */
export function CatPhotoPicker({ onPhoto, renderTrigger }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [editingBlob, setEditingBlob] = useState<Blob | null>(null)

  const open = () => fileRef.current?.click()

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
        aspect={1}
        onCancel={() => setEditingBlob(null)}
        onApply={(blob) => {
          setEditingBlob(null)
          onPhoto(blob)
        }}
      />
    </>
  )
}
