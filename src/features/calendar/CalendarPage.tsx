import { useMemo, useState } from 'react'
import { endOfMonth, startOfMonth } from 'date-fns'
import { Link } from 'react-router'
import { Cover } from '@/components/Cover'
import { EmptyState } from '@/components/EmptyState'
import { useMe } from '@/features/auth/me'
import { LogSessionSheet } from '@/features/session/LogSessionSheet'
import { useReadings, useSessions } from '@/lib/data'
import { fmt, todayISO, toISODate } from '@/lib/dates'
import { activityByDay, summarize } from '@/lib/stats/aggregate'
import { level, levelColor } from '@/lib/stats/intensity'
import { formatMinutes } from '@/lib/units'
import { DaySheet } from './DaySheet'
import { MonthGrid } from './MonthGrid'

export function CalendarPage() {
  const { userId } = useMe()
  const readingsQuery = useReadings(userId)
  const sessionsQuery = useSessions(userId)
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [registerDate, setRegisterDate] = useState<string | null>(null)
  const readings = useMemo(() => readingsQuery.data ?? [], [readingsQuery.data])
  const sessions = useMemo(() => sessionsQuery.data ?? [], [sessionsQuery.data])
  const activity = useMemo(() => activityByDay(sessions, readings), [sessions, readings])
  const readingById = useMemo(() => new Map(readings.map((reading) => [reading.id, reading])), [readings])
  const range = { from: toISODate(startOfMonth(month)), to: toISODate(endOfMonth(month)) }
  const summary = summarize(sessions, readings, range)
  const finished = readings.filter(
    (reading) =>
      reading.status === 'finished' &&
      reading.finished_on !== null &&
      reading.finished_on >= range.from &&
      reading.finished_on <= range.to,
  )
  const today = todayISO()
  const loading = readingsQuery.isPending || sessionsQuery.isPending
  const failed = readingsQuery.isError || sessionsQuery.isError

  return (
    <div className="flex flex-col gap-6 py-6">
      <h1>Calendario</h1>
      {failed && (
        <div className="card flex flex-col gap-3" role="alert">
          <p>No se ha podido cargar el calendario.</p>
          <button
            className="btn btn-secondary"
            onClick={() => {
              void readingsQuery.refetch()
              void sessionsQuery.refetch()
            }}
          >
            Reintentar
          </button>
        </div>
      )}
      {loading ? (
        <div className="card animate-pulse" role="status" aria-label="Cargando calendario">
          <div className="mb-6 h-8 rounded bg-border" />
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }, (_, i) => (
              <div key={i} className="h-20 rounded-xl bg-border" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <MonthGrid
            month={month}
            onMonthChange={setMonth}
            onDayClick={setSelectedDay}
            renderDay={(iso) => {
              const day = activity.get(iso)
              const reading = day ? readingById.get(day.topReadingId) : undefined
              return (
                <div
                  className={`flex min-h-20 flex-col items-center gap-1 rounded-xl px-0.5 py-1 ${iso === today ? 'ring-2 ring-inset ring-accent' : ''}`}
                  style={{ background: levelColor(level(day?.score ?? 0)) }}
                >
                  <span className={`text-sm ${iso === today ? 'font-semibold' : ''}`}>{fmt(iso, 'd')}</span>
                  <span className="relative flex items-end justify-center">
                    {reading && <Cover key={reading.book.id} book={reading.book} width={20} />}
                    {day && day.readingCount > 1 && (
                      <span
                        className="absolute -right-3 bottom-0 rounded bg-surface px-0.5 text-[10px] text-ink"
                        aria-label={`${day.readingCount} libros`}
                      >
                        +{day.readingCount - 1}
                      </span>
                    )}
                  </span>
                </div>
              )
            }}
          />
          <div
            className="flex items-center justify-center gap-1.5 text-xs text-muted"
            aria-label="Intensidad de lectura, de menor a mayor"
          >
            <span>Menos</span>
            {([0, 1, 2, 3, 4] as const).map((intensity) => (
              <span key={intensity} className="h-4 w-4 rounded" style={{ background: levelColor(intensity) }} />
            ))}
            <span>Más</span>
          </div>
          {summary.activeDays === 0 && summary.booksFinished === 0 && (
            <EmptyState title="Este mes aún no hay lecturas registradas">
              <p className="text-sm text-muted">Cada ratito de lectura encontrará su lugar aquí.</p>
            </EmptyState>
          )}
          <section className="card" aria-labelledby="month-summary">
            <h2 id="month-summary" className="mb-4">
              Resumen del mes
            </h2>
            <dl className="grid grid-cols-2 gap-5">
              {[
                ['Páginas', summary.pages.toLocaleString('es-ES')],
                ['Horas escuchadas', formatMinutes(summary.audioMinutes)],
                ['Tiempo de lectura registrado', formatMinutes(summary.readingMinutes)],
                ['Libros terminados', summary.booksFinished],
                ['Días con lectura', summary.activeDays],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-sm text-muted">{label}</dt>
                  <dd className="stat-number mt-1">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
          {finished.length > 0 && (
            <section aria-labelledby="month-finished">
              <h2 id="month-finished" className="mb-4">
                Terminados este mes
              </h2>
              <div className="flex flex-wrap gap-4">
                {finished.map((reading) => (
                  <Link
                    key={reading.id}
                    to={`/libro/${reading.id}`}
                    className="flex w-20 flex-col gap-2"
                    aria-label={reading.book.title}
                  >
                    <Cover book={reading.book} width={80} />
                    <span className="line-clamp-2 text-sm">{reading.book.title}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
      <DaySheet
        date={selectedDay}
        onClose={() => setSelectedDay(null)}
        readings={readings}
        sessions={sessions}
        onRegister={(date) => {
          setSelectedDay(null)
          setRegisterDate(date)
        }}
      />
      <LogSessionSheet
        open={registerDate !== null}
        onClose={() => setRegisterDate(null)}
        initialDate={registerDate ?? undefined}
      />
    </div>
  )
}
