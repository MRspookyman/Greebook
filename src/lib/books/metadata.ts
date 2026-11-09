import type { Book } from '@/lib/types'

export interface MetadataDraft {
  title: string
  authors: string
  pages: string
  year: string
  cover: string
}

export function validateMetadata(draft: MetadataDraft) {
  const errors: Partial<Record<keyof MetadataDraft, string>> = {}
  const title = draft.title.trim()
  const pages = draft.pages.trim()
  const year = draft.year.trim()
  const cover = draft.cover.trim()
  if (!title) errors.title = 'Escribe el título del libro.'
  if (pages && (!/^\d+$/.test(pages) || !Number.isSafeInteger(Number(pages)) || Number(pages) < 1 || Number(pages) > 2147483647)) {
    errors.pages = 'Indica un número entero de páginas mayor que cero.'
  }
  if (year && (!/^\d{1,4}$/.test(year) || Number(year) < 1)) {
    errors.year = 'Indica un año entre 1 y 9999.'
  }
  if (cover) {
    try {
      const url = new URL(cover)
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error()
    } catch {
      errors.cover = 'Pega una URL de imagen que empiece por https:// o http://.'
    }
  }
  const values: Pick<Book, 'title' | 'authors' | 'page_count' | 'published_year' | 'cover_url'> = {
    title,
    authors: draft.authors.split(',').map((author) => author.trim()).filter(Boolean),
    page_count: pages ? Number(pages) : null,
    published_year: year ? Number(year) : null,
    cover_url: cover || null,
  }
  return { errors, values }
}

/** Honor camera EXIF orientation and keep public covers small before uploading. */
export async function compressBookCover(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const scale = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('No se pudo preparar la foto.')
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      (result) => result ? resolve(result) : reject(new Error('No se pudo comprimir la foto.')),
      'image/jpeg', 0.8,
    ))
    if (blob.size > 2097152) throw new Error('La foto es demasiado grande. Prueba con otra.')
    return blob
  } finally {
    bitmap.close()
  }
}
