import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export interface DropdownItem {
  label: string
  danger?: boolean
  onClick: () => void
}

interface Props {
  items: DropdownItem[]
  /** 항목 선택 전 추가 동작 (예: 파일 선택기 열기) — 메뉴는 항상 닫음 */
  beforeClose?: () => void
  ariaLabel?: string
}

const MENU_WIDTH = 128

export function DropdownMenu({ items, beforeClose, ariaLabel = '메뉴' }: Props) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onScroll = () => setOpen(false)
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  const toggle = () => {
    if (open) {
      setOpen(false)
      return
    }
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    const left = Math.max(8, Math.min(rect.left + rect.width - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8))
    setPos({ top: rect.bottom + 4, left })
    setOpen(true)
  }

  const run = (item: DropdownItem) => {
    setOpen(false)
    beforeClose?.()
    item.onClick()
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        className="flex h-11 w-9 shrink-0 items-center justify-center self-start rounded text-gray-400 hover:bg-gray-100"
        aria-label={ariaLabel}
      >
        ⋮
      </button>
      {open &&
        pos &&
        createPortal(
          <div ref={menuRef} className="fixed z-50" style={{ top: pos.top, left: pos.left }}>
            <div className="w-32 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-pop">
              {items.map((item) => (
                <button
                  key={item.label}
                  onClick={() => run(item)}
                  className={`block min-h-11 w-full px-4 text-left text-sm ${
                    item.danger ? 'text-red-500 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
