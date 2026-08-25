import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

interface Props {
  content: ReactNode
  children: ReactNode
}

export function Tooltip({ content, children }: Props) {
  const [show, setShow] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; below: boolean } | null>(null)
  const wrapRef = useRef<HTMLSpanElement>(null)
  const tooltipId = useId()

  useEffect(() => {
    if (!show) return
    const onScroll = () => {
      setShow(false)
      setPinned(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShow(false)
        setPinned(false)
      }
    }
    const onPointerDownOutside = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShow(false)
        setPinned(false)
      }
    }
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('pointerdown', onPointerDownOutside, true)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('pointerdown', onPointerDownOutside, true)
    }
  }, [show])

  const place = () => {
    const el = wrapRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const below = rect.top < 48
    const top = below ? rect.bottom : rect.top
    const left = Math.min(Math.max(rect.left + rect.width / 2, 60), window.innerWidth - 60)
    setPos({ top, left, below })
  }

  const showHovered = () => {
    place()
    setShow(true)
  }

  const showPinned = () => {
    place()
    setPinned(true)
    setShow(true)
  }

  const hideNow = () => {
    if (pinned) return
    setShow(false)
  }

  return (
    <>
      <span
        ref={wrapRef}
        tabIndex={0}
        aria-describedby={show ? tooltipId : undefined}
        onPointerEnter={showHovered}
        onPointerLeave={hideNow}
        onPointerDown={showPinned}
        onFocus={showHovered}
        onBlur={hideNow}
      >
        {children}
      </span>
      {show &&
        pos &&
        createPortal(
          <div
            id={tooltipId}
            role="tooltip"
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