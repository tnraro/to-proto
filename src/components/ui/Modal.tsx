import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { beginDrag, createDragSession, endDrag, moveDrag, type DragContext, type DragSession } from '../../lib/dragSession'

interface Props {
  open: boolean
  onClose: () => void
  closeOnEsc?: boolean
  closeOnBackdrop?: boolean
  drawer?: boolean
  contentClassName?: string
  children: ReactNode
}

let scrollLockCount = 0

export function Modal({
  open,
  onClose,
  closeOnEsc = true,
  closeOnBackdrop = true,
  drawer = true,
  contentClassName,
  children,
}: Props) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const sessionRef = useRef<DragSession>(createDragSession())
  const downOnBackdrop = useRef(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const [dragY, setDragY] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    scrollLockCount++
    document.body.style.overflow = 'hidden'
    return () => {
      scrollLockCount--
      if (scrollLockCount <= 0) {
        scrollLockCount = 0
        document.body.style.overflow = ''
      }
    }
  }, [open])

  useEffect(() => {
    if (!open || !closeOnEsc) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closeOnEsc])

  useEffect(() => {
    if (!open) return
    const visual = window.visualViewport
    if (!visual) return
    const onResize = () => {
      const sheet = sheetRef.current
      if (!sheet) return
      const hidden = Math.max(0, window.innerHeight - visual.height - visual.offsetTop)
      sheet.style.marginBottom = hidden > 0 ? `${hidden}px` : ''
    }
    visual.addEventListener('resize', onResize)
    visual.addEventListener('scroll', onResize)
    return () => {
      visual.removeEventListener('resize', onResize)
      visual.removeEventListener('scroll', onResize)
    }
  }, [open])

  useEffect(() => {
    if (!open || !drawer) return
    const sheet = sheetRef.current
    if (!sheet) return

    const container = scrollRef.current
      ? {
          get scrollTop() {
            return scrollRef.current?.scrollTop ?? 0
          },
          contains: (t: unknown) => scrollRef.current?.contains(t as Node | null) ?? false,
        }
      : null
    const ctx = (): DragContext => ({ container, sheetHeight: sheet.offsetHeight })
    const sync = (s: DragSession) => setDragY(s.dragY)
    const applyMove = (y: number) => {
      const r = moveDrag(sessionRef.current, y, ctx())
      sessionRef.current = r.session
      sync(r.session)
    }
    const applyEnd = () => {
      const r = endDrag(sessionRef.current, ctx())
      sessionRef.current = r.session
      sync(r.session)
      if (r.close) onCloseRef.current()
    }

    // Mouse/pen path — touch pointers are ignored here because the touch path
    // below must stay live during native scroll (pointer events get cancelled)
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      sessionRef.current = beginDrag(sessionRef.current, e.target instanceof Element ? e.target : null, e.clientY)
    }
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      applyMove(e.clientY)
    }
    const onPointerEnd = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      applyEnd()
    }

    // Touch path — non-passive move so the session can stop native scroll on takeover
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0]
      if (!t) return
      sessionRef.current = beginDrag(sessionRef.current, e.target instanceof Element ? e.target : null, t.clientY)
    }
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0]
      if (!t) return
      const r = moveDrag(sessionRef.current, t.clientY, ctx())
      sessionRef.current = r.session
      if (r.preventDefault) e.preventDefault()
      sync(r.session)
    }
    const onTouchEnd = () => applyEnd()

    sheet.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerEnd)
    window.addEventListener('pointercancel', onPointerEnd)
    sheet.addEventListener('touchstart', onTouchStart, { passive: true })
    sheet.addEventListener('touchmove', onTouchMove, { passive: false })
    sheet.addEventListener('touchend', onTouchEnd, { passive: true })
    sheet.addEventListener('touchcancel', onTouchEnd, { passive: true })
    return () => {
      sheet.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerEnd)
      window.removeEventListener('pointercancel', onPointerEnd)
      sheet.removeEventListener('touchstart', onTouchStart)
      sheet.removeEventListener('touchmove', onTouchMove)
      sheet.removeEventListener('touchend', onTouchEnd)
      sheet.removeEventListener('touchcancel', onTouchEnd)
      sessionRef.current = createDragSession()
      setDragY(null)
    }
  }, [open, drawer])

  if (!open) return null

  const overlay = (
    <div
      className={`fixed inset-0 z-50 flex justify-center overflow-hidden bg-black/40 ${
        drawer ? 'items-end sm:items-center sm:p-4' : 'items-center p-4'
      }`}
      onPointerDown={(e) => {
        downOnBackdrop.current = e.target === e.currentTarget
      }}
      onPointerUp={(e) => {
        // Backdrop closes only when both pointerdown and pointerup land on the backdrop
        // (so a down-in-sheet / up-outside gesture does not close it)
        if (closeOnBackdrop && downOnBackdrop.current && e.target === e.currentTarget) onCloseRef.current()
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={sheetRef}
        className={`overflow-x-hidden bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-pop ${
          dragY !== null ? 'select-none' : ''
        } ${
          drawer
            ? 'flex max-h-[85vh] w-full flex-col rounded-t-2xl sm:max-w-md sm:rounded-2xl sm:pb-5'
            : 'w-full max-w-md rounded-2xl sm:pb-5'
        }`}
        style={{
          overscrollBehavior: 'contain',
          transform: dragY !== null ? `translateY(${dragY}px)` : undefined,
          transition:
            dragY !== null
              ? 'none'
              : 'transform 200ms ease-out, margin-bottom 200ms ease-out',
        }}
      >
        {drawer ? (
          <>
            <div
              className="-mx-5 -mt-5 mb-2 shrink-0 cursor-grab touch-none select-none px-5 pb-1 pt-4 active:cursor-grabbing sm:hidden"
              aria-hidden="true"
            >
              <div className="mx-auto h-1.5 w-12 rounded-full bg-gray-300" />
            </div>
            <div
              ref={scrollRef}
              className={`min-h-0 flex-1 overflow-y-auto overscroll-contain overflow-x-hidden px-2 -mx-2 ${contentClassName ?? ''}`}
            >
              {children}
            </div>
          </>
        ) : (
          <div className={contentClassName ?? ''}>{children}</div>
        )}
      </div>
    </div>
  )

  return createPortal(overlay, document.body)
}
