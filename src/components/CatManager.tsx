import { useRef, useState } from 'react'
import type { Cat } from '../types'
import { putPhoto, uid } from '../lib/storage'
import { resizeImage } from '../lib/image'
import { CatAvatar } from './CatAvatar'

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
        className="min-h-11 w-full rounded-lg border-2 border-dashed border-emerald-300 bg-emerald-50 font-medium text-emerald-700 hover:bg-emerald-100"
      >
        + 고양이 추가
      </button>

      <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
        {cats.map((cat) => (
          <li key={cat.id} className="flex items-center justify-between gap-2 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <CatAvatar cat={cat} />
              <span className="truncate font-medium">{cat.name}</span>
            </div>
            <div className="flex shrink-0 gap-2">
              <CatPhotoButton cat={cat} onUpdate={(photoId) => updateCatPhoto(cat.id, photoId)} />
              <EditCatName catName={cat.name} onSave={(n) => renameCat(cat.id, n)} />
              <button
                onClick={() => {
                  if (confirm(`'${cat.name}' 고양이와 기록을 모두 삭제할까요?`)) deleteCat(cat.id)
                }}
                className="rounded px-2 py-1 text-sm text-red-500 hover:bg-red-50"
              >
                삭제
              </button>
            </div>
          </li>
        ))}
        {cats.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-gray-400">등록된 고양이가 없습니다</li>
        )}
      </ul>
    </div>
  )
}

function CatPhotoButton({ cat, onUpdate }: { cat: Cat; onUpdate: (photoId?: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)

  const onFile = async (file: File | undefined) => {
    if (!file) return
    const photoId = uid()
    await putPhoto(photoId, await resizeImage(file))
    onUpdate(photoId)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <>
      <button
        onClick={() => fileRef.current?.click()}
        className="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
        title={cat.photoId ? '사진 변경' : '사진 추가'}
      >
        {cat.photoId ? '사진 변경' : '사진 추가'}
      </button>
      {cat.photoId && (
        <button
          onClick={() => onUpdate(undefined)}
          className="rounded px-2 py-1 text-sm text-red-500 hover:bg-red-50"
        >
          사진 삭제
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
    </>
  )
}

function EditCatName({ catName, onSave }: { catName: string; onSave: (name: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(catName)

  const save = () => {
    if (name.trim()) {
      onSave(name)
      setEditing(false)
    }
  }

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100">
        이름 변경
      </button>
    )
  }

  return (
    <span className="flex gap-1">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && save()}
        className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
      />
      <button onClick={save} className="rounded bg-emerald-600 px-2 py-1 text-xs text-white">
        저장
      </button>
    </span>
  )
}
