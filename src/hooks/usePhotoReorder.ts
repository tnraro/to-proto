import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 썸네일 전체 드래그 순서 변경.
 * 포인터가 썸네일 밖으로 나가도 move/up을 받도록 window 레벨로 추적하며,
 * 제거 버튼에서 시작한 터치는 드래그로 취급하지 않는다.
 * 핸들러는 ref를 통해 항상 최신 onReorder를 참조하므로 렌더와 무관하게 안정적이다.
 */
export function usePhotoReorder(onReorder: (fromKey: string, toKey: string) => void) {
  const onReorderRef = useRef(onReorder)
  onReorderRef.current = onReorder
  const dragKeyRef = useRef<string | null>(null)
  const [dragKey, setDragKey] = useState<string | null>(null)

  const onWindowPointerMove = useCallback((e: PointerEvent) => {
    const fromKey = dragKeyRef.current
    if (!fromKey) return
    const hit = document
      .elementsFromPoint(e.clientX, e.clientY)
      .find((n) => n instanceof HTMLElement && n.hasAttribute('data-photo-key')) as HTMLElement | undefined
    const toKey = hit?.getAttribute('data-photo-key')
    if (!toKey || toKey === fromKey) return
    onReorderRef.current(fromKey, toKey)
  }, [])

  const onWindowPointerEnd = useCallback(() => {
    dragKeyRef.current = null
    setDragKey(null)
    window.removeEventListener('pointermove', onWindowPointerMove)
    window.removeEventListener('pointerup', onWindowPointerEnd)
    window.removeEventListener('pointercancel', onWindowPointerEnd)
  }, [onWindowPointerMove])

  const onThumbPointerDown = useCallback(
    (e: React.PointerEvent, key: string) => {
      if ((e.target as HTMLElement).closest('button')) return
      e.preventDefault()
      dragKeyRef.current = key
      setDragKey(key)
      window.addEventListener('pointermove', onWindowPointerMove)
      window.addEventListener('pointerup', onWindowPointerEnd)
      window.addEventListener('pointercancel', onWindowPointerEnd)
    },
    [onWindowPointerMove, onWindowPointerEnd],
  )

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', onWindowPointerMove)
      window.removeEventListener('pointerup', onWindowPointerEnd)
      window.removeEventListener('pointercancel', onWindowPointerEnd)
    }
  }, [onWindowPointerMove, onWindowPointerEnd])

  return { dragKey, onThumbPointerDown }
}
