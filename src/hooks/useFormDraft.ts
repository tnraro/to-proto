import { useCallback, useEffect, useRef, useState } from 'react'
import type { BaseDraft } from '../types'
import { deleteDraft as deleteDraftStore, loadDraft, saveDraft } from '../lib/storage'

const DRAFT_TTL_MS = 30 * 60 * 1000
const DRAFT_SAVE_MS = 500

export interface FormDraftState<T extends BaseDraft> {
  /** Restore finished — saving starts only after this */
  ready: boolean
  /** Restorable draft (context matches + within TTL) */
  restored: (T & { id: string }) | null
  /** Draft saved/restored this session — basis for the confirm prompt */
  hasDraft: boolean
  /** Call when the form state actually changed (render-independent, stable ref) */
  onStateChange: () => void
  deleteDraft: () => void
  /** Delete the draft with saving suppressed so the unmount flush does not re-save */
  discard: () => void
}

/**
 * Shared form-draft logic: load/restore (TTL/applyTo guards), debounced save on real
 * state changes, delete. onStateChange saves only on real changes vs the baseline
 * snapshot, so mount/StrictMode/re-render phantoms never fire.
 */
export function useFormDraft<T extends BaseDraft>(
  id: string,
  applyTo: string,
  deps: readonly unknown[],
  buildDraft: () => Omit<T, 'id' | 'savedAt'>,
): FormDraftState<T> {
  const [ready, setReady] = useState(false)
  const [restored, setRestored] = useState<(T & { id: string }) | null>(null)
  const [hasDraft, setHasDraft] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const readyRef = useRef(false)
  readyRef.current = ready
  const suppressSaveRef = useRef(false)
  const pendingChangeRef = useRef(false)
  const depsRef = useRef(deps)
  depsRef.current = deps
  const baselineRef = useRef<string | undefined>(undefined)
  const buildDraftRef = useRef(buildDraft)
  buildDraftRef.current = buildDraft

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const draft = await loadDraft<T>(id)
      if (cancelled) return
      const valid = draft && draft.applyTo === applyTo && Date.now() - draft.savedAt <= DRAFT_TTL_MS
      if (valid) {
        setRestored(draft)
        setHasDraft(true)
      } else if (draft && Date.now() - draft.savedAt > DRAFT_TTL_MS) {
        void deleteDraftStore(id)
      }
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [id, applyTo])

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveTimer.current = undefined
      baselineRef.current = JSON.stringify(depsRef.current)
      void saveDraft({ ...buildDraftRef.current(), id, savedAt: Date.now() } as T & { id: string })
    }, DRAFT_SAVE_MS)
  }, [id])

  /** Save only on real changes (vs baseline) — mount/StrictMode calls are ignored */
  const onStateChange = useCallback(() => {
    const snapshot = JSON.stringify(depsRef.current)
    if (baselineRef.current === undefined) {
      baselineRef.current = snapshot
      return
    }
    if (snapshot === baselineRef.current) return
    setHasDraft(true)
    if (readyRef.current) {
      scheduleSave()
    } else {
      pendingChangeRef.current = true
    }
  }, [scheduleSave])

  useEffect(() => {
    if (!ready || !pendingChangeRef.current) return
    pendingChangeRef.current = false
    const snapshot = JSON.stringify(depsRef.current)
    if (snapshot === baselineRef.current) return
    scheduleSave()
  }, [ready, scheduleSave])

  useEffect(() => {
    return () => {
      if (suppressSaveRef.current) return
      if (saveTimer.current && readyRef.current) {
        clearTimeout(saveTimer.current)
        baselineRef.current = JSON.stringify(depsRef.current)
        void saveDraft({ ...buildDraftRef.current(), id, savedAt: Date.now() } as T & { id: string })
      }
    }
  }, [id])

  const remove = useCallback(() => {
    suppressSaveRef.current = true
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = undefined
    setHasDraft(false)
    void deleteDraftStore(id)
  }, [id])

  return { ready, restored, hasDraft, onStateChange, deleteDraft: remove, discard: remove }
}
