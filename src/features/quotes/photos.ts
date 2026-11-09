import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useQuotePhoto(path: string | null | undefined) {
  return useQuery({
    queryKey: ['quote-photo', path],
    enabled: !!path,
    staleTime: 50 * 60_000,
    gcTime: 60 * 60_000,
    queryFn: async () => {
      if (!path) throw new Error('Falta la foto')
      const { data, error } = await supabase.storage.from('quote-photos').createSignedUrl(path, 3600)
      if (error) throw error
      return data.signedUrl
    },
  })
}

/** Decode camera EXIF orientation before resizing; never upload the original multi-megabyte image. */
export async function compressQuotePhoto(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('No se pudo preparar la foto')
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      (result) => result ? resolve(result) : reject(new Error('No se pudo comprimir la foto')),
      'image/jpeg', 0.8,
    ))
    if (blob.size > 2097152) throw new Error('La foto es demasiado grande. Prueba con otra.')
    return blob
  } finally {
    bitmap.close()
  }
}
