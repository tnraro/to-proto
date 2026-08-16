import { useCallback, useRef, useSyncExternalStore } from 'react'
import { createMonthScroll, type MonthScrollState } from '../lib/monthScroll'

interface MonthScrollStore {
  state: MonthScrollState
  listeners: Set<() => void>
}

/**
 * Single source of truth for the month-scroll gesture machine. The machine
 * state lives in one mutable store that handlers read/write synchronously;
 * commit() notifies React to re-render. The component never mirrors the state
 * into a second ref, so ref/state divergence is impossible by construction.
 */
export function useMonthScrollStore(initialAnchorIdx: number) {
  const storeRef = useRef<MonthScrollStore | null>(null)
  if (storeRef.current === null) {
    storeRef.current = { state: createMonthScroll(initialAnchorIdx), listeners: new Set() }
  }
  const store = storeRef.current
  const getSnapshot = useCallback(() => store.state, [store])
  const subscribe = useCallback(
    (listener: () => void) => {
      store.listeners.add(listener)
      return () => {
        store.listeners.delete(listener)
      }
    },
    [store],
  )
  const scrollState = useSyncExternalStore(subscribe, getSnapshot)
  /** Stable synchronous read — effects use this instead of the raw store so
   *  their dependency arrays stay constant while reads stay live */
  const getState = useCallback(() => store.state, [store])
  const commit = useCallback(
    (next: MonthScrollState) => {
      store.state = next
      for (const listener of store.listeners) listener()
    },
    [store],
  )
  return { scrollState, commit, getState }
}
