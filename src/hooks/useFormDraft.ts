import { useCallback, useEffect, useRef, useState } from 'react'
import type { BaseDraft } from '../types'
import { deleteDraft as deleteDraftStore, loadDraft, saveDraft } from '../lib/storage'

const DRAFT_TTL_MS = 30 * 60 * 1000
const DRAFT_SAVE_MS = 500

export interface FormDraftState<T extends BaseDraft> {
  /** 복원 완료 여부 — 저장은 이 후에 시작한다 */
  ready: boolean
  /** 유효한(컨텍스트 일치 + TTL 내) 복원용 draft */
  restored: (T & { id: string }) | null
  /** 이번 세션에서 draft가 저장/복원됨 — confirm 표시 기준 */
  hasDraft: boolean
  /** 폼 상태가 실제로 바뀌었을 때 호출 (렌더와 무관, 안정 참조) */
  onStateChange: () => void
  /** draft 삭제 (제출 시) */
  deleteDraft: () => void
  /** 저장 억제 후 draft 삭제 — 언마운트 flush가 재저장하지 않도록 한다 (확인 후 나가기) */
  discard: () => void
}

/**
 * 폼 draft 공통 로직: 로드·복원(TTL/applyTo 가드), 실제 상태 변경 시 디바운스 저장, 삭제.
 * onStateChange는 베이스라인 스냅샷과 비교해 실변경일 때만 저장하므로
 * 마운트/StrictMode/리렌더 phantom이 발생하지 않는다.
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
    // 이전 타이머를 먼저 정리 — 어떤 시점에도 타이머는 최대 1개 (discard 정리 보장)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveTimer.current = undefined
      baselineRef.current = JSON.stringify(depsRef.current)
      void saveDraft({ ...buildDraftRef.current(), id, savedAt: Date.now() } as T & { id: string })
    }, DRAFT_SAVE_MS)
  }, [id])

  /** 실제 변경(베이스라인 대비)일 때만 저장 스케줄 — 마운트·StrictMode 호출은 무시된다 */
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
      // ready 전 변경 — ready 플립 시 저장
      pendingChangeRef.current = true
    }
  }, [scheduleSave])

  // ready 플립: ready 전에 변경된 내용이 있으면 저장
  useEffect(() => {
    if (!ready || !pendingChangeRef.current) return
    pendingChangeRef.current = false
    const snapshot = JSON.stringify(depsRef.current)
    if (snapshot === baselineRef.current) return
    scheduleSave()
  }, [ready, scheduleSave])

  // 언마운트 시 대기 중인 저장 flush (StrictMode 이중 마운트는 ready 전이라 스킵)
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
