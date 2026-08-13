import { useEffect, useRef, type ReactNode } from 'react'
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
        style={{ overscrollBehavior: 'contain' }}
      >
        {children}
      </div>
    </div>
  )

  return createPortal(overlay, document.body)
}
