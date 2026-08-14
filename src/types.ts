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
  /** 고양이 사진 id (없으면 아바타 placeholder) */
  photoId?: string
}

export interface VomitRecord {
  id: string
  datetime: string // ISO
  catId: string
  /** 토 종류 (1건에 여러 종류 가능) */
  types: VomitType[]
  /** 사진 id 배열 (본체는 photos 스토어) */
  photos: string[]
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

/** 시간축 데이터의 공통 속성 — 시간 기반 정렬/그룹/필터는 이 인터페이스로 공유 */
export interface TimeSeriesItem {
  datetime: string // ISO
}

/** 타임라인 렌더링용 유니언 — datetime은 payload에만 존재 (단일 진실) */
export type TimelineItem =
  | { kind: 'record'; payload: VomitRecord }
  | { kind: 'marker'; payload: Marker }

/** 사용자가 자유롭게 CRUD하는 마커 종류 */
export interface MarkerType {
  id: string
  name: string
}

/** 인과 관계 파악용 마커 (건강 검진, 사료 교체 등) */
export interface Marker {
  id: string
  datetime: string // ISO
  typeId: string
  /** 연관 고양이 (복수) */
  catIds: string[]
  /** 선택 */
  memo?: string
  /** 사진 id 배열 (0개 이상, 제한 없음 — 본체는 photos 스토어) */
  photos: string[]
  createdAt: string
  updatedAt: string
}

/** 마커 입력. photos는 최종 순서: 기존 사진은 id, 새 사진은 blob */
export type MarkerInput = Omit<Marker, 'id' | 'createdAt' | 'updatedAt' | 'photos'> & {
  photos?: Array<string | Blob>
}

/** draft 공통 기반 — 폼별 draft는 이 인터페이스를 상속하고 id를 폼 키로 쓴다 */
export interface BaseDraft {
  /** 'add' 또는 수정 대상 id — 복원 시 컨텍스트 가드 */
  applyTo: 'add' | string
  /** 저장 시각(epoch ms) — 30분 만료 판정 */
  savedAt: number
}

/** 기록 폼 실수 방지용 draft */
export interface RecordDraft extends BaseDraft {
  id: 'record'
  datetime: string
  catId: string
  types: VomitType[]
  memo: string
  /** 새로 추가한 사진 Blob */
  newPhotos: { id: string; blob: Blob }[]
  /** 편집 중 제거한 기존 사진 id */
  removedPhotos: string[]
}

/** 마커 폼 실수 방지용 draft */
export interface MarkerDraft extends BaseDraft {
  id: 'marker'
  datetime: string
  typeId: string
  catIds: string[]
  memo: string
  /** 새로 추가한 사진 Blob (무제한) */
  newPhotos: { id: string; blob: Blob }[]
  /** 편집 중 제거한 기존 사진 id */
  removedPhotos: string[]
}

/** 기록 폼 입력. photos는 최종 순서: 기존 사진은 id, 새 사진은 blob (드래그 순서 반영) */
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
