import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatAbsoluteTime, formatRelativeTime } from '../../lib/dates'

interface Props {
  iso: string
  /** 표시기 스타일 (기본: 통일된 작은 회색 텍스트) */
  className?: string
}

const DEFAULT_CLASS = 'text-xs text-gray-500'

export function RelativeTime({ iso, className = DEFAULT_CLASS }: Props) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; below: boolean } | null>(null)
  const spanRef = useRef<HTMLSpanElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    if (!show) return
    const onScroll = () => setShow(false)
    window.addEventListener('scroll', onScroll, true)
    return () => window.removeEventListener('scroll', onScroll, true)
  }, [show])

  const place = () => {
    const el = spanRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const below = rect.top < 48
    const top = below ? rect.bottom : rect.top
    const left = Math.min(Math.max(rect.left + rect.width / 2, 60), window.innerWidth - 60)
    setPos({ top, left, below })
  }

  const showTooltip = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    place()
    setShow(true)
  }

  const scheduleHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setShow(false), 2000)
  }

  const hideNow = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setShow(false)
  }

  return (
    <>
      <span
        ref={spanRef}
        className={className}
        onPointerEnter={showTooltip}
        onPointerLeave={hideNow}
        onPointerDown={showTooltip}
        onPointerUp={scheduleHide}
      >
        {formatRelativeTime(iso)}
      </span>
      {show &&
        pos &&
        createPortal(
          <div
            className="pointer-events-none fixed z-50 rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs text-white shadow-pop"
            style={{
              top: pos.top,
              left: pos.left,
              transform: pos.below ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
              marginTop: pos.below ? 8 : -8,
            }}
          >
            {formatAbsoluteTime(iso)}
          </div>,
          document.body,
        )}
    </>
  )
}
