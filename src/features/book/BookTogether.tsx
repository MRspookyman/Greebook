import { useState } from 'react'
import { Link } from 'react-router'
import { useMe } from '@/features/auth/me'
import { qk, useTogether } from '@/lib/data'
import { queryClient } from '@/lib/queryClient'
import { supabase } from '@/lib/supabase'
import type { ReadingWithBook } from '@/lib/types'
import { formatUnitValue, progressFraction } from '@/lib/units'
import { DualProgressBar } from '@/components/DualProgressBar'
import { toast } from '@/components/toast'
import { useRooms } from '@/features/us/rooms'
import { addTogether } from '@/features/us/together'
import { TogetherEstimates } from './PaceEstimate'

export function BookTogether({ reading }: { reading: ReadingWithBook }) {
  const { userId, profile, partner } = useMe()
  const room = useRooms().find((item) => item.book.id === reading.book_id)
  const together = useTogether()
  const [adding, setAdding] = useState(false)
  const [reasonOpen, setReasonOpen] = useState(false)
  const [reason, setReason] = useState('')
  const listed = together.data?.some((item) => item.book_id === reading.book_id)

  async function add() {
    setAdding(true)
    try {
      await addTogether(reading.book_id)
      setReasonOpen(true)
      toast('Añadido a lo que queréis leer juntos')
    } catch {
      toast('No se pudo añadir el libro')
    } finally {
      setAdding(false)
    }
  }
  async function saveReason() {
    if (!reason.trim() || adding) return
    setAdding(true)
    try {
      const { error } = await supabase
        .from('together_items')
        .update({ reason: reason.trim() })
        .eq('book_id', reading.book_id)
        .eq('added_by', userId)
      if (error) throw error
      await queryClient.invalidateQueries({ queryKey: qk.together() })
      setReasonOpen(false)
    } catch {
      toast('No se pudo guardar el motivo')
    } finally {
      setAdding(false)
    }
  }
  return (
    <section className="space-y-3 py-2">
      {room ? (
        <>
          <DualProgressBar
            a={{
              value: progressFraction(room.mine),
              accent: profile.accent,
              label: 'Tú',
              caption: formatUnitValue(room.mine.unit, room.mine.current_position),
            }}
            b={{
              value: progressFraction(room.theirs),
              accent: partner?.accent ?? 'blue',
              label: partner?.display_name ?? 'Tu pareja',
              caption: formatUnitValue(room.theirs.unit, room.theirs.current_position),
            }}
          />
          <p className="text-sm text-muted">Lo leéis los dos: vuestras citas de este libro están en la pestaña Citas.</p>
          <TogetherEstimates mine={room.mine} theirs={room.theirs} />
        </>
      ) : (
        <>
          <p className="text-sm text-muted">Un libro para encontraros, cuando a los dos os apetezca.</p>
          {listed ? (
            <Link className="btn btn-soft w-full" to="/nosotros">
              En «Queremos leer juntos»
            </Link>
          ) : (
            <button className="btn btn-outline w-full" disabled={adding || !partner} onClick={() => void add()}>
              {adding ? 'Añadiendo…' : 'Leerlo juntos'}
            </button>
          )}
          {reasonOpen && (
            <form
              className="space-y-2"
              onSubmit={(event) => {
                event.preventDefault()
                void saveReason()
              }}
            >
              <label className="lbl">
                ¿Por qué te apetece? (opcional)
                <input
                  className="input mt-2"
                  name="reason"
                  autoComplete="off"
                  maxLength={500}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>
              <div className="flex gap-2">
                <button className="btn btn-soft" disabled={adding || !reason.trim()}>
                  Dejar el motivo
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setReasonOpen(false)}>
                  Ahora no
                </button>
              </div>
            </form>
          )}

        </>
      )}
    </section>
  )
}
