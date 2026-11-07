import { Flame, Heart, Sparkles, Sun } from 'lucide-react'
import { fmt } from '@/lib/dates'
import { goalProjection, bestWeekday, topMood, periodRange, type Period } from '@/lib/stats/insights'
import { currentStreak, bestStreak } from '@/lib/stats/streak'
import type { ReadingWithBook, Session } from '@/lib/types'
import { formatDays } from '@/lib/units'

interface Props {
  readings: ReadingWithBook[]
  sessions: Session[]
  period: Period
  today: string
  goal: number
}

export function Insights({ readings, sessions, period, today, goal }: Props) {
  const range = periodRange(period, today)
  const yearRange = periodRange('year', today)
  const finished = readings.filter(
    (reading) =>
      reading.status === 'finished' &&
      reading.finished_on &&
      reading.finished_on >= yearRange.from &&
      reading.finished_on <= today,
  )
  const projection = goalProjection(finished.length, goal, today)
  const periodSessions = sessions.filter((session) => session.read_on >= range.from && session.read_on <= today)
  const best = bestWeekday(periodSessions, readings)
  const mood = topMood(readings, { ...range, to: today })
  const rated = finished.filter((reading) => reading.rating !== null)
  const average = rated.length
    ? (rated.reduce((sum, reading) => sum + reading.rating!, 0) / rated.length).toLocaleString('es', {
        maximumFractionDigits: 1,
        minimumFractionDigits: 1,
      })
    : null
  const dates = new Set(sessions.filter((session) => session.read_on <= today).map((session) => session.read_on))
  const cards = [
    {
      title: 'Tu camino lector',
      icon: Sparkles,
      value:
        finished.length >= goal
          ? '¡Objetivo alcanzado!'
          : projection.reachOn
            ? 'Vas por buen camino'
            : 'Cada página cuenta',
      detail:
        finished.length >= goal
          ? `Ya has disfrutado de ${finished.length} ${finished.length === 1 ? 'libro' : 'libros'} este año.`
          : projection.reachOn
            ? `A tu ritmo, tu objetivo de ${goal} ${goal === 1 ? 'libro' : 'libros'} se acerca hacia el ${fmt(projection.reachOn, 'd MMM')}.`
            : `Llevas ${finished.length} ${finished.length === 1 ? 'libro' : 'libros'} este año. Disfruta del siguiente ratito.`,
    },
    {
      title: 'Tu mejor día',
      icon: Sun,
      value: best ? best.name.charAt(0).toUpperCase() + best.name.slice(1) : 'Por descubrir',
      detail:
        best?.morePct != null && best.morePct > 0
          ? `Lees un ${best.morePct} % más que el resto de días.`
          : best
            ? 'Tu día con más lectura de este periodo.'
            : 'Registra sesiones para descubrir tu día favorito.',
    },
    {
      title: 'Ánimo más leído',
      icon: Heart,
      value: mood ? mood.mood.charAt(0).toUpperCase() + mood.mood.slice(1) : 'Por descubrir',
      detail: average ? `Nota media del año: ${average} / 5` : 'Sin valoraciones este año todavía.',
    },
    {
      title: 'Racha',
      icon: Flame,
      value: currentStreak(dates, today) > 0 ? `${formatDays(currentStreak(dates, today))} de lectura` : 'A tu ritmo',
      detail: `Tu mejor racha: ${formatDays(bestStreak(dates))}. Cada ratito cuenta.`,
    },
  ]

  return (
    <section
      aria-label="Hallazgos. Usa Tab para recorrer los recuerdos de lectura"
      className="no-scrollbar -mx-[18px] flex snap-x snap-mandatory gap-3 overflow-x-auto px-[18px] pb-1"
    >
      {cards.map(({ title, icon: Icon, value, detail }) => (
        <article
          key={title}
          className="card w-[88%] shrink-0 snap-center"
          tabIndex={0}
          aria-label={`${title}: ${value}`}
        >
          <h2 className="flex items-center gap-1.5 text-xs font-medium text-muted">
            <Icon size={14} className="text-accent" aria-hidden />
            {title}
          </h2>
          <p className="mt-1 font-serif text-xl font-semibold">{value}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{detail}</p>
        </article>
      ))}
    </section>
  )
}
