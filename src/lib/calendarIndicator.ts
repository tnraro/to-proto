export type CalendarIndicator = 'summary' | 'count' | 'pie'

export const CALENDAR_INDICATOR_KEY = 'calendar.recordCount'
export const DEFAULT_CALENDAR_INDICATOR: CalendarIndicator = 'summary'

export const CALENDAR_INDICATOR_OPTIONS: { value: CalendarIndicator; label: string }[] = [
  { value: 'summary', label: '종류 요약' },
  { value: 'count', label: '기록 수' },
  { value: 'pie', label: '원 그래프' },
]

/** Parses the stored flag; legacy boolean values ('1'/'0') map to the behavior they last shipped with */
export function parseCalendarIndicator(raw: string | null): CalendarIndicator {
  if (raw === 'summary' || raw === 'count' || raw === 'pie') return raw
  if (raw === '1') return 'pie'
  return DEFAULT_CALENDAR_INDICATOR
}
