import { useState } from 'react'
import { differenceInCalendarDays } from 'date-fns'
import { fmt, fromISODate } from '@/lib/dates'
import type { Reading, Session } from '@/lib/types'
import { formatDays, formatMinutes } from '@/lib/units'

/**
 * «Tu avance» as the book itself: one strip from the first page to the last, cut into the stretch
 * read each day. Wide pieces are big reading days; the empty end is what is left.
 */
export function ProgressChart({
  reading,
  sessions,
  today,
  finish,
}: {
  reading: Pick<Reading, 'unit' | 'total_units' | 'current_position' | 'started_on'>
  sessions: Session[]
  today: string
  finish: string | null
}) {
  const [table, setTable] = useState(false)
  const ordered = [...sessions].sort((a, b) => a.read_on.localeCompare(b.read_on) || a.created_at.localeCompare(b.created_at))
  if (ordered.length < 2) return null
  const days: { date: string; from: number; to: number }[] = []
  for (const s of ordered) {
    const last = days[days.length - 1]
    if (last?.date === s.read_on) last.to = Math.max(last.to, s.end_pos)
    else days.push({ date: s.read_on, from: s.start_pos, to: s.end_pos })
  }
  const total = reading.total_units
  const reached = days[days.length - 1].to
  const best = days.reduce((a, b) => (b.to - b.from > a.to - a.from ? b : a))
  const span = differenceInCalendarDays(fromISODate(today), fromISODate(days[0].date)) + 1
  const unit = (v: number) => (reading.unit === 'pages' ? `${v} págs` : formatMinutes(v))
  const at = (v: number) => (reading.unit === 'pages' ? `p. ${v}` : formatMinutes(v))
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / total) * 100))}%`

  return (
    <figure className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <figcaption className="text-[15px] font-semibold">Tu avance</figcaption>
        <button type="button" className="btn btn-link -my-2 px-1 text-[13px]" aria-pressed={table} onClick={() => setTable(!table)}>
          {table ? 'Ver dibujo' : 'Ver como tabla'}
        </button>
      </div>
      {table ? (
        <table className="w-full text-[14px]">
          <thead>
            <tr className="text-left text-[13px] text-muted">
              <th className="py-1 font-normal">Día</th>
              <th className="py-1 text-right font-normal">Leído</th>
              <th className="py-1 text-right font-normal">Hasta</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.date} className="border-t border-rule">
                <td className="py-1.5">{fmt(d.date, 'd MMM')}</td>
                <td className="py-1.5 text-right [font-variant-numeric:tabular-nums]">+{unit(d.to - d.from)}</td>
                <td className="py-1.5 text-right [font-variant-numeric:tabular-nums]">{at(d.to)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div
          role="img"
          aria-label={`${days.length} días de lectura: has llegado a ${at(reached)} de ${at(total)}. Tu mejor día, ${unit(best.to - best.from)} el ${fmt(best.date, 'd MMM')}.`}
        >
          <div aria-hidden className="relative h-11 overflow-hidden rounded-[10px] border border-dashed border-rule">
            {days.map((d, i) => (
              <span
                key={d.date}
                className="absolute inset-y-0 border-r-2 border-bg"
                style={{
                  left: pct(d.from),
                  width: pct(d.to - d.from),
                  background: d === best ? 'var(--chrome-mark)' : `color-mix(in oklab, var(--accent) ${i % 2 ? 72 : 100}%, var(--bg))`,
                  animation: `gb-grow-x 520ms var(--ease) ${i * 50}ms both`,
                  transformOrigin: 'left',
                }}
              />
            ))}
          </div>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">
            Cada trozo es un día: {days.length} en {formatDays(span)}.{' '}
            <span className="text-ink">Tu mejor día, {unit(best.to - best.from)}</span> el {fmt(best.date, 'd MMM')}.
            {finish && finish > today ? ` Lo que queda en blanco, hacia el ${fmt(finish, 'd MMM')}.` : ''}
          </p>
        </div>
      )}
    </figure>
  )
}
