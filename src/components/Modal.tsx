import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  open: boolean
  onClose: () => void
  closeOnEsc?: boolean
  closeOnBackdrop?: boolean
  /** 시트 내용부 추가 클래스 (예: max-h/overflow) */
  contentClassName?: string
  children: ReactNode
}

let scrollLockCount = 0

export function Modal({
  open,
  onClose,
  closeOnEsc = true,
  closeOnBackdrop = true,
  contentClassName,
  children,
}: Props) {
  const sheetRef = useRef<HTMLDivElement>(null)

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

  if (!open) return null

  const overlay = (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={sheetRef}
        className={`w-full rounded-t-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:max-w-md sm:rounded-xl sm:pb-5 ${contentClassName ?? ''}`}
        style={{ overscrollBehavior: 'contain' }}
      >
        {children}
      </div>
    </div>
  )

  return createPortal(overlay, document.body)
}
