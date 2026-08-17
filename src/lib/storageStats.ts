export interface StorageUsage {
  usage: number
  quota: number
}

function storageManager(): StorageManager | null {
  if (typeof navigator === 'undefined' || !navigator.storage) return null
  return navigator.storage
}

/** Origin-wide actual usage and quota (IndexedDB + PWA cache included) */
export async function getStorageUsage(): Promise<StorageUsage | null> {
  const manager = storageManager()
  if (!manager?.estimate) return null
  try {
    const est = await manager.estimate()
    if (est.usage == null || est.quota == null) return null
    return { usage: est.usage, quota: est.quota }
  } catch {
    return null
  }
}

/** Whether the origin is exempt from browser eviction (idle/space cleanup) */
export async function isPersisted(): Promise<boolean | null> {
  const manager = storageManager()
  if (!manager?.persisted) return null
  try {
    return await manager.persisted()
  } catch {
    return null
  }
}

/** Requests persistent storage — Chrome auto-grants installed PWAs without a prompt */
export async function requestPersistence(): Promise<boolean | null> {
  const manager = storageManager()
  if (!manager?.persist) return null
  try {
    return await manager.persist()
  } catch {
    return null
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(1)} GB`
}
