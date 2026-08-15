import { useCallback, useState } from 'react'
import type { BaseDraft } from '../types'
import { deleteDraft, loadValidDraft, uid } from '../lib/storage'
import { loadPhotoItems, type PhotoItem } from '../lib/photos'

/** Draft fields shared by both form drafts — the opener only needs these for restore */
export interface ResolvedFormDraft extends BaseDraft {
  datetime: string
  memo: string
  newPhotos: { id: string; blob: Blob }[]
  removedPhotos: string[]
}

export interface FormOpenState<T> {
  /** 'add' or target id — draft save context */
  context: string
  values: T
  photoItems: PhotoItem[]
  /** Target's photo ids before any edit (basis for removed-photo tracking) */
  originalPhotoIds: string[]
}

interface OpenParams<TEntity extends { id: string }, TValues, TDraft extends ResolvedFormDraft> {
  target: TEntity | null
  values: (target: TEntity | null, draft: TDraft | null, now: Date) => TValues
  photoIds: (target: TEntity | null) => string[]
}

/**
 * Modal form opener: resolves the draft (load, TTL/applyTo guard, restore confirm),
 * loads photo blobs, and only then mounts the form with fully resolved initial state.
 */
export function useFormOpener<TEntity extends { id: string }, TValues, TDraft extends ResolvedFormDraft>(
  draftId: 'record' | 'marker',
) {
  const [state, setState] = useState<FormOpenState<TValues> | null>(null)

  const open = useCallback(
    async ({ target, values, photoIds }: OpenParams<TEntity, TValues, TDraft>) => {
      const context = target?.id ?? 'add'
      let draft = await loadValidDraft<TDraft>(draftId, context)
      if (draft && !confirm('이전에 작성 중이던 내용이 있습니다. 불러올까요?')) {
        void deleteDraft(draftId)
        draft = null
      }
      const originalPhotoIds = photoIds(target)
      const keptIds = draft ? originalPhotoIds.filter((id) => !draft.removedPhotos.includes(id)) : originalPhotoIds
      const photoItems = await loadPhotoItems(keptIds)
      setState({
        context,
        values: values(target, draft, new Date()),
        photoItems: [...photoItems, ...(draft?.newPhotos ?? []).map((p) => ({ key: uid(), blob: p.blob }))],
        originalPhotoIds,
      })
    },
    [draftId],
  )

  const close = useCallback(() => setState(null), [])

  return { state, open, close }
}
