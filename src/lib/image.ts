const MAX_SIZE = 1280
const QUALITY = 0.7

export async function resizeImage(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, MAX_SIZE / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0, w, h)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', QUALITY),
    )
    return blob ?? file
  } finally {
    bitmap.close()
  }
}
