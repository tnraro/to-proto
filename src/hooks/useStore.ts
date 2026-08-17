import { useCallback, useEffect, useState } from 'react'
import type {
  AlertEntry,
  Cat,
  Marker,
  MarkerInput,
  MarkerType,
  PhotoEntry,
  RecordInput,
  ThresholdRule,
  VomitRecord,
} from '../types'
import {
  clearAlertLog,
  clearAll,
  delAlertEntry,
  delMarker,
  delMarkerType,
  delPhotos,
  delRule,
  deleteCatAtomic,
  deleteRecordAtomic,
  getAllAlertLog,
  getAllCats,
  getAllMarkerTypes,
  getAllMarkers,
  getAllRecords,
  getAllRules,
  putCat,
  putMarkerType,
  putRule,
  saveMarkerWithPhotos,
  saveRecordWithPhotos,
  uid,
  updateMarkerWithPhotos,
  updateRecordWithPhotos,
} from '../lib/storage'
import { evaluateNewRecord, violationToAlertEntry } from '../lib/thresholds'
import { sortByDatetimeDesc } from '../lib/dates'
import { resizeImage } from '../lib/image'

export type RuleInput = Omit<ThresholdRule, 'id'>

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
  currentCatId: string | null
  setCurrentCat: (catId: string | null) => void
  addRecord: (input: RecordInput) => Promise<AlertEntry[]>
  updateRecord: (id: string, input: RecordInput) => Promise<void>
  deleteRecord: (id: string) => void
  addMarker: (input: MarkerInput) => Promise<void>
  updateMarker: (id: string, input: MarkerInput) => Promise<void>
  deleteMarker: (id: string) => void
  addMarkerType: (name: string) => string
  renameMarkerType: (id: string, name: string) => void
  deleteMarkerType: (id: string) => void
  addRule: (input: RuleInput) => void
  updateRule: (id: string, input: RuleInput) => void
  deleteRule: (id: string) => void
  deleteAlert: (id: string) => void
  clearAlerts: () => void
  resetAll: () => void
  /** Reloads every store from IndexedDB (cross-tab edits become visible) */
  refresh: () => Promise<void>
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

  const loadAll = useCallback(async () => {
    const [loadedCats, loadedRecords, loadedRules, loadedAlerts, loadedMarkers, loadedMarkerTypes] =
      await Promise.all([
        getAllCats(),
        getAllRecords(),
        getAllRules(),
        getAllAlertLog(),
        getAllMarkers(),
        getAllMarkerTypes(),
      ])
    setCats(loadedCats)
    setRecords(sortByDatetimeDesc(loadedRecords))
    setRules(loadedRules)
    setAlertLog(loadedAlerts)
    setMarkers(sortByDatetimeDesc(loadedMarkers))
    setMarkerTypes(loadedMarkerTypes)
    return loadedCats
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const loadedCats = await loadAll()
      if (cancelled) return
      setCurrentCat((cur) => (cur && loadedCats.some((c) => c.id === cur) ? cur : null))
      setHydrated(true)
    })()
    return () => {
      cancelled = true
    }
  }, [loadAll])

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
    void (async () => {
      const result = await deleteCatAtomic(id)
      setCats((prev) => prev.filter((c) => c.id !== id))
      setCurrentCat((cur) => (cur === id ? null : cur))
      setRecords((prev) => prev.filter((r) => r.catId !== id))
      const updatedById = new Map(result.updatedMarkers.map((m) => [m.id, m]))
      setMarkers((prev) => prev.map((m) => updatedById.get(m.id) ?? m))
      setRules((prev) => prev.filter((r) => r.catId !== id))
    })()
  }, [])

  /** Resizes and stashes new blobs (deduped by blob identity), keeping existing ids in order */
  async function resolvePhotoIds(photos: Array<string | Blob>): Promise<{ ids: string[]; newPhotos: PhotoEntry[] }> {
    const ids: string[] = []
    const newPhotos: PhotoEntry[] = []
    const seen = new Map<Blob, string>()
    for (const p of photos) {
      if (typeof p === 'string') {
        ids.push(p)
        continue
      }
      let id = seen.get(p)
      if (!id) {
        id = uid()
        seen.set(p, id)
        newPhotos.push({ id, blob: await resizeImage(p) })
      }
      ids.push(id)
    }
    return { ids, newPhotos }
  }

  const addRecord = useCallback(
    async (input: RecordInput): Promise<AlertEntry[]> => {
      const now = new Date()
      const { photos, ...rest } = input
      const { ids: photoIds, newPhotos } = await resolvePhotoIds(photos ?? [])
      const created: VomitRecord = {
        ...rest,
        photos: photoIds,
        id: uid(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }
      const newAlerts = evaluateNewRecord(rules, records, cats, created, now).map(violationToAlertEntry)

      await saveRecordWithPhotos(created, newPhotos, newAlerts)
      setRecords((prev) => sortByDatetimeDesc([...prev, created]))
      if (newAlerts.length > 0) setAlertLog((prev) => [...newAlerts, ...prev])
      return newAlerts
    },
    [records, rules, cats],
  )

  const updateRecord = useCallback(
    async (id: string, input: RecordInput) => {
      const existing = records.find((r) => r.id === id)
      if (!existing) return
      const { photos, ...rest } = input
      const { ids: photoIds, newPhotos } = await resolvePhotoIds(photos ?? [])
      const updated: VomitRecord = {
        ...existing,
        ...rest,
        photos: photoIds,
        updatedAt: new Date().toISOString(),
      }
      const removedPhotoIds = existing.photos.filter((p) => !photoIds.includes(p))
      await updateRecordWithPhotos(updated, newPhotos, removedPhotoIds)
      setRecords((prev) => sortByDatetimeDesc(prev.map((r) => (r.id === id ? updated : r))))
    },
    [records],
  )

  const deleteRecord = useCallback((id: string) => {
    void (async () => {
      const record = records.find((r) => r.id === id)
      await deleteRecordAtomic(id, record?.photos ?? [])
      setRecords((prev) => prev.filter((r) => r.id !== id))
    })()
  }, [records])

  const addMarker = useCallback(
    async (input: MarkerInput) => {
      const now = new Date().toISOString()
      const { photos, ...rest } = input
      const { ids: photoIds, newPhotos } = await resolvePhotoIds(photos ?? [])
      const marker: Marker = { ...rest, photos: photoIds, id: uid(), createdAt: now, updatedAt: now }
      await saveMarkerWithPhotos(marker, newPhotos)
      setMarkers((prev) => sortByDatetimeDesc([...prev, marker]))
    },
    [],
  )

  const updateMarker = useCallback(
    async (id: string, input: MarkerInput) => {
      const existing = markers.find((m) => m.id === id)
      if (!existing) return
      const { photos, ...rest } = input
      const { ids: photoIds, newPhotos } = await resolvePhotoIds(photos ?? [])
      const updated: Marker = { ...existing, ...rest, photos: photoIds, updatedAt: new Date().toISOString() }
      const removedPhotoIds = existing.photos.filter((p) => !photoIds.includes(p))
      await updateMarkerWithPhotos(updated, newPhotos, removedPhotoIds)
      setMarkers((prev) => sortByDatetimeDesc(prev.map((m) => (m.id === id ? updated : m))))
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

  const addMarkerType = useCallback((name: string): string => {
    const markerType: MarkerType = { id: uid(), name: name.trim() }
    setMarkerTypes((prev) => [...prev, markerType])
    void putMarkerType(markerType)
    return markerType.id
  }, [])

  const renameMarkerType = useCallback((id: string, name: string) => {
    setMarkerTypes((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, name: name.trim() } : t))
      const target = next.find((t) => t.id === id)
      if (target) void putMarkerType(target)
      return next
    })
  }, [])

  /** Confirm is handled in the UI */
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

  const refresh = useCallback(async () => {
    const loadedCats = await loadAll()
    setCurrentCat((cur) => (cur && loadedCats.some((c) => c.id === cur) ? cur : null))
  }, [loadAll])

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
    refresh,
  }
}
