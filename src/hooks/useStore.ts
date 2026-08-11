import { useCallback, useEffect, useState } from 'react'
import type { Cat, VomitRecord } from '../types'
import { loadCats, loadRecords, saveCats, saveRecords, uid } from '../lib/storage'

export interface Store {
  cats: Cat[]
  records: VomitRecord[]
  addCat: (name: string) => void
  renameCat: (id: string, name: string) => void
  deleteCat: (id: string) => void
  addRecord: (input: Omit<VomitRecord, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateRecord: (id: string, input: Omit<VomitRecord, 'id' | 'createdAt' | 'updatedAt'>) => void
  deleteRecord: (id: string) => void
}

export function useStore(): Store {
  const [cats, setCats] = useState<Cat[]>(() => loadCats())
  const [records, setRecords] = useState<VomitRecord[]>(() => loadRecords())

  useEffect(() => saveCats(cats), [cats])
  useEffect(() => saveRecords(records), [records])

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

  const addRecord = useCallback((input: Omit<VomitRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString()
    setRecords((prev) =>
      [...prev, { ...input, id: uid(), createdAt: now, updatedAt: now }].sort(
        (a, b) => b.datetime.localeCompare(a.datetime),
      ),
    )
  }, [])

  const updateRecord = useCallback((id: string, input: Omit<VomitRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    setRecords((prev) =>
      prev
        .map((r) => (r.id === id ? { ...r, ...input, updatedAt: new Date().toISOString() } : r))
        .sort((a, b) => b.datetime.localeCompare(a.datetime)),
    )
  }, [])

  const deleteRecord = useCallback((id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id))
  }, [])

  return { cats, records, addCat, renameCat, deleteCat, addRecord, updateRecord, deleteRecord }
}
