import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  open: boolean
  onClose: () => void
  closeOnEsc?: boolean
  closeOnBackdrop?: boolean
  /** Bottom-sheet on mobile; centered dialog on all screens when false */
  drawer?: boolean
  /** Extra classes for the sheet content (e.g. max-h/overflow) */
  contentClassName?: string
  children: ReactNode
}

let scrollLockCount = 0

const DRAG_CLOSE_RATIO = 0.25

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
  const dragStart = useRef<number | null>(null)
  const downOnBackdrop = useRef(false)
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
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closeOnEsc, onClose])

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
    if (dragY === null) return
    const onMove = (e: PointerEvent) => {
      if (dragStart.current === null) return
      setDragY(Math.max(0, e.clientY - dragStart.current))
    }
    const onUp = () => {
      const sheet = sheetRef.current
      const threshold = sheet ? sheet.offsetHeight * DRAG_CLOSE_RATIO : 0
      const willClose = dragStart.current !== null && dragY !== null && dragY > threshold
      dragStart.current = null
      setDragY(null)
      if (willClose) onClose()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [dragY, onClose])

  if (!open) return null

  const overlay = (
    <div
      className={`fixed inset-0 z-50 flex justify-center overflow-x-hidden bg-black/40 ${
        drawer ? 'items-end sm:items-center sm:p-4' : 'items-center p-4'
      }`}
      onPointerDown={(e) => {
        downOnBackdrop.current = e.target === e.currentTarget
      }}
      onPointerUp={(e) => {
        // Backdrop closes only when both pointerdown and pointerup land on the backdrop
        // (so a down-in-sheet / up-outside gesture does not close it)
        if (closeOnBackdrop && downOnBackdrop.current && e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={sheetRef}
        className={`overflow-x-hidden bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-pop ${
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
              onPointerDown={(e) => {
                dragStart.current = e.clientY
                setDragY(0)
              }}
              aria-hidden="true"
            >
              <div className="mx-auto h-1.5 w-12 rounded-full bg-gray-300" />
            </div>
            <div
              className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 -mx-2 ${contentClassName ?? ''}`}
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
