import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  open: boolean
  onClose: () => void
  closeOnEsc?: boolean
  closeOnBackdrop?: boolean
  /** 모바일에서 하단 드로어(바텀 시트)로 표시할지. false면 모든 화면에서 중앙 다이얼로그 */
  drawer?: boolean
  /** 시트 내용부 추가 클래스 (예: max-h/overflow) */
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
      className={`fixed inset-0 z-50 flex justify-center bg-black/40 ${
        drawer ? 'items-end sm:items-center sm:p-4' : 'items-center p-4'
      }`}
      onClick={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={sheetRef}
        className={`bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl ${
          drawer
            ? 'w-full rounded-t-2xl sm:max-w-md sm:rounded-xl sm:pb-5'
            : 'w-full max-w-md rounded-xl sm:pb-5'
        } ${contentClassName ?? ''}`}
        style={{
          overscrollBehavior: 'contain',
          transform: dragY !== null ? `translateY(${dragY}px)` : undefined,
          transition:
            dragY !== null
              ? 'none'
              : 'transform 200ms ease-out, margin-bottom 200ms ease-out',
        }}
      >
        {drawer && (
          <div
            className="mb-2 flex cursor-grab touch-none select-none justify-center pb-1 active:cursor-grabbing"
            onPointerDown={(e) => {
              dragStart.current = e.clientY
              setDragY(0)
            }}
            aria-hidden="true"
          >
            <span className="h-1 w-10 rounded-full bg-gray-200 sm:hidden" />
          </div>
        )}
        {children}
      </div>
    </div>
  )

  return createPortal(overlay, document.body)
}
