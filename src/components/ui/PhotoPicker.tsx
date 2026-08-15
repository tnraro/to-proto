import { useImperativeHandle, useRef, useState, type ReactNode, type Ref } from 'react'
import { ImageEditorModal } from '../ImageEditorModal'

export interface PhotoPickerHandle {
  open: () => void
}

interface Props {
  /** Passes the edited image blob when a crop is applied (not called on cancel) */
  onPhoto: (blob: Blob) => void
  aspect: number
  /** Trigger renderer — open() starts the file picker */
  renderTrigger: (open: () => void) => ReactNode
  ref?: Ref<PhotoPickerHandle>
}

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
