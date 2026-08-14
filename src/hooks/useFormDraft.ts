import { useEffect, useRef, useState } from 'react'
import type { BaseDraft } from '../types'
import { deleteDraft as deleteDraftStore, loadDraft, saveDraft } from '../lib/storage'

const DRAFT_TTL_MS = 30 * 60 * 1000
const DRAFT_SAVE_MS = 500

export interface FormDraftState<T extends BaseDraft> {
  /** 복원 완료 여부 — 저장은 이 후에 시작한다 */
  ready: boolean
  /** 유효한(컨텍스트 일치 + TTL 내) 복원용 draft */
  restored: (T & { id: string }) | null
  /** draft 삭제 (제출/취소 시) */
  deleteDraft: () => void
}

/**
 * 폼 draft 공통 로직: 로드·복원(TTL/applyTo 가드), 상태 변경 시 디바운스 저장, 삭제.
 * ready 전환도 저장을 트리거하며, 언마운트 시 대기 중인 저장을 flush한다.
 * 폼별로 id(폼 키), applyTo(신규 'add' | 수정 대상 id), buildDraft(현재 상태 스냅샷)를 제공한다.
 */
export function useFormDraft<T extends BaseDraft>(
  id: string,
  applyTo: string,
  deps: readonly unknown[],
  buildDraft: () => Omit<T, 'id' | 'savedAt'>,
): FormDraftState<T> {
  const [ready, setReady] = useState(false)
  const [restored, setRestored] = useState<(T & { id: string }) | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const readyRef = useRef(false)
  readyRef.current = ready
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
      } else if (draft && Date.now() - draft.savedAt > DRAFT_TTL_MS) {
        void deleteDraftStore(id)
      }
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 마운트 시 1회만
  }, [id, applyTo])

  useEffect(() => {
    if (!ready) return
    saveTimer.current = setTimeout(() => {
      saveTimer.current = undefined
      void saveDraft({ ...buildDraftRef.current(), id, savedAt: Date.now() } as T & { id: string })
    }, DRAFT_SAVE_MS)
    return () => clearTimeout(saveTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ready·deps 변화 시 저장
  }, [ready, ...deps])

  // 언마운트 시 대기 중인 저장 flush (StrictMode 이중 마운트는 ready 전이라 스킵)
  useEffect(() => {
    return () => {
      if (saveTimer.current && readyRef.current) {
        clearTimeout(saveTimer.current)
        void saveDraft({ ...buildDraftRef.current(), id, savedAt: Date.now() } as T & { id: string })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 언마운트 시 1회만
  }, [])

  const remove = () => {
    void deleteDraftStore(id)
  }

  return { ready, restored, deleteDraft: remove }
}
