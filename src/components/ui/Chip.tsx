import type { ReactNode } from 'react'

interface Props {
  selected: boolean
  onClick: () => void
  children: ReactNode
  className?: string
}

export function Chip({ selected, onClick, children, className }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-9 rounded-full px-3 text-sm transition ${
        selected
          ? 'bg-primary text-white shadow-sm'
          : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
      } ${className ?? ''}`}
    >
      {children}
    </button>
  )
}
