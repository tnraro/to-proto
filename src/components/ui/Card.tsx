import type { ReactNode } from 'react'

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-card border border-gray-100 bg-white p-4 shadow-card ${className ?? ''}`}
    >
      {children}
    </div>
  )
}
