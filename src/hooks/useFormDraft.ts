import { useCallback, useEffect, useRef, useState } from 'react'
import type { BaseDraft } from '../types'
import { deleteDraft, saveDraft } from '../lib/storage'

const DRAFT_SAVE_MS = 500

export interface FormDraftState {
  /** User changed the form this session — basis for the close confirm */
  hasDraft: boolean
  /** Call when the form state actually changed (render-independent, stable ref) */
  onStateChange: () => void
  /** Delete the draft with saving suppressed so the unmount flush does not re-save */
  discard: () => void
}

/**
 * Draft autosave for form sessions. The form initializes state from the resolved
 * initial (opener), so the first snapshot is the baseline and only real user
 * changes trigger a save.
 */
export function useFormDraft<T extends BaseDraft>(
  id: string,
  deps: readonly unknown[],
  buildDraft: () => Omit<T, 'id' | 'savedAt'>,
): FormDraftState {
  const [hasDraft, setHasDraft] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const suppressSaveRef = useRef(false)
  const baselineRef = useRef<string | undefined>(undefined)
  const depsRef = useRef(deps)
  depsRef.current = deps
  const buildDraftRef = useRef(buildDraft)
  buildDraftRef.current = buildDraft

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveTimer.current = undefined
      baselineRef.current = JSON.stringify(depsRef.current)
      void saveDraft({ ...buildDraftRef.current(), id, savedAt: Date.now() } as T & { id: string })
    }, DRAFT_SAVE_MS)
  }, [id])

  const onStateChange = useCallback(() => {
    const snapshot = JSON.stringify(depsRef.current)
    if (baselineRef.current === undefined) {
      baselineRef.current = snapshot
      return
    }
    if (snapshot === baselineRef.current) return
    setHasDraft(true)
    scheduleSave()
  }, [scheduleSave])

  useEffect(() => {
    return () => {
      if (suppressSaveRef.current) return
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
        baselineRef.current = JSON.stringify(depsRef.current)
        void saveDraft({ ...buildDraftRef.current(), id, savedAt: Date.now() } as T & { id: string })
      }
    }
  }, [id])

  const discard = useCallback(() => {
    suppressSaveRef.current = true
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = undefined
    setHasDraft(false)
    void deleteDraft(id)
  }, [id])

  return { hasDraft, onStateChange, discard }
}
