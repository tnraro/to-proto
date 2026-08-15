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
  photoId?: string
}

export interface VomitRecord {
  id: string
  datetime: string // ISO
  catId: string
  types: VomitType[]
  /** Photo id array (bodies live in the photos store) */
  photos: string[]
  memo: string
  createdAt: string
  updatedAt: string
}

export interface ThresholdRule {
  id: string
  catId: string | null
  windowDays: number
  maxCount: number
  type: VomitType | null
  enabled: boolean
}

/** Persisted alert history. Stored as a snapshot so it stays readable after rule/cat changes */
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

/** Common property of time-based data — time-based sort/group/filter share this interface */
export interface TimeSeriesItem {
  datetime: string // ISO
}

/** Timeline render union — datetime lives only in payload (single source of truth) */
export type TimelineItem =
  | { kind: 'record'; payload: VomitRecord }
  | { kind: 'marker'; payload: Marker }

export interface MarkerType {
  id: string
  name: string
}

/** Causal-analysis marker (vet visit, food switch, etc.) */
export interface Marker {
  id: string
  datetime: string // ISO
  typeId: string
  catIds: string[]
  memo?: string
  /** Photo id array (0+, unlimited — bodies live in the photos store) */
  photos: string[]
  createdAt: string
  updatedAt: string
}

/** Marker input. photos in final order: existing = id, new = blob */
export type MarkerInput = Omit<Marker, 'id' | 'createdAt' | 'updatedAt' | 'photos'> & {
  photos?: Array<string | Blob>
}

/** Common draft base — form drafts inherit it and use id as the form key */
export interface BaseDraft {
  /** 'add' or target id — context guard on restore */
  applyTo: 'add' | string
  savedAt: number
}

/** Record form mistake-prevention draft */
export interface RecordDraft extends BaseDraft {
  id: 'record'
  datetime: string
  catId: string
  types: VomitType[]
  memo: string
  newPhotos: { id: string; blob: Blob }[]
  removedPhotos: string[]
}

/** Marker form mistake-prevention draft */
export interface MarkerDraft extends BaseDraft {
  id: 'marker'
  datetime: string
  typeId: string
  catIds: string[]
  memo: string
  newPhotos: { id: string; blob: Blob }[]
  removedPhotos: string[]
}

/** Record form input. photos in final order: existing = id, new = blob (drag order) */
export type RecordInput = Omit<VomitRecord, 'id' | 'createdAt' | 'updatedAt' | 'photos'> & {
  photos?: Array<string | Blob>
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
