import { useCallback, useEffect, useState } from 'react'
import type { AlertEntry, Cat, RecordInput, ThresholdRule, VomitRecord } from '../types'
import {
  clearAlertLog,
  clearAll,
  delAlertEntry,
  delCat,
  delPhotos,
  delRecord,
  delRecordsByCat,
  delRule,
  getAllAlertLog,
  getAllCats,
  getAllRecords,
  getAllRules,
  putAlertEntry,
  putCat,
  putPhoto,
  putRecord,
  putRule,
  uid,
} from '../lib/storage'
import { evaluateNewRecord, violationToAlertEntry } from '../lib/thresholds'
import { resizeImage } from '../lib/image'

export type RuleInput = Omit<ThresholdRule, 'id'>

export interface Store {
  hydrated: boolean
  cats: Cat[]
  records: VomitRecord[]
  rules: ThresholdRule[]
  alertLog: AlertEntry[]
  addCat: (name: string, photoId?: string) => void
  renameCat: (id: string, name: string) => void
  updateCatPhoto: (id: string, photoId?: string) => void
  deleteCat: (id: string) => void
  addRecord: (input: RecordInput) => Promise<AlertEntry[]>
  updateRecord: (id: string, input: RecordInput) => Promise<void>
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
        getAllCats(),
        getAllRecords(),
        getAllRules(),
        getAllAlertLog(),
      ])
      if (cancelled) return
      setCats(loadedCats)
      setRecords(loadedRecords.sort((a, b) => b.datetime.localeCompare(a.datetime)))
      setRules(loadedRules)
      setAlertLog(loadedAlerts)
      setHydrated(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const addCat = useCallback((name: string, photoId?: string) => {
    const cat: Cat = { id: uid(), name: name.trim(), photoId }
    setCats((prev) => [...prev, cat])
    void putCat(cat)
  }, [])

  const renameCat = useCallback((id: string, name: string) => {
    setCats((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, name: name.trim() } : c))
      const target = next.find((c) => c.id === id)
      if (target) void putCat(target)
      return next
    })
  }, [])

  const updateCatPhoto = useCallback((id: string, photoId?: string) => {
    setCats((prev) => {
      const prevCat = prev.find((c) => c.id === id)
      const next = prev.map((c) => (c.id === id ? { ...c, photoId } : c))
      const target = next.find((c) => c.id === id)
      if (target) void putCat(target)
      if (prevCat?.photoId && prevCat.photoId !== photoId) void delPhotos([prevCat.photoId])
      return next
    })
  }, [])

  const deleteCat = useCallback((id: string) => {
    setCats((prev) => {
      const target = prev.find((c) => c.id === id)
      if (target?.photoId) void delPhotos([target.photoId])
      return prev.filter((c) => c.id !== id)
    })
    setRecords((prev) => prev.filter((r) => r.catId !== id))
    void (async () => {
      const photoIds = await delRecordsByCat(id)
      await delCat(id)
      await delPhotos(photoIds)
    })()
  }, [])

  async function savePhotoBlobs(blobs: Blob[]): Promise<string[]> {
    const ids: string[] = []
    for (const blob of blobs) {
      const id = uid()
      const resized = await resizeImage(blob)
      await putPhoto(id, resized)
      ids.push(id)
    }
    return ids
  }

  /** 최종 순서의 사진 목록(string = 기존 id, Blob = 새 사진)을 id 배열로 해석 */
  async function resolvePhotoIds(photos: Array<string | Blob>): Promise<string[]> {
    const ids: string[] = []
    for (const p of photos) {
      if (typeof p === 'string') {
        ids.push(p)
      } else {
        ids.push(...(await savePhotoBlobs([p])))
      }
    }
    return ids
  }

  const addRecord = useCallback(
    async (input: RecordInput): Promise<AlertEntry[]> => {
      const now = new Date()
      const { photos, ...rest } = input
      const photoIds = await resolvePhotoIds(photos ?? [])
      const created: VomitRecord = {
        ...rest,
        photos: photoIds,
        id: uid(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }
      const nextRecords = [...records, created].sort((a, b) => b.datetime.localeCompare(a.datetime))

      // 이번 기록이 임계값을 넘게 만든 규칙만 경고 (이미 위반 중인 규칙은 제외)
      const newAlerts = evaluateNewRecord(rules, records, cats, created, now).map(violationToAlertEntry)

      setRecords(nextRecords)
      await putRecord(created)
      if (newAlerts.length > 0) {
        setAlertLog((prev) => [...newAlerts, ...prev])
        for (const a of newAlerts) void putAlertEntry(a)
      }
      return newAlerts
    },
    [records, rules, cats],
  )

  const updateRecord = useCallback(
    async (id: string, input: RecordInput) => {
      const existing = records.find((r) => r.id === id)
      if (!existing) return
      const { photos, ...rest } = input
      const photoIds = await resolvePhotoIds(photos ?? [])
      const updated: VomitRecord = {
        ...existing,
        ...rest,
        photos: photoIds,
        updatedAt: new Date().toISOString(),
      }
      setRecords((prev) =>
        prev
          .map((r) => (r.id === id ? updated : r))
          .sort((a, b) => b.datetime.localeCompare(a.datetime)),
      )
      await putRecord(updated)
      await delPhotos(existing.photos.filter((p) => !updated.photos.includes(p)))
    },
    [records],
  )

  const deleteRecord = useCallback((id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id))
    void (async () => {
      const record = records.find((r) => r.id === id)
      await delRecord(id)
      if (record) await delPhotos(record.photos)
    })()
  }, [records])

  const addRule = useCallback((input: RuleInput) => {
    const rule: ThresholdRule = { ...input, id: uid() }
    setRules((prev) => [...prev, rule])
    void putRule(rule)
  }, [])

  const updateRule = useCallback((id: string, input: RuleInput) => {
    setRules((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, ...input } : r))
      const target = next.find((r) => r.id === id)
      if (target) void putRule(target)
      return next
    })
  }, [])

  const deleteRule = useCallback((id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id))
    void delRule(id)
  }, [])

  const deleteAlert = useCallback((id: string) => {
    setAlertLog((prev) => prev.filter((a) => a.id !== id))
    void delAlertEntry(id)
  }, [])

  const clearAlerts = useCallback(() => {
    setAlertLog([])
    void clearAlertLog()
  }, [])

  const resetAll = useCallback(() => {
    setCats([])
    setRecords([])
    setRules([])
    setAlertLog([])
    void clearAll()
  }, [])

  return {
    hydrated,
    cats,
    records,
    rules,
    alertLog,
    addCat,
    renameCat,
    updateCatPhoto,
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
