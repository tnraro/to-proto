import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

interface Props {
  content: ReactNode
  children: ReactNode
}

export function Tooltip({ content, children }: Props) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; below: boolean } | null>(null)
  const wrapRef = useRef<HTMLSpanElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    if (!show) return
    const onScroll = () => setShow(false)
    window.addEventListener('scroll', onScroll, true)
    return () => window.removeEventListener('scroll', onScroll, true)
  }, [show])

  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
  }, [])

  const place = () => {
    const el = wrapRef.current
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
        ref={wrapRef}
        onPointerEnter={showTooltip}
        onPointerLeave={hideNow}
        onPointerDown={showTooltip}
        onPointerUp={scheduleHide}
      >
        {children}
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
            {content}
          </div>,
          document.body,
        )}
    </>
  )
}