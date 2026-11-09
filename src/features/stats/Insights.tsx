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
  const current = currentStreak(dates, today)
  const longest = bestStreak(dates)
  // Only findings with something to say: nothing that repeats Inicio or waits «por descubrir».
  const cards = [
    finished.length >= goal
      ? {
          title: 'Tu objetivo',
          value: '¡Objetivo alcanzado!',
          detail: `Ya has disfrutado de ${finished.length} ${finished.length === 1 ? 'libro' : 'libros'} este año.`,
        }
      : projection.reachOn
        ? {
            title: 'Tu objetivo',
            value: 'Vas por buen camino',
            detail: `A tu ritmo, tus ${goal} ${goal === 1 ? 'libro' : 'libros'} llegan hacia el ${fmt(projection.reachOn, 'd MMM')}.`,
          }
        : null,
    best
      ? {
          title: 'Tu mejor día',
          value: best.name.charAt(0).toUpperCase() + best.name.slice(1),
          detail:
            best.morePct != null && best.morePct > 0
              ? `Lees un ${best.morePct} % más que el resto de días.`
              : 'Tu día con más lectura de este periodo.',
        }
      : null,
    mood
      ? {
          title: 'Ánimo más leído',
          value: mood.mood.charAt(0).toUpperCase() + mood.mood.slice(1),
          detail: average ? `Nota media del año: ${average} / 5` : 'Sin valoraciones este año todavía.',
        }
      : average
        ? { title: 'Tu nota media', value: `${average} / 5`, detail: `${rated.length} ${rated.length === 1 ? 'libro valorado' : 'libros valorados'} este año.` }
        : null,
    longest > 0
      ? {
          // Only your own days; the streak of the two of you lives in Nosotros.
          title: 'Tu racha',
          value: current > 1 ? `${formatDays(current)} seguidos` : current === 1 ? '1 día' : `Tu mejor: ${formatDays(longest)}`,
          detail:
            current > 0
              ? `Solo tus días de lectura. Tu mejor racha: ${formatDays(longest)}.`
              : 'Solo tus días de lectura. La de los dos está en Nosotros.',
        }
      : null,
  ].filter((card): card is { title: string; value: string; detail: string } => card !== null)
  if (!cards.length) return null

  return (
    <section aria-label="Hallazgos. Usa Tab para recorrer los recuerdos de lectura" className="rule flex flex-col">
      {cards.map(({ title, value, detail }) => (
        <article key={title} className="border-b border-rule py-5" tabIndex={0} aria-label={`${title}: ${value}`}>
          <h2 className="eyebrow text-muted">{title}</h2>
          <p className="mt-2 font-serif text-2xl leading-snug">{value}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">{detail}</p>
        </article>
      ))}
    </section>
  )
}
