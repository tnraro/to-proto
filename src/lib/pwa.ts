import { useSyncExternalStore } from 'react'
import { registerSW } from 'virtual:pwa-register'

export type PwaStatus = 'unsupported' | 'up-to-date' | 'update-ready'

let status: PwaStatus = 'up-to-date'
const listeners = new Set<() => void>()

function setStatus(next: PwaStatus): void {
  if (status === next) return
  status = next
  for (const fn of listeners) fn()
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function usePwaStatus(): PwaStatus {
  return useSyncExternalStore(subscribe, () => status)
}

let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null

/** 앱 시작 시 1회 호출. 서비스워커 등록과 업데이트 상태 추적을 시작한다 */
export function initPwa(): void {
  if (!('serviceWorker' in navigator)) return
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh: () => setStatus('update-ready'),
    onOfflineReady: () => {},
    onRegisteredSW: (_swUrl, registration) => {
      // 이미 대기 중인 새 버전이 있으면 업데이트 가능 상태로 시작
      setStatus(registration?.waiting ? 'update-ready' : 'up-to-date')
    },
    onRegisterError: () => setStatus('unsupported'),
  })
}

export async function checkForUpdate(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const reg = await navigator.serviceWorker.getRegistration()
  await reg?.update()
}

/** 새 버전 적용 (skipWaiting 후 페이지 새로고침) */
export function applyUpdate(): void {
  void updateSW?.(true)
}
