export type VomitType =
  | 'food'
  | 'hairball'
  | 'foam'
  | 'liquid'
  | 'bile'
  | 'brown'
  | 'bloody'
  | 'other'

export interface Cat {
  id: string
  name: string
}

export interface VomitRecord {
  id: string
  datetime: string // ISO
  catId: string
  type: VomitType
  memo: string
  createdAt: string
  updatedAt: string
}

export interface ThresholdRule {
  id: string
  /** null = 모든 고양이 */
  catId: string | null
  /** 집계 기간(일) */
  windowDays: number
  /** 이 기간 내 최대 허용 횟수 (초과 시 경고) */
  maxCount: number
  /** null = 종류 무관 */
  type: VomitType | null
  enabled: boolean
}

/** 저장되는 경고 이력. 규칙/고양이 변경에도 읽을 수 있도록 스냅샷 저장 */
export interface AlertEntry {
  id: string
  ruleId: string
  createdAt: string
  catName: string
  typeLabel: string
  windowDays: number
  maxCount: number
  count: number
}

export interface TypeMeta {
  label: string
  /** tailwind bg color class for chips */
  color: string
  /** actual color value for SVG charts */
  hex: string
  /** darker tailwind text color class */
  text: string
  /** border color for selected buttons */
  ring: string
}

export const VOMIT_TYPES: Record<VomitType, TypeMeta> = {
  food: { label: '사료(미소화)', color: 'bg-orange-400', hex: '#fb923c', text: 'text-orange-500', ring: 'ring-orange-400' },
  hairball: { label: '헤어볼', color: 'bg-purple-400', hex: '#c084fc', text: 'text-purple-500', ring: 'ring-purple-400' },
  foam: { label: '거품', color: 'bg-sky-400', hex: '#38bdf8', text: 'text-sky-500', ring: 'ring-sky-400' },
  liquid: { label: '맑은 액체', color: 'bg-blue-400', hex: '#60a5fa', text: 'text-blue-500', ring: 'ring-blue-400' },
  bile: { label: '담즙(노랑)', color: 'bg-yellow-400', hex: '#facc15', text: 'text-yellow-500', ring: 'ring-yellow-400' },
  brown: { label: '갈색', color: 'bg-amber-700', hex: '#b45309', text: 'text-amber-700', ring: 'ring-amber-700' },
  bloody: { label: '피 섞임', color: 'bg-red-500', hex: '#ef4444', text: 'text-red-500', ring: 'ring-red-500' },
  other: { label: '기타', color: 'bg-gray-400', hex: '#9ca3af', text: 'text-gray-500', ring: 'ring-gray-400' },
}

export const VOMIT_TYPE_KEYS = Object.keys(VOMIT_TYPES) as VomitType[]
