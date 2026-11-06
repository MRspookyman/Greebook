import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { BottomSheet } from '@/components/BottomSheet'
import { Cover } from '@/components/Cover'
import { Switch } from '@/components/Switch'
import { toast } from '@/components/toast'
import { useMe } from '@/features/auth/me'
import { nextSunday } from '@/lib/club'
import { qk, useReadings } from '@/lib/data'
import { fmt, todayISO } from '@/lib/dates'
import { supabase } from '@/lib/supabase'
import type { ReadingWithBook } from '@/lib/types'

type Start = 'any' | 'today' | 'sunday' | 'date'

/** «Recomendar a …»: dedication, and optionally «Leámoslo juntos» with a start date. */
export function RecommendSheet({
  reading,
  open,
  onClose,
}: {
  reading: ReadingWithBook
  open: boolean
  onClose: () => void
}) {
  const { userId, partner } = useMe()
  const qc = useQueryClient()
  const mine = useReadings(userId)
  const today = todayISO()
  const [message, setMessage] = useState('')
  const [together, setTogether] = useState(false)
  const [start, setStart] = useState<Start>('sunday')
  const [date, setDate] = useState(today)
  const [busy, setBusy] = useState(false)
  if (!partner) return null
  const sunday = nextSunday(today)
  const startOn = start === 'any' ? null : start === 'today' ? today : start === 'sunday' ? sunday : date

  async function send() {
    if (busy) return
    if (together && start === 'date' && (!date || date < today)) {
      toast('Elige una fecha de hoy en adelante')
      return
    }
    setBusy(true)
    try {
      const { error } = await supabase.from('recommendations').insert({
        book_id: reading.book_id,
        from_user: userId,
        to_user: partner!.id,
        message: message.trim() || null,
        together,
        start_on: together ? startOn : null,
      })
      if (error) throw error
      if (together) {
        // My side of the joint reading: reuse an open one or start a new one with the same format.
        const startsNow = startOn !== null && startOn <= today
        const open = (mine.data ?? []).find(
          (r) => r.book_id === reading.book_id && (r.status === 'want' || r.status === 'reading'),
        )
        if (!open) {
          const { error: insertError } = await supabase.from('readings').insert({
            user_id: userId,
            book_id: reading.book_id,
            format: reading.format,
            unit: reading.unit,
            total_units: reading.total_units,
            status: startsNow ? 'reading' : 'want',
            started_on: startsNow ? startOn : null,
          })
          if (insertError) throw insertError
        } else if (startsNow && open.status === 'want') {
          const { error: updateError } = await supabase
            .from('readings')
            .update({ status: 'reading', started_on: startOn })
            .eq('id', open.id)
            .eq('user_id', userId)
          if (updateError) throw updateError
        }
        await qc.invalidateQueries({ queryKey: qk.readings(userId) })
      }
      await qc.invalidateQueries({ queryKey: qk.recommendations() })
      toast(`Recomendado a ${partner!.display_name}`, 'Lo verá en Hoy con tu dedicatoria.')
      setMessage('')
      onClose()
    } catch {
      toast('No se pudo enviar la recomendación')
    } finally {
      setBusy(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={`Recomendar a ${partner.display_name}`}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Cover book={reading.book} width={48} />
          <div className="min-w-0">
            <p className="font-serif text-lg leading-tight font-semibold">{reading.book.title}</p>
            <p className="truncate text-xs text-muted">{reading.book.authors.join(', ')}</p>
          </div>
        </div>
        <label className="block space-y-2">
          <span className="lbl">Dedicatoria</span>
          <textarea
            className="input min-h-24 resize-none py-2.5"
            maxLength={500}
            placeholder={`¿Por qué crees que le va a gustar a ${partner.display_name}?`}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </label>
        <Switch checked={together} onChange={setTogether}>
          <span className="block font-medium">Leámoslo juntos</span>
          <span className="block text-xs text-muted">Lo empezáis el mismo día y se abre un club de dos</span>
        </Switch>
        <div
          className="grid transition-[grid-template-rows] duration-300 [transition-timing-function:var(--spring)]"
          style={{ gridTemplateRows: together ? '1fr' : '0fr' }}
          inert={!together}
          aria-hidden={!together}
        >
          <div className="overflow-hidden">
            <p className="lbl mb-2">Empezar</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['any', 'Cuando queramos'],
                  ['today', 'Hoy'],
                  ['sunday', sunday === today ? 'Hoy (domingo)' : `Domingo ${fmt(sunday, 'd')}`],
                  ['date', 'Elegir fecha'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className="chip min-h-11"
                  aria-pressed={start === value}
                  onClick={() => setStart(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            {start === 'date' && (
              <input
                className="input mt-3"
                type="date"
                min={today}
                value={date}
                aria-label="Fecha de inicio"
                onChange={(event) => setDate(event.target.value)}
              />
            )}
          </div>
        </div>
        <button className="btn btn-primary w-full" disabled={busy} onClick={() => void send()}>
          {busy ? 'Enviando…' : `Recomendar a ${partner.display_name}`}
        </button>
      </div>
    </BottomSheet>
  )
}
