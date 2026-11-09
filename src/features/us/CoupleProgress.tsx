import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { Cover } from '@/components/Cover'
import { useEntered } from '@/components/motion'
import { useMe } from '@/features/auth/me'
import { recentReadings } from '@/features/today/recentReadings'
import { useReadings, useSessions } from '@/lib/data'
import { fmt, todayISO } from '@/lib/dates'
import { dailySeries, weekDays, type DayPoint } from '@/lib/stats/insights'
import type { Profile, ReadingWithBook, Session } from '@/lib/types'
import { formatUnitValue, progressFraction } from '@/lib/units'

const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const LIVE_MS = 2 * 60 * 60 * 1000

/** «Leyendo ahora» is a soft presence: a running timer in the last two hours. */
export function isReadingNow(person: Pick<Profile, 'reading_now_id' | 'reading_now_since'>): boolean {
  if (!person.reading_now_id || !person.reading_now_since) return false
  const elapsed = Date.now() - new Date(person.reading_now_since).getTime()
  return elapsed >= 0 && elapsed < LIVE_MS
}

const amount = (points: DayPoint[]) => {
  const pages = points.reduce((sum, point) => sum + point.pages, 0)
  return `${pages} ${pages === 1 ? 'pág' : 'págs'}`
}

/**
 * «Cómo vamos»: both readers side by side — current book, progress, today — and the week as
 * paired bars. Positive framing: days read together, never what's missing.
 */
export function CoupleProgress() {
  const { userId, profile, partner } = useMe()
  const mine = useReadings(userId)
  const theirs = useReadings(partner?.id)
  const mySessions = useSessions(userId)
  const theirSessions = useSessions(partner?.id)
  if (!partner) return null
  const today = todayISO()
  const week = weekDays(today)
  const range = { from: week[0], to: week[6] }
  const meSeries = dailySeries(mySessions.data ?? [], mine.data ?? [], range)
  const herSeries = dailySeries(theirSessions.data ?? [], theirs.data ?? [], range)
  const together = week.filter((_, index) => meSeries[index].score > 0 && herSeries[index].score > 0).length
  const todayIndex = week.indexOf(today)
  return (
    <section aria-labelledby="couple-progress" className="space-y-3">
      <h2 id="couple-progress" className="title">
        Cómo vamos
      </h2>
      <ul>
        <PersonRow
          person={profile}
          name="Tú"
          readings={mine.data ?? []}
          sessions={mySessions.data ?? []}
          today={meSeries[todayIndex]}
        />
        <PersonRow
          person={partner}
          name={partner.display_name}
          readings={theirs.data ?? []}
          sessions={theirSessions.data ?? []}
          today={herSeries[todayIndex]}
        />
      </ul>
      <WeekPairs
        week={week}
        today={today}
        mine={meSeries}
        theirs={herSeries}
        myAccent={profile.accent}
        partnerAccent={partner.accent}
        partnerName={partner.display_name}
        together={together}
      />
    </section>
  )
}

function PersonRow({
  person,
  name,
  readings,
  sessions,
  today,
}: {
  person: Profile
  name: string
  readings: ReadingWithBook[]
  sessions: Session[]
  today: DayPoint | undefined
}) {
  const entered = useEntered()
  const current = recentReadings(
    readings.filter((reading) => reading.status === 'reading'),
    sessions,
  )[0]
  const live = isReadingNow(person)
  const color = `var(--${person.accent})`
  const todayText = live
    ? 'leyendo ahora'
    : today && today.pages > 0
      ? `hoy +${today.pages} ${today.pages === 1 ? 'pág' : 'págs'}`
      : 'hoy aún no'
  const fraction = current ? progressFraction(current) : 0
  return (
    <li className="rule py-3">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="eyebrow" style={{ color }}>
          {name}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          {live && <span className="live-dot" style={{ color }} aria-hidden />}
          {todayText}
        </span>
      </div>
      {current ? (
        <Link to={`/libro/${current.id}`} className="flex items-center gap-3">
          <Cover book={current.book} width={40} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-serif text-lg leading-tight">{current.book.title}</span>
            <span className="relative mt-2 block h-[3px] overflow-hidden bg-rule" aria-hidden>
              <span
                className="absolute inset-0 origin-left"
                style={{
                  background: color,
                  transform: `scaleX(${entered ? fraction : 0})`,
                  transition: 'transform var(--dur-fill) var(--ease)',
                }}
              />
            </span>
            <span className="mt-1.5 block text-xs text-muted">
              {formatUnitValue(current.unit, current.current_position)} · {Math.round(fraction * 100)} %
            </span>
          </span>
        </Link>
      ) : (
        <p className="text-sm text-muted">Eligiendo su próximo libro</p>
      )}
    </li>
  )
}

function WeekPairs({
  week,
  today,
  mine,
  theirs,
  myAccent,
  partnerAccent,
  partnerName,
  together,
}: {
  week: string[]
  today: string
  mine: DayPoint[]
  theirs: DayPoint[]
  myAccent: string
  partnerAccent: string
  partnerName: string
  together: number
}) {
  const max = Math.max(1, ...mine.map((point) => point.score), ...theirs.map((point) => point.score))
  const height = (score: number) => (score > 0 ? Math.max(5, Math.round((score / max) * 52)) : 3)
  const bar = (score: number, accent: string, delay: number, future: boolean): CSSProperties => ({
    height: height(score),
    background: score > 0 ? `var(--${accent})` : 'var(--rule)',
    opacity: future ? 0.4 : 1,
    animationDelay: `${delay}ms`,
  })
  return (
    <div className="rule space-y-3 pt-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="eyebrow">Esta semana</h3>
        <p className="text-xs text-muted">
          <span style={{ color: `var(--${myAccent})` }}>Tú {amount(mine)}</span> ·{' '}
          <span style={{ color: `var(--${partnerAccent})` }}>
            {partnerName} {amount(theirs)}
          </span>
        </p>
      </div>
      <div
        className="grid grid-cols-7 gap-2"
        role="img"
        aria-label={`Esta semana: tú ${amount(mine)}, ${partnerName} ${amount(theirs)}. ${together} ${together === 1 ? 'día' : 'días'} leyendo los dos.`}
      >
        {week.map((date, index) => {
          const future = date > today
          const both = mine[index].score > 0 && theirs[index].score > 0
          return (
            <div key={date} className="flex flex-col items-center gap-1.5" aria-hidden>
              <div className="flex h-[56px] items-end gap-[3px]">
                <span
                  className="grow-y w-[7px] rounded-t-[2px]"
                  style={bar(mine[index].score, myAccent, 120 + index * 40, future)}
                />
                <span
                  className="grow-y w-[7px] rounded-t-[2px]"
                  style={bar(theirs[index].score, partnerAccent, 150 + index * 40, future)}
                />
              </div>
              <span
                className={`text-xs ${date === today ? 'text-ink underline underline-offset-4' : 'text-muted'}`}
                title={fmt(date, 'EEEE d')}
              >
                {DAYS[index]}
              </span>
              <span className={`h-1 w-1 rounded-full ${both ? 'bg-amber' : 'bg-transparent'}`} />
            </div>
          )
        })}
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted">
        <span className="h-1 w-1 rounded-full bg-amber" aria-hidden />
        {together === 0
          ? 'Cuando leáis los dos el mismo día, se marca aquí'
          : `${together} ${together === 1 ? 'día' : 'días'} leyendo los dos esta semana`}
      </p>
    </div>
  )
}
