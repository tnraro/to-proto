import { useEffect, useRef, useState } from 'react'
import { putPhoto, uid } from '../lib/storage'
import { resizeImage } from '../lib/image'
import { Modal } from './Modal'
import { PhotoPreview } from './PhotoPreview'
import { PhotoPicker } from './PhotoPicker'

interface Props {
  open: boolean
  onClose: () => void
  onAdd: (name: string, photoId?: string) => void
}

export function CatFormModal({ open, onClose, onAdd }: Props) {
  const [name, setName] = useState('')
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setName('')
      setPhotoBlob(null)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    if (photoBlob) {
      const photoId = uid()
      await putPhoto(photoId, await resizeImage(photoBlob))
      onAdd(name.trim(), photoId)
    } else {
      onAdd(name.trim())
    }
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="text-lg font-bold">고양이 등록</h2>
      <p className="mt-1 text-sm text-gray-500">기록에 사용할 고양이 이름을 입력하세요</p>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="고양이 이름"
          className="min-h-11 w-full rounded-lg border border-gray-300 px-3"
        />
        <div className="flex items-center gap-3">
          {photoBlob ? (
            <PhotoPreview blob={photoBlob} onRemove={() => setPhotoBlob(null)} />
          ) : (
            <PhotoPicker
              aspect={1}
              onPhoto={setPhotoBlob}
              renderTrigger={(open) => (
                <button
                  type="button"
                  onClick={open}
                  className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-2xl text-gray-400 hover:border-emerald-400 hover:text-emerald-500"
                >
                  +
                </button>
              )}
            />
          )}
          <div className="text-sm text-gray-500">
            <p>고양이 사진 (선택)</p>
            <p className="text-xs text-gray-400">없으면 기본 아바타가 표시됩니다</p>
          </div>
        </div>
        <button
          type="submit"
          disabled={!name.trim()}
          className="min-h-11 w-full rounded-lg bg-primary font-medium text-white hover:bg-primary-hover disabled:opacity-40"
        >
          추가
        </button>
      </form>
      <button
        onClick={onClose}
        className="mt-3 min-h-11 w-full rounded-lg border border-gray-200 text-gray-600"
      >
        취소
      </button>
    </Modal>
  )
}
