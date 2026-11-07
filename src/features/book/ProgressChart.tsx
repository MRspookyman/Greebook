import { useState } from 'react'
import { differenceInCalendarDays } from 'date-fns'
import { fmt, fromISODate } from '@/lib/dates'
import type { Reading, Session } from '@/lib/types'
import { formatMinutes } from '@/lib/units'

const W = 300
const H = 140

/**
 * «Tu avance»: the position reached at the end of each reading day, plus a dashed projection to the
 * estimated finish. One series, so no legend; the endpoint and the finish are labelled directly.
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
  const byDay = new Map<string, number>()
  for (const s of ordered) byDay.set(s.read_on, s.end_pos)
  const start = reading.started_on && reading.started_on < ordered[0].read_on ? reading.started_on : ordered[0].read_on
  const points: { date: string; pos: number }[] = [{ date: start, pos: ordered[0].start_pos }, ...[...byDay].map(([date, pos]) => ({ date, pos }))]
  const end = finish && finish > today ? finish : today
  const span = Math.max(1, differenceInCalendarDays(fromISODate(end), fromISODate(start)))
  const x = (date: string) => (differenceInCalendarDays(fromISODate(date), fromISODate(start)) / span) * W
  const y = (pos: number) => H - 6 - (pos / reading.total_units) * (H - 14)
  const line = points.map((p) => `${x(p.date).toFixed(1)} ${y(p.pos).toFixed(1)}`).join(' L')
  const last = points[points.length - 1]
  const unit = (v: number) => (reading.unit === 'pages' ? `p. ${v}` : formatMinutes(v))
  return (
    <figure className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <figcaption className="text-[15px] font-semibold">Tu avance</figcaption>
        <button type="button" className="btn btn-link -my-2 px-1 text-[13px]" aria-pressed={table} onClick={() => setTable(!table)}>
          {table ? 'Ver gráfico' : 'Ver como tabla'}
        </button>
      </div>
      {table ? (
        <table className="w-full text-[14px]">
          <thead>
            <tr className="text-left text-[13px] text-muted">
              <th className="py-1 font-normal">Día</th>
              <th className="py-1 text-right font-normal">Hasta</th>
            </tr>
          </thead>
          <tbody>
            {points.slice(1).map((p) => (
              <tr key={p.date} className="border-t border-rule">
                <td className="py-1.5">{fmt(p.date, 'd MMM')}</td>
                <td className="py-1.5 text-right [font-variant-numeric:tabular-nums]">{unit(p.pos)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div
          role="img"
          aria-label={`Del ${fmt(start, 'd MMM')} a hoy has llegado a ${unit(last.pos)} de ${unit(reading.total_units)}${
            finish ? `; a este ritmo lo acabas hacia el ${fmt(finish, 'd MMM')}` : ''
          }.`}
        >
          <svg viewBox={`0 0 ${W} ${H}`} className="block h-[140px] w-full overflow-visible" preserveAspectRatio="none" aria-hidden>
            {[0, 0.5, 1].map((t) => (
              <line key={t} x1="0" x2={W} y1={y(t * reading.total_units)} y2={y(t * reading.total_units)} stroke="var(--grid)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            ))}
            <path d={`M${line} L${x(last.date).toFixed(1)} ${y(0)} L0 ${y(0)}Z`} fill="var(--accent)" opacity="0.1" />
            <path
              d={`M${line}`}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              pathLength={1}
              className="chart-draw"
            />
            {finish && finish > last.date && (
              <line
                x1={x(last.date)}
                y1={y(last.pos)}
                x2={x(finish)}
                y2={y(reading.total_units)}
                stroke="var(--muted)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
          <div className="mt-1 flex justify-between text-xs text-muted" aria-hidden>
            <span>{fmt(start, 'd MMM')}</span>
            <span className="font-medium text-ink">hoy · {unit(last.pos)}</span>
            {finish && finish > today ? <span>≈ {fmt(finish, 'd MMM')}</span> : <span>{unit(reading.total_units)}</span>}
          </div>
        </div>
      )}
    </figure>
  )
}
