import { useCallback, useState } from 'react'

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
