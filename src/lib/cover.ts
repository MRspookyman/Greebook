/** The size a photo of a cover is reduced to before it is uploaded: plenty for a phone, light to keep. */
export const COVER_MAX = 720

/** Width and height that fit inside `max` keeping the proportions; never enlarges. */
export function fitWithin(width: number, height: number, max = COVER_MAX): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height, 1))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/** Turns a photo from the camera or the gallery into a small JPEG, upright whatever way the phone was held. */
export async function shrinkCover(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('No se pudo preparar la foto')
    context.fillStyle = '#fff'
    context.fillRect(0, 0, width, height)
    context.drawImage(bitmap, 0, 0, width, height)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No se pudo preparar la foto'))), 'image/jpeg', 0.82),
    )
  } finally {
    bitmap.close()
  }
}
