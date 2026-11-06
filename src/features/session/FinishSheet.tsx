import { useState } from 'react'
import { BottomSheet } from '@/components/BottomSheet'
import { Stars } from '@/components/Stars'
import { MoodChips } from '@/components/MoodChips'
import { toast } from '@/components/toast'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'
import { qk } from '@/lib/data'
import type { ReadingWithBook } from '@/lib/types'
import { flush } from '@/lib/offline/sessionQueue'
import { offlineDb } from '@/lib/offline/db'
import { useOnline } from './useOnline'

export function FinishSheet({
  reading,
  readOn,
  onClose,
}: {
  reading: ReadingWithBook
  readOn: string
  onClose: () => void
}) {
  const [rating, setRating] = useState(reading.rating ?? 0)
  const [moods, setMoods] = useState(reading.moods)
  const [busy, setBusy] = useState(false)
  const online = useOnline()
  async function finish(withRating: boolean) {
    if (!online || busy) return
    setBusy(true)
    try {
      await flush()
      const waiting = await offlineDb.pendingOps.toArray()
      if (waiting.some((op) => op.payload.session.reading_id === reading.id))
        throw new Error('La sesión aún está pendiente de sincronizar.')
      const { error } = await supabase
        .from('readings')
        .update({
          status: 'finished',
          finished_on: readOn,
          rating: withRating && rating ? rating : null,
          moods: withRating ? moods : [],
        })
        .eq('id', reading.id)
        .eq('user_id', reading.user_id)
      if (error) throw error
      await queryClient.invalidateQueries({ queryKey: qk.readings(reading.user_id) })
      onClose()
    } catch (error) {
      toast('No se pudo terminar el libro', error instanceof Error ? error.message : 'Inténtalo de nuevo')
    } finally {
      setBusy(false)
    }
  }
  return (
    <BottomSheet open onClose={onClose} title="¿Lo has terminado?">
      <div className="space-y-5">
        <p>{reading.book.title}</p>
        <p className="text-muted">¿Qué te ha parecido?</p>
        <Stars value={rating} onChange={setRating} />
        <MoodChips value={moods} onChange={setMoods} />
        {!online && (
          <p className="text-muted">Sin conexión. Puedes terminarlo desde la ficha cuando vuelvas a conectarte.</p>
        )}
        <button className="btn btn-primary w-full" disabled={!online || busy} onClick={() => void finish(true)}>
          Sí, lo he terminado
        </button>
        <button className="btn btn-secondary w-full" disabled={!online || busy} onClick={() => void finish(false)}>
          Ahora no
        </button>
        <p className="text-muted text-sm">
          «Ahora no» guarda el libro como terminado, sin valoración. Puedes valorarlo después.
        </p>
      </div>
    </BottomSheet>
  )
}
