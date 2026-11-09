import { useState } from 'react'
import { useMe } from '@/features/auth/me'
import { useReadings, useSessions } from '@/lib/data'
import { activityByDay } from '@/lib/stats/aggregate'
import { level, levelColor } from '@/lib/stats/intensity'
import { BAND_HOURS, BAND_SUMMARIES, readingHabits, readingSpeed, TIME_BANDS, yearDays } from '@/lib/stats/patterns'
import type { DateRange } from '@/lib/stats/aggregate'

const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

/** Personal and couple patterns live here, keeping Nosotros a lightweight daily view. */
export function ReadingPatterns({ range }: { range: DateRange }) {
  const { userId, profile, partner } = useMe()
  const mine = useSessions(userId)
  const myBooks = useReadings(userId)
  const theirs = useSessions(partner?.id)
  const theirBooks = useReadings(partner?.id)
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const people = [
    { profile, sessions: mine.data ?? [], readings: myBooks.data ?? [] },
    ...(partner ? [{ profile: partner, sessions: theirs.data ?? [], readings: theirBooks.data ?? [] }] : []),
  ]
  const partnerPending = !!partner && (theirs.isPending || theirBooks.isPending)
  const partnerFailed = !!partner && (theirs.isError || theirBooks.isError)
  const activities = people.map((person) => activityByDay(person.sessions, person.readings))
  const weeks = yearDays(year)
  const earliestYear = Math.min(currentYear, ...people.flatMap((person) => person.sessions.map((session) => Number(session.read_on.slice(0, 4)))))
  const filtered = people.map((person) => ({ ...person, sessions: person.sessions.filter((session) => session.read_on >= range.from && session.read_on <= range.to) }))
  return (
    <>
      {partnerFailed ? <p role="alert" className="text-sm text-danger">No se han podido cargar los datos de tu pareja. <button className="btn btn-link" onClick={() => { void theirs.refetch(); void theirBooks.refetch() }}>Reintentar</button></p> : partnerPending ? <p role="status" className="text-sm text-muted">Cargando los datos de los dos…</p> : null}
      <section className="rule space-y-4 pt-5" aria-labelledby="reading-hours">
        <h2 id="reading-hours" className="title">A qué hora leéis</h2>
        <p className="text-xs text-muted">Sesiones del periodo seleccionado, según la zona horaria de cada uno.</p>
        {filtered.map((person) => {
          const habits = readingHabits(person.sessions, person.profile.timezone)
          return <article key={person.profile.id} className="space-y-2">
            <h3 className="eyebrow" style={{ color: `var(--${person.profile.accent})` }}>{person.profile.display_name}</h3>
            <div className="grid items-center gap-1 text-center text-xs" style={{ gridTemplateColumns: '88px repeat(7, minmax(0, 1fr))' }}>
              <span />{DAYS.map((day, index) => <span key={index}>{day}</span>)}
              {habits.cells.map((row, band) => <div key={band} className="contents">
                <span className="text-left text-muted">{TIME_BANDS[band]}<span className="block text-[10px]">{BAND_HOURS[band]}</span></span>
                {row.map((count, day) => <span key={day} className="grid h-8 place-items-center rounded-sm border border-border" style={{ background: levelColor(count ? level(Math.ceil(count / habits.max * 70)) : 0, `--${person.profile.accent}`) }} title={`${DAYS[day]}, ${TIME_BANDS[band]}: ${count} sesiones`}>{count || '·'}</span>)}
              </div>)}
            </div>
            <p className="text-sm text-muted">{!habits.count ? 'Aún no hay sesiones con hora de inicio.' : habits.dominant === null ? `${person.profile.display_name} reparte sus lecturas entre varias horas del día.` : `${person.profile.display_name} lee sobre todo ${BAND_SUMMARIES[habits.dominant]}.`}</p>
          </article>
        })}
        <p className="text-xs text-muted">Sin cronómetro, la hora se estima restando los minutos a la hora de registro. Más color indica más sesiones.</p>
      </section>
      <section className="rule space-y-4 pt-5" aria-labelledby="year-squares">
        <header className="flex items-center justify-between gap-2">
          <h2 id="year-squares" className="title">Año en cuadritos</h2>
          <label className="text-sm">Año <select className="min-h-11 rounded border border-border bg-surface p-2" value={year} onChange={(event) => setYear(Number(event.target.value))}>
            {Array.from({ length: currentYear - earliestYear + 1 }, (_, index) => currentYear - index).map((value) => <option key={value}>{value}</option>)}
          </select></label>
        </header>
        <div className="overflow-x-auto pb-2" tabIndex={0} role="region" aria-label={`Actividad de lectura de ${year}; desliza para ver todo el año`}>
          <div className="flex w-max gap-[3px]">
            <div className="grid grid-rows-7 gap-[3px] pr-1 text-[10px] text-muted">{DAYS.map((day, index) => <span className="h-3 leading-3" key={index}>{day}</span>)}</div>
            {weeks.map((week, index) => <div key={index} className="grid grid-rows-7 gap-[3px]">{week.map((date, day) => {
              const colors = people.map((person, personIndex) => levelColor(level(activities[personIndex].get(date ?? '')?.score ?? 0), `--${person.profile.accent}`))
              const description = date ? `${date}: ${people.map((person, personIndex) => `${person.profile.display_name}, intensidad ${level(activities[personIndex].get(date)?.score ?? 0)} de 4`).join('; ')}` : ''
              return <span key={day} className={`block h-3 w-3 rounded-[2px] ${date ? 'border border-border' : ''}`} role={date ? 'img' : undefined} aria-label={description || undefined} title={description} style={date ? { background: colors.length === 2 ? `linear-gradient(135deg, ${colors[0]} 50%, ${colors[1]} 50%)` : colors[0] } : undefined} />
            })}</div>)}
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted">{people.map((person, index) => <span key={person.profile.id} style={{ color: `var(--${person.profile.accent})` }}>{person.profile.display_name}{people.length === 2 ? index === 0 ? ' ↖' : ' ↘' : ''}</span>)}</div>
        <div className="flex items-center gap-1 text-xs text-muted"><span>Menos</span>{[0, 5, 20, 45, 70].map((score) => <span key={score} className="h-3 w-3 rounded-sm border border-border" style={{ background: levelColor(level(score)) }} />)}<span>Más lectura</span></div>
      </section>
      {(() => {
        const speeds = filtered.map((person) => ({ ...person, speed: readingSpeed(person.sessions, person.readings) }))
        if (!speeds.some((person) => person.speed.overall.sessions >= 3)) return null
        return <section className="rule space-y-4 pt-5" aria-labelledby="reading-speed">
          <h2 id="reading-speed" className="title">Ritmo de lectura</h2>
          <div className="grid grid-cols-2 gap-4">{speeds.map((person) => <article key={person.profile.id} className="space-y-2">
            <h3 className="eyebrow" style={{ color: `var(--${person.profile.accent})` }}>{person.profile.display_name}</h3>
            {person.speed.overall.sessions < 3 ? <p className="text-xs text-muted">Aún no hay 3 sesiones cronometradas con páginas.</p> : <>
              <p><span className="folio text-3xl">{Math.round(person.speed.overall.pagesPerHour)}</span> <span className="text-xs text-muted">pág/h</span></p>
              <p className="text-xs text-muted">con {person.speed.overall.sessions} sesiones cronometradas</p>
              {(['paper', 'ebook'] as const).filter((format) => person.speed[format].sessions >= 3).map((format) => <p className="text-sm" key={format}>{format === 'paper' ? 'Papel' : 'Kindle'}: {Math.round(person.speed[format].pagesPerHour)} pág/h <span className="block text-xs text-muted">con {person.speed[format].sessions} sesiones cronometradas</span></p>)}
            </>}
          </article>)}</div>
          <p className="text-xs text-muted">Solo sesiones del periodo con minutos y páginas. En Kindle se estiman con las páginas del libro; sin ese dato, no cuentan.</p>
        </section>
      })()}
    </>
  )
}
