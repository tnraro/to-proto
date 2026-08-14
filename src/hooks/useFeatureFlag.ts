import { useCallback, useState } from 'react'

/** localStorage 기반 feature flag — 토글 시 즉시 반영, 새로고침 후 유지 */
export function useFeatureFlag(key: string, defaultValue: boolean): [boolean, (v: boolean) => void] {
  const [value, setValue] = useState(() => {
    const raw = localStorage.getItem(key)
    return raw === null ? defaultValue : raw === '1'
  })

  const set = useCallback(
    (v: boolean) => {
      setValue(v)
      localStorage.setItem(key, v ? '1' : '0')
    },
    [key],
  )

  return [value, set]
}
