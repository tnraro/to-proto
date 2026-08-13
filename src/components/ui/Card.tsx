import type { ReactNode } from 'react'

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-card border border-gray-100 bg-white shadow-card ${className ?? ''}`}>
      {children}
    </div>
  )
}
