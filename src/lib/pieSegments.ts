import { VOMIT_TYPES, type VomitType } from '../types'

export interface PieSegment {
  color: string
  start: number
  end: number
}

/** Converts type counts into proportional conic-gradient segments (all types, input order) */
export function pieSegments(items: { type: VomitType; count: number }[]): PieSegment[] {
  const total = items.reduce((s, x) => s + x.count, 0)
  if (total === 0) return []
  let acc = 0
  return items.map(({ type, count }) => {
    const start = (acc / total) * 100
    acc += count
    const end = (acc / total) * 100
    return { color: VOMIT_TYPES[type].hex, start, end }
  })
}
