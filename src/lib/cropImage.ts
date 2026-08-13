export interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

function getRadianAngle(degreeValue: number): number {
  return (degreeValue * Math.PI) / 180
}

function rotateSize(width: number, height: number, rotation: number): { width: number; height: number } {
  const rotRad = getRadianAngle(rotation)
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/** 회전(자유 각도) → 크롭 → JPEG Blob 변환 */
export async function cropImage(image: Blob, pixelCrop: CropArea, rotation = 0): Promise<Blob> {
  const imageSrc = URL.createObjectURL(image)
  try {
    const img = await loadImage(imageSrc)
    const rotRad = getRadianAngle(rotation)
    const { width: bBoxWidth, height: bBoxHeight } = rotateSize(img.width, img.height, rotation)

    const canvas = document.createElement('canvas')
    canvas.width = bBoxWidth
    canvas.height = bBoxHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return image
    ctx.translate(bBoxWidth / 2, bBoxHeight / 2)
    ctx.rotate(rotRad)
    ctx.translate(-img.width / 2, -img.height / 2)
    ctx.drawImage(img, 0, 0)

    const croppedCanvas = document.createElement('canvas')
    croppedCanvas.width = Math.round(pixelCrop.width)
    croppedCanvas.height = Math.round(pixelCrop.height)
    const croppedCtx = croppedCanvas.getContext('2d')
    if (!croppedCtx) return image
    croppedCtx.drawImage(
      canvas,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      croppedCanvas.width,
      croppedCanvas.height,
    )

    const blob = await new Promise<Blob | null>((resolve) =>
      croppedCanvas.toBlob(resolve, 'image/jpeg', 0.85),
    )
    return blob ?? image
  } finally {
    URL.revokeObjectURL(imageSrc)
  }
}
