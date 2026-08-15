import { useCallback, useState } from 'react'

export function useFeatureFlag<T extends string>(
  key: string,
  parse: (raw: string | null) => T,
): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => parse(localStorage.getItem(key)))

  const set = useCallback(
    (v: T) => {
      setValue(v)
      localStorage.setItem(key, v)
    },
    [key],
  )

  return [value, set]
}
