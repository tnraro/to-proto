import { useEffect, useRef, useState } from 'react'
import { Modal } from './Modal'

interface Props {
  open: boolean
  onClose: () => void
  onAdd: (name: string) => void
}

export function CatFormModal({ open, onClose, onAdd }: Props) {
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setName('')
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onAdd(name.trim())
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="text-lg font-bold">고양이 등록</h2>
      <p className="mt-1 text-sm text-gray-500">기록에 사용할 고양이 이름을 입력하세요</p>
      <form onSubmit={submit} className="mt-4 flex gap-2">
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="고양이 이름"
          className="min-h-11 flex-1 rounded-lg border border-gray-300 px-3"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="min-h-11 rounded-lg bg-emerald-600 px-4 font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
        >
          추가
        </button>
      </form>
      <button
        onClick={onClose}
        className="mt-3 min-h-11 w-full rounded-lg border border-gray-300 text-gray-600"
      >
        취소
      </button>
    </Modal>
  )
}
