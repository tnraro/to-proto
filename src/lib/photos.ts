import { getPhoto } from './storage'

export interface PhotoItem {
  key: string
  /** Existing photo id (undefined for newly added photos) */
  id?: string
  blob: Blob
}

export async function loadPhotoItems(ids: string[]): Promise<PhotoItem[]> {
  const items: PhotoItem[] = []
  for (const id of ids) {
    const blob = await getPhoto(id)
    if (blob) items.push({ key: id, id, blob })
  }
  return items
}
