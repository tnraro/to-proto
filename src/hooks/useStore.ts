import { useCallback, useEffect, useState } from 'react'
import type { AlertEntry, Cat, Marker, MarkerType, RecordInput, ThresholdRule, VomitRecord } from '../types'
import {
  clearAlertLog,
  clearAll,
  delAlertEntry,
  delCat,
  delMarker,
  delMarkerType,
  delPhotos,
  delRecord,
  delRecordsByCat,
  delRule,
  getAllAlertLog,
  getAllCats,
  getAllMarkerTypes,
  getAllMarkers,
  getAllRecords,
  getAllRules,
  putAlertEntry,
  putCat,
  putMarker,
  putMarkerType,
  putPhoto,
  putRecord,
  putRule,
  uid,
} from '../lib/storage'
import { evaluateNewRecord, violationToAlertEntry } from '../lib/thresholds'
import { resizeImage } from '../lib/image'

export type RuleInput = Omit<ThresholdRule, 'id'>
export type MarkerInput = Omit<Marker, 'id' | 'createdAt' | 'updatedAt'>

export interface Store {
  hydrated: boolean
  cats: Cat[]
  records: VomitRecord[]
  rules: ThresholdRule[]
  alertLog: AlertEntry[]
  markers: Marker[]
  markerTypes: MarkerType[]
  addCat: (name: string, photoId?: string) => void
  renameCat: (id: string, name: string) => void
  updateCatPhoto: (id: string, photoId?: string) => void
  deleteCat: (id: string) => void
  /** 현재 선택된 고양이 id (null = 전체) */
  currentCatId: string | null
  setCurrentCat: (catId: string | null) => void
  addRecord: (input: RecordInput) => Promise<AlertEntry[]>
  updateRecord: (id: string, input: RecordInput) => Promise<void>
  deleteRecord: (id: string) => void
  addMarker: (input: MarkerInput) => void
  updateMarker: (id: string, input: MarkerInput) => void
  deleteMarker: (id: string) => void
  addMarkerType: (name: string) => void
  renameMarkerType: (id: string, name: string) => void
  deleteMarkerType: (id: string) => void
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
  const [markers, setMarkers] = useState<Marker[]>([])
  const [markerTypes, setMarkerTypes] = useState<MarkerType[]>([])
  const [currentCatId, setCurrentCat] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [loadedCats, loadedRecords, loadedRules, loadedAlerts, loadedMarkers, loadedMarkerTypes] =
        await Promise.all([
          getAllCats(),
          getAllRecords(),
          getAllRules(),
          getAllAlertLog(),
          getAllMarkers(),
          getAllMarkerTypes(),
        ])
      if (cancelled) return
      setCats(loadedCats)
      setRecords(loadedRecords.sort((a, b) => b.datetime.localeCompare(a.datetime)))
      setRules(loadedRules)
      setAlertLog(loadedAlerts)
      setMarkers(loadedMarkers.sort((a, b) => b.datetime.localeCompare(a.datetime)))
      setMarkerTypes(loadedMarkerTypes)
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
    // 삭제된 고양이가 선택 중이면 전체로 리셋
    setCurrentCat((cur) => (cur === id ? null : cur))
    setRecords((prev) => prev.filter((r) => r.catId !== id))
    // 마커에서는 해당 고양이만 제거 (마커는 유지), 연관 고양이가 0이 되면 마커 삭제
    setMarkers((prev) => {
      const removed: Marker[] = []
      const next = prev.flatMap((m) => {
        if (!m.catIds.includes(id)) return [m]
        const catIds = m.catIds.filter((c) => c !== id)
        if (catIds.length === 0) {
          removed.push(m)
          return []
        }
        void putMarker({ ...m, catIds })
        return [{ ...m, catIds }]
      })
      if (removed.length > 0) void delPhotos(removed.flatMap((m) => m.photos))
      return next
    })
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

  const addMarker = useCallback((input: MarkerInput) => {
    const now = new Date().toISOString()
    const marker: Marker = { ...input, id: uid(), createdAt: now, updatedAt: now }
    setMarkers((prev) => [...prev, marker].sort((a, b) => b.datetime.localeCompare(a.datetime)))
    void putMarker(marker)
  }, [])

  const updateMarker = useCallback(
    (id: string, input: MarkerInput) => {
      const existing = markers.find((m) => m.id === id)
      if (!existing) return
      const updated: Marker = { ...existing, ...input, updatedAt: new Date().toISOString() }
      setMarkers((prev) =>
        prev.map((m) => (m.id === id ? updated : m)).sort((a, b) => b.datetime.localeCompare(a.datetime)),
      )
      void putMarker(updated)
      void delPhotos(existing.photos.filter((p) => !updated.photos.includes(p)))
    },
    [markers],
  )

  const deleteMarker = useCallback(
    (id: string) => {
      setMarkers((prev) => prev.filter((m) => m.id !== id))
      const target = markers.find((m) => m.id === id)
      void delMarker(id)
      if (target) void delPhotos(target.photos)
    },
    [markers],
  )

  const addMarkerType = useCallback((name: string) => {
    const markerType: MarkerType = { id: uid(), name: name.trim() }
    setMarkerTypes((prev) => [...prev, markerType])
    void putMarkerType(markerType)
  }, [])

  const renameMarkerType = useCallback((id: string, name: string) => {
    setMarkerTypes((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, name: name.trim() } : t))
      const target = next.find((t) => t.id === id)
      if (target) void putMarkerType(target)
      return next
    })
  }, [])

  /** 종류 삭제: 해당 종류의 마커와 그 사진을 캐스케이드 삭제 (confirm은 UI에서) */
  const deleteMarkerType = useCallback(
    (id: string) => {
      setMarkerTypes((prev) => prev.filter((t) => t.id !== id))
      setMarkers((prev) => {
        const removed = prev.filter((m) => m.typeId === id)
        if (removed.length > 0) void delPhotos(removed.flatMap((m) => m.photos))
        for (const m of removed) void delMarker(m.id)
        return prev.filter((m) => m.typeId !== id)
      })
      void delMarkerType(id)
    },
    [],
  )

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
    setMarkers([])
    setMarkerTypes([])
    setCurrentCat(null)
    void clearAll()
  }, [])

  return {
    hydrated,
    cats,
    records,
    rules,
    alertLog,
    markers,
    markerTypes,
    addCat,
    renameCat,
    updateCatPhoto,
    deleteCat,
    currentCatId,
    setCurrentCat,
    addRecord,
    updateRecord,
    deleteRecord,
    addMarker,
    updateMarker,
    deleteMarker,
    addMarkerType,
    renameMarkerType,
    deleteMarkerType,
    addRule,
    updateRule,
    deleteRule,
    deleteAlert,
    clearAlerts,
    resetAll,
  }
}
