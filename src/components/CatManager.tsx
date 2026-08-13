import { useRef, useState } from 'react'
import type { Cat } from '../types'
import { putPhoto, uid } from '../lib/storage'
import { resizeImage } from '../lib/image'
import { CatAvatar } from './CatAvatar'
import { DropdownMenu } from './DropdownMenu'

interface Props {
  cats: Cat[]
  renameCat: (id: string, name: string) => void
  updateCatPhoto: (id: string, photoId?: string) => void
  deleteCat: (id: string) => void
  onAddCat: () => void
}

export function CatManager({ cats, renameCat, updateCatPhoto, deleteCat, onAddCat }: Props) {
  return (
    <div className="space-y-4">
      <button
        onClick={onAddCat}
        className="min-h-11 w-full rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 font-medium text-primary hover:bg-primary/10"
      >
        + 고양이 추가
      </button>

      <ul className="divide-y divide-gray-100 rounded-card border border-gray-100 bg-white shadow-card">
        {cats.map((cat) => (
          <CatItem
            key={cat.id}
            cat={cat}
            renameCat={renameCat}
            updateCatPhoto={updateCatPhoto}
            deleteCat={deleteCat}
          />
        ))}
        {cats.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-gray-400">등록된 고양이가 없습니다</li>
        )}
      </ul>
    </div>
  )
}

function CatItem({
  cat,
  renameCat,
  updateCatPhoto,
  deleteCat,
}: {
  cat: Cat
  renameCat: (id: string, name: string) => void
  updateCatPhoto: (id: string, photoId?: string) => void
  deleteCat: (id: string) => void
}) {
  const [editingName, setEditingName] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const onPhotoFile = async (file: File | undefined) => {
    if (!file) return
    const photoId = uid()
    await putPhoto(photoId, await resizeImage(file))
    updateCatPhoto(cat.id, photoId)
    if (fileRef.current) fileRef.current.value = ''
  }

  const items = [
    {
      label: cat.photoId ? '사진 변경' : '사진 추가',
      onClick: () => fileRef.current?.click(),
    },
    ...(cat.photoId
      ? [{ label: '사진 삭제', danger: true, onClick: () => updateCatPhoto(cat.id, undefined) }]
      : []),
    { label: '이름 변경', onClick: () => setEditingName(true) },
    {
      label: '삭제',
      danger: true,
      onClick: () => {
        if (confirm(`'${cat.name}' 고양이와 기록을 모두 삭제할까요?`)) deleteCat(cat.id)
      },
    },
  ]

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <CatAvatar cat={cat} variant="photo" onClick={() => fileRef.current?.click()} />
      <div className="min-w-0 flex-1">
        {editingName ? (
          <EditCatName
            catName={cat.name}
            onSave={(n) => {
              renameCat(cat.id, n)
              setEditingName(false)
            }}
            onCancel={() => setEditingName(false)}
          />
        ) : (
          <span className="truncate font-medium">{cat.name}</span>
        )}
      </div>
      <DropdownMenu ariaLabel={`${cat.name} 메뉴`} items={items} />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void onPhotoFile(e.target.files?.[0])}
      />
    </li>
  )
}

function EditCatName({
  catName,
  onSave,
  onCancel,
}: {
  catName: string
  onSave: (name: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(catName)

  const save = () => {
    if (name.trim()) {
      onSave(name)
      return
    }
    onCancel()
  }

  return (
    <span className="flex gap-1">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save()
          if (e.key === 'Escape') onCancel()
        }}
        className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
      />
      <button onClick={save} className="rounded bg-emerald-600 px-2 py-1 text-xs text-white">
        저장
      </button>
      <button onClick={onCancel} className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100">
        취소
      </button>
    </span>
  )
}
