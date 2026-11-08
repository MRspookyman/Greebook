import { useState, type CSSProperties } from 'react'
import { Lamp } from 'lucide-react'
import { useMe } from '@/features/auth/me'
import { useReadings, useReadTogether, useSessions } from '@/lib/data'
import { fmt } from '@/lib/dates'
import { formatMinutes, formatUnitDelta } from '@/lib/units'
import type { ReadingWithBook } from '@/lib/types'
import { toast } from '@/components/toast'
import { saveTogetherNote } from './live'

/** The ticket of a «lectura a la vez»: when, how long, and what each of you read. */
export function TicketPanel({
  togetherId,
  reading,
  delta,
  minutes,
}: {
  togetherId: string
  reading: ReadingWithBook
  delta: number
  minutes: number | null
}) {
  const { profile, partner } = useMe()
  const rows = useReadTogether().data ?? []
  const row = rows.find((item) => item.id === togetherId)
  const theirSessions = useSessions(partner?.id).data ?? []
  const theirReadings = useReadings(partner?.id).data ?? []
  const theirSession = theirSessions.find((s) => s.together_id === togetherId)
  const theirReading = theirReadings.find((r) => r.id === theirSession?.reading_id)
  const [note, setNote] = useState(row?.note ?? '')
  if (!partner) return null
  const month = new Date().toISOString().slice(0, 7)
  const night = rows.filter(
    (r) => r.started_at.slice(0, 7) === month && r.started_at <= (row?.started_at ?? '9'),
  ).length
  const part = (who: 'them' | 'me') => {
    const person = who === 'them' ? partner : profile
    if (who === 'them' && (!theirSession || !theirReading))
      return (
        <div className="grid gap-1 text-[13.5px]">
          <b className="font-extrabold" style={{ color: `var(--${person.accent})` }}>
            {person.display_name}
          </b>
          <span className="text-muted">Sigue leyendo: su parte aparecerá aquí cuando la guarde.</span>
        </div>
      )
    const r = who === 'them' ? theirReading! : reading
    const pages = who === 'them' ? theirSession!.end_pos - theirSession!.start_pos : delta
    return (
      <div className="grid gap-1 text-[13.5px] leading-snug">
        <b className="font-extrabold" style={{ color: `var(--${person.accent})` }}>
          {who === 'them' ? person.display_name : 'Tú'}
        </b>
        <span>{r.book.title}</span>
        <span className="folio text-[22px]">+{formatUnitDelta(r.unit, pages)}</span>
      </div>
    )
  }
  return (
    <div className="space-y-5 pt-2">
      <article className="card relative grid gap-4 px-5 py-5" aria-label="Ticket de vuestra lectura a la vez">
        <span
          aria-hidden
          className="absolute top-4 right-4 grid h-[88px] w-[88px] rotate-12 place-items-center rounded-full text-center text-xs font-extrabold tracking-wide text-rose uppercase"
          style={
            {
              boxShadow: 'inset 0 0 0 2px var(--rose), inset 0 0 0 6px var(--surface), inset 0 0 0 7px var(--rose)',
              animation: 'gb-stamp 600ms var(--spring) 250ms both',
            } as CSSProperties
          }
        >
          <span>
            Noche
            <b className="block font-serif text-[22px] tracking-normal normal-case">nº {Math.max(1, night)}</b>
            de {fmt(new Date(), 'MMM')}
          </span>
        </span>
        <div className="grid gap-1.5 pr-24">
          <p className="eyebrow">Lectura a la vez</p>
          <p className="font-serif text-[42px] leading-none">{minutes ? formatMinutes(minutes) : '—'}</p>
          {row && (
            <p className="text-[13px] text-muted">
              {fmt(new Date(row.started_at), "EEEE d 'de' MMMM · HH:mm")}
              {row.ended_at ? ` – ${fmt(new Date(row.ended_at), 'HH:mm')}` : ''}
            </p>
          )}
        </div>
        <div className="relative -mx-5 border-t-2 border-dashed border-rule" aria-hidden />
        <div className="grid grid-cols-2 gap-4">
          {part('them')}
          {part('me')}
        </div>
        <p className="flex items-center gap-2 text-[13px] text-muted">
          <Lamp size={18} className="text-amber-ink" aria-hidden />
          Cuenta para la racha de los dos.
        </p>
      </article>
      <label className="block space-y-1.5">
        <span className="label">Una línea para recordarla (opcional)</span>
        <input
          className="input hand text-[22px]"
          maxLength={200}
          placeholder="Con té y tus pies fríos"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          onBlur={() => {
            if ((row?.note ?? '') === note.trim()) return
            void saveTogetherNote(togetherId, note).catch(() => toast('No se pudo guardar la línea'))
          }}
        />
      </label>
    </div>
  )
}
