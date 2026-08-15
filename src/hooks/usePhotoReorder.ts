import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Track move/up at window level so dragging outside a thumbnail still works.
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
