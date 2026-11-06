import { useState } from 'react'
import { differenceInCalendarDays } from 'date-fns'
import { CountUp } from '@/components/CountUp'
import { Segmented } from '@/components/Segmented'
import { useMe } from '@/features/auth/me'
import { LogSessionSheet } from '@/features/session/LogSessionSheet'
import { useReadings, useSessions } from '@/lib/data'
import { fmt, fromISODate, todayISO } from '@/lib/dates'
import { activityByDay, summarize } from '@/lib/stats/aggregate'
import { dailySeries, monthlySeries, pctChange, periodRange, previousRange, type Period } from '@/lib/stats/insights'
import { level, levelColor } from '@/lib/stats/intensity'
import { DaySheet } from './DaySheet'
import { Insights } from './Insights'
import { MonthGrid } from './MonthGrid'
import { PagesChart, type ChartPoint } from './PagesChart'

const PERIODS: { value: Period; label: string }[] = [
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: 'year', label: 'Año' },
]
const PERIOD_LABELS = { week: 'esta semana', month: 'este mes', year: 'este año' }
const PREVIOUS_LABELS = { week: 'semana pasada', month: 'mes pasado', year: 'año pasado' }
const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const MONTHS = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
const formatTime = (value: number) => {
  const minutes = Math.round(value)
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}` : `${minutes} min`
}
const formatNumber = (value: number) => Math.round(value).toLocaleString('es')

export function StatsPage() {
  const { userId, profile } = useMe()
  const readingsQuery = useReadings(userId)
  const sessionsQuery = useSessions(userId)
  const [period, setPeriod] = useState<Period>('week')
  const [view, setView] = useState<'bars' | 'map'>('bars')
  const today = todayISO()
  const [month, setMonth] = useState(() => fromISODate(today))
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [registerDate, setRegisterDate] = useState<string | null>(null)
  const readings = readingsQuery.data ?? []
  const sessions = sessionsQuery.data ?? []
  const range = periodRange(period, today)
  const summary = summarize(sessions, readings, { ...range, to: today })
  const previous = summarize(sessions, readings, previousRange(period, today))
  const elapsedDays = differenceInCalendarDays(fromISODate(today), fromISODate(range.from)) + 1
  const activity = activityByDay(sessions, readings)
  const metrics = [
    { label: 'Páginas', value: summary.pages, previous: previous.pages },
    {
      label: 'Tiempo',
      value: summary.audioMinutes + summary.readingMinutes,
      previous: previous.audioMinutes + previous.readingMinutes,
      format: formatTime,
    },
    {
      label: 'Días con lectura',
      value: summary.activeDays,
      previous: previous.activeDays,
      detail: `${summary.activeDays} de ${elapsedDays} días`,
    },
    {
      label: 'Libros terminados',
      value: summary.booksFinished,
      previous: previous.booksFinished,
      detail: summary.booksFinished === 0 ? 'Ninguno aún' : undefined,
    },
  ]
  const points: ChartPoint[] =
    period === 'year'
      ? monthlySeries(sessions, readings, today).map((point, index) => ({
          key: String(index),
          label: MONTHS[index],
          fullLabel: fmt(new Date(Number(today.slice(0, 4)), index, 1), 'MMMM'),
          pages: point.pages,
          showLabel: true,
        }))
      : dailySeries(sessions, readings, range).map((point, index) => ({
          key: point.date,
          label: period === 'week' ? WEEKDAYS[index] : String(index + 1),
          fullLabel: fmt(point.date, "EEEE d 'de' MMMM"),
          pages: point.pages,
          showLabel: period === 'week' || index === 0 || (index + 1) % 5 === 0,
        }))
  const pending = readingsQuery.isPending || sessionsQuery.isPending
  const failed = readingsQuery.isError || sessionsQuery.isError

  return (
    <div className="flex flex-col gap-3 py-4">
      <header className="flex items-baseline justify-between gap-2">
        <h1 className="font-serif text-[26px] font-semibold">Estadísticas</h1>
        <span className="text-xs text-muted">{PERIOD_LABELS[period]}</span>
      </header>
      <Segmented
        options={PERIODS}
        value={period}
        onChange={(value) => {
          setPeriod(value)
          setMonth(fromISODate(today))
        }}
        aria-label="Periodo de estadísticas"
      />
      {failed ? (
        <div className="card text-sm text-danger" role="alert">
          <p>No se han podido cargar tus estadísticas.</p>
          <button
            className="btn btn-secondary mt-2"
            onClick={() => {
              void readingsQuery.refetch()
              void sessionsQuery.refetch()
            }}
          >
            Reintentar
          </button>
        </div>
      ) : pending ? (
        <div className="grid grid-cols-2 gap-2.5" role="status" aria-label="Cargando estadísticas">
          {metrics.map((metric) => (
            <div key={metric.label} className="card h-28 animate-pulse bg-track" />
          ))}
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-2.5" aria-label="Resumen del periodo">
            {metrics.map((metric) => {
              const change = pctChange(metric.value, metric.previous)
              return (
                <article key={metric.label} className="card min-h-[104px]">
                  <h2 className="text-xs text-muted">{metric.label}</h2>
                  <p className="stat-number mt-1 text-[29px] leading-none">
                    <CountUp value={metric.value} format={metric.format ?? formatNumber} />
                  </p>
                  {metric.detail && <p className="mt-1 text-xs text-muted">{metric.detail}</p>}
                  {change !== null && (
                    <p
                      className={`mt-1 text-[11px] font-medium leading-tight ${change < 0 ? 'text-danger' : 'text-green'}`}
                    >
                      {change > 0 ? '+' : ''}
                      {change} % vs {PREVIOUS_LABELS[period]}
                    </p>
                  )}
                </article>
              )
            })}
          </section>
          <section className="card" aria-labelledby="pages-chart-heading">
            <header className="mb-2 flex items-center justify-between gap-2">
              <h2 id="pages-chart-heading" className="text-sm font-semibold">
                {period === 'year' ? 'Páginas por mes' : 'Páginas por día'}
              </h2>
              <div className="w-36 shrink-0">
                <Segmented
                  options={[
                    { value: 'bars', label: 'Barras' },
                    { value: 'map', label: 'Mapa' },
                  ]}
                  value={view}
                  onChange={setView}
                  aria-label="Vista de actividad"
                />
              </div>
            </header>
            {view === 'bars' ? (
              <PagesChart key={period} points={points} />
            ) : (
              <>
                <MonthGrid
                  month={month}
                  onMonthChange={setMonth}
                  onDayClick={setSelectedDay}
                  renderDay={(date) => (
                    <span
                      className={`grid h-full place-items-center rounded-xl text-sm ${date === today ? 'ring-2 ring-inset ring-accent' : ''}`}
                      style={{ background: levelColor(level(activity.get(date)?.score ?? 0)) }}
                    >
                      {Number(date.slice(8))}
                    </span>
                  )}
                />
                <div
                  className="mt-2 flex items-center justify-end gap-1 text-[10px] text-muted"
                  aria-label="Intensidad de lectura de menos a más"
                >
                  <span>Menos</span>
                  {[0, 1, 2, 3, 4].map((score) => (
                    <span
                      key={score}
                      className="h-2.5 w-2.5 rounded-sm border border-border"
                      style={{ background: levelColor(level([0, 5, 20, 45, 70][score])) }}
                    />
                  ))}
                  <span>Más</span>
                </div>
              </>
            )}
          </section>
          <Insights readings={readings} sessions={sessions} period={period} today={today} goal={profile.yearly_goal} />
        </>
      )}
      <DaySheet
        date={selectedDay}
        onClose={() => setSelectedDay(null)}
        sessions={sessions}
        readings={readings}
        onRegister={(date) => {
          setSelectedDay(null)
          setRegisterDate(date)
        }}
      />
      {registerDate && <LogSessionSheet open onClose={() => setRegisterDate(null)} initialDate={registerDate} />}
    </div>
  )
}
