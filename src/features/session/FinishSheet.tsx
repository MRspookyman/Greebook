import { useState } from 'react'
import { BottomSheet } from '@/components/BottomSheet'
import { Cover } from '@/components/Cover'
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
  showToast = true,
}: {
  reading: ReadingWithBook
  readOn: string
  onClose: () => void
  showToast?: boolean
}) {
  const [rating, setRating] = useState(reading.rating ?? 0)
  const [moods, setMoods] = useState(reading.moods)
  const [busy, setBusy] = useState(false)
  const [closing, setClosing] = useState(false)
  function close() {
    setClosing(true)
    onClose()
  }
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
      if (showToast) toast('Un libro más en tu historia', reading.book.title)
      close()
    } catch (error) {
      toast('No se pudo terminar el libro', error instanceof Error ? error.message : 'Inténtalo de nuevo')
    } finally {
      setBusy(false)
    }
  }
  return (
    <BottomSheet open={!closing} onClose={close} title="¿Lo has terminado?">
      <div className="space-y-5 pt-2">
        <div className="flex items-center gap-4">
          <Cover book={reading.book} width={64} />
          <div className="min-w-0">
            <h2 className="title">{reading.book.title}</h2>
          </div>
        </div>
        <section className="rule space-y-3 pt-4" aria-label="Valoración del libro">
          <h3 className="eyebrow">¿Qué te ha parecido? · opcional</h3>
          <Stars value={rating} onChange={setRating} />
        </section>
        <section className="rule space-y-3 pt-4" aria-label="Ánimos de la lectura">
          <h3 className="eyebrow">Cómo te hizo sentir · hasta 3 · opcional</h3>
          <MoodChips value={moods} onChange={setMoods} />
        </section>
        {!online && (
          <p className="text-muted">Sin conexión. Puedes terminarlo desde la ficha cuando vuelvas a conectarte.</p>
        )}
        <button className="btn btn-primary w-full" disabled={!online || busy} onClick={() => void finish(true)}>
          {busy ? 'Terminando…' : 'Sí, lo he terminado'}
        </button>
        <button className="btn btn-link w-full" disabled={!online || busy} onClick={() => void finish(false)}>
          Terminar sin valorar
        </button>
        <p className="text-muted text-sm">
          La valoración y las emociones son opcionales. Puedes añadirlas después desde la ficha.
        </p>
      </div>
    </BottomSheet>
  )
}
