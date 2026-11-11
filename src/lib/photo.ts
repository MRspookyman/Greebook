/** A cover is a 2:3 book. Photos are cut to that and made small enough to travel inside the book's own row. */
const WIDTH = 400
const HEIGHT = 600
/** The server refuses covers longer than 200 000 characters; stay well under. */
export const MAX_COVER = 150_000

/** Whether a string can be a book's cover: a web address, or a small photo kept as a data URL. */
export function isCover(url: string | null | undefined): url is string {
  return !!url && (url.startsWith('https://') || (/^data:image\/(jpeg|webp|png);base64,/.test(url) && url.length <= 200_000))
}

/** The part of a `width`×`height` picture that fills a 2:3 cover, centred. */
export function coverCrop(width: number, height: number): { x: number; y: number; w: number; h: number } {
  const wanted = WIDTH / HEIGHT
  if (width / height > wanted) {
    const w = Math.round(height * wanted)
    return { x: Math.round((width - w) / 2), y: 0, w, h: height }
  }
  const h = Math.round(width / wanted)
  return { x: 0, y: Math.round((height - h) / 2), w: width, h }
}

async function load(file: Blob): Promise<{ image: CanvasImageSource; width: number; height: number; done: () => void }> {
  if ('createImageBitmap' in globalThis) {
    try {
      const bitmap = await createImageBitmap(file)
      return { image: bitmap, width: bitmap.width, height: bitmap.height, done: () => bitmap.close() }
    } catch {
      // Some formats only open as an <img>.
    }
  }
  const url = URL.createObjectURL(file)
  const image = new Image()
  image.src = url
  await image.decode()
  return { image, width: image.naturalWidth, height: image.naturalHeight, done: () => URL.revokeObjectURL(url) }
}

/** Turns a photo from the camera or the gallery into a small cover, as a data URL. */
export async function coverFromFile(file: Blob): Promise<string> {
  const { image, width, height, done } = await load(file)
  try {
    if (!width || !height) throw new Error('empty')
    const crop = coverCrop(width, height)
    const canvas = document.createElement('canvas')
    canvas.width = WIDTH
    canvas.height = HEIGHT
    const context = canvas.getContext('2d')
    if (!context) throw new Error('canvas')
    context.imageSmoothingQuality = 'high'
    context.drawImage(image, crop.x, crop.y, crop.w, crop.h, 0, 0, WIDTH, HEIGHT)
    for (const quality of [0.78, 0.66, 0.54, 0.42, 0.3]) {
      const url = canvas.toDataURL('image/jpeg', quality)
      if (url.length <= MAX_COVER) return url
    }
    throw new Error('too big')
  } finally {
    done()
  }
}
