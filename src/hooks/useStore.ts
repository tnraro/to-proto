import { useCallback, useEffect, useState } from 'react'
import type { AlertEntry, Cat, ThresholdRule, VomitRecord } from '../types'
import {
  loadAlertLog,
  loadCats,
  loadRecords,
  loadRules,
  saveAlertLog,
  saveCats,
  saveRecords,
  saveRules,
  uid,
} from '../lib/storage'
import { evaluateRules, violationToAlertEntry } from '../lib/thresholds'

export type RecordInput = Omit<VomitRecord, 'id' | 'createdAt' | 'updatedAt'>
export type RuleInput = Omit<ThresholdRule, 'id'>

export interface Store {
  hydrated: boolean
  cats: Cat[]
  records: VomitRecord[]
  rules: ThresholdRule[]
  alertLog: AlertEntry[]
  addCat: (name: string) => void
  renameCat: (id: string, name: string) => void
  deleteCat: (id: string) => void
  addRecord: (input: RecordInput) => AlertEntry[]
  updateRecord: (id: string, input: RecordInput) => void
  deleteRecord: (id: string) => void
  addRule: (input: RuleInput) => void
  updateRule: (id: string, input: RuleInput) => void
  deleteRule: (id: string) => void
  deleteAlert: (id: string) => void
  clearAlerts: () => void
  resetAll: () => void
}

export function useStore(): Store {
  const [hydrated, setHydrated] = useState(false)
  const [cats, setCats] = useState<Cat[]>([])
  const [records, setRecords] = useState<VomitRecord[]>([])
  const [rules, setRules] = useState<ThresholdRule[]>([])
  const [alertLog, setAlertLog] = useState<AlertEntry[]>([])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [loadedCats, loadedRecords, loadedRules, loadedAlerts] = await Promise.all([
        loadCats(),
        loadRecords(),
        loadRules(),
        loadAlertLog(),
      ])
      if (cancelled) return
      setCats(loadedCats)
      setRecords(loadedRecords)
      setRules(loadedRules)
      setAlertLog(loadedAlerts)
      setHydrated(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    void saveCats(cats)
  }, [cats, hydrated])
  useEffect(() => {
    if (!hydrated) return
    void saveRecords(records)
  }, [records, hydrated])
  useEffect(() => {
    if (!hydrated) return
    void saveRules(rules)
  }, [rules, hydrated])
  useEffect(() => {
    if (!hydrated) return
    void saveAlertLog(alertLog)
  }, [alertLog, hydrated])

  const addCat = useCallback((name: string) => {
    setCats((prev) => [...prev, { id: uid(), name: name.trim() }])
  }, [])

  const renameCat = useCallback((id: string, name: string) => {
    setCats((prev) => prev.map((c) => (c.id === id ? { ...c, name: name.trim() } : c)))
  }, [])

  const deleteCat = useCallback((id: string) => {
    setCats((prev) => prev.filter((c) => c.id !== id))
    setRecords((prev) => prev.filter((r) => r.catId !== id))
  }, [])

  const addRecord = useCallback(
    (input: RecordInput): AlertEntry[] => {
      const now = new Date()
      const created: VomitRecord = {
        ...input,
        id: uid(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }
      const nextRecords = [...records, created].sort((a, b) => b.datetime.localeCompare(a.datetime))

      const newAlerts = evaluateRules(rules, nextRecords, cats, now).map(violationToAlertEntry)

      setRecords(nextRecords)
      if (newAlerts.length > 0) setAlertLog((prev) => [...newAlerts, ...prev])
      return newAlerts
    },
    [records, rules, cats],
  )

  const updateRecord = useCallback((id: string, input: RecordInput) => {
    setRecords((prev) =>
      prev
        .map((r) => (r.id === id ? { ...r, ...input, updatedAt: new Date().toISOString() } : r))
        .sort((a, b) => b.datetime.localeCompare(a.datetime)),
    )
  }, [])

  const deleteRecord = useCallback((id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const addRule = useCallback((input: RuleInput) => {
    setRules((prev) => [...prev, { ...input, id: uid() }])
  }, [])

  const updateRule = useCallback((id: string, input: RuleInput) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...input } : r)))
  }, [])

  const deleteRule = useCallback((id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const deleteAlert = useCallback((id: string) => {
    setAlertLog((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const clearAlerts = useCallback(() => {
    setAlertLog([])
  }, [])

  const resetAll = useCallback(() => {
    setCats([])
    setRecords([])
    setRules([])
    setAlertLog([])
  }, [])

  return {
    hydrated,
    cats,
    records,
    rules,
    alertLog,
    addCat,
    renameCat,
    deleteCat,
    addRecord,
    updateRecord,
    deleteRecord,
    addRule,
    updateRule,
    deleteRule,
    deleteAlert,
    clearAlerts,
    resetAll,
  }
}
