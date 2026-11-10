import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { differenceInCalendarDays } from 'date-fns'
import { CountUp } from '@/components/CountUp'
import { Segmented } from '@/components/Segmented'
import { useMe } from '@/features/auth/me'
import { useReadings, useSessions } from '@/lib/data'
import { fmt, fromISODate, todayISO } from '@/lib/dates'
import { activityByDay, summarize, timeSpent } from '@/lib/stats/aggregate'
import { dailySeries, monthlySeries, pctChange, periodRange, previousRange, type Period } from '@/lib/stats/insights'
import { level, levelColor } from '@/lib/stats/intensity'
import { formatDays, formatMinutes } from '@/lib/units'
import { CoupleCompare } from './CoupleCompare'
import { DaySheet } from './DaySheet'
import { Insights } from './Insights'
import { MonthGrid } from './MonthGrid'
import { PagesChart, type ChartPoint } from './PagesChart'
import { ReadingPatterns } from './ReadingPatterns'

const PERIODS: { value: Period; label: string }[] = [
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: 'year', label: 'Año' },
]
const PERIOD_LABELS = { week: 'esta semana', month: 'este mes', year: 'este año' }
const PREVIOUS_LABELS = { week: 'la semana pasada', month: 'el mes pasado', year: 'el año pasado' }
const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const MONTHS = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
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
  const navigate = useNavigate()
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
      value: timeSpent(sessions, { ...range, to: today }),
      previous: timeSpent(sessions, previousRange(period, today)),
      format: (value: number) => formatMinutes(Math.round(value)),
    },
    {
      label: 'Días con lectura',
      value: summary.activeDays,
      previous: previous.activeDays,
      detail: `${summary.activeDays} de ${formatDays(elapsedDays)}`,
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
        }))
      : dailySeries(sessions, readings, range).map((point, index) => ({
          key: point.date,
          label: period === 'week' ? WEEKDAYS[index] : String(index + 1),
          fullLabel: fmt(point.date, "EEEE d 'de' MMMM"),
          pages: point.pages,
        }))
  const pending = readingsQuery.isPending || sessionsQuery.isPending
  const failed = readingsQuery.isError || sessionsQuery.isError

  return (
    <div className="flex flex-col gap-6">
      <header className="enter flex flex-wrap items-center gap-3">
        <button type="button" className="icon-btn" aria-label="Volver" onClick={() => {
          if (typeof window.history.state?.idx === 'number' && window.history.state.idx > 0) navigate(-1)
          else navigate('/perfil', { replace: true })
        }}>
          <ArrowLeft size={20} aria-hidden />
        </button>
        <h1 className="display flex-1">Tus números</h1>
      </header>
      <Segmented
        variant="underline"
        options={PERIODS}
        value={period}
        onChange={(value) => {
          setPeriod(value)
          setMonth(fromISODate(today))
        }}
        aria-label="Periodo de estadísticas"
      />
      {failed ? (
        <div className="rule py-5 text-sm text-ink" role="alert">
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
        <div className="grid grid-cols-2" role="status" aria-label="Cargando estadísticas">
          {metrics.map((metric) => (
            <div key={metric.label} className="rule h-28 animate-pulse bg-track" />
          ))}
        </div>
      ) : (
        <>
          <p key={`headline-${period}`} className="font-serif text-2xl leading-snug" style={{ animation: 'gb-fade-up 320ms var(--ease) both' }}>
            {summary.pages > 0
              ? `Has leído ${formatNumber(summary.pages)} ${summary.pages === 1 ? 'página' : 'páginas'} ${PERIOD_LABELS[period]}.`
              : summary.activeDays > 0
                ? `Has leído ${formatDays(summary.activeDays)} ${PERIOD_LABELS[period]}.`
                : `${PERIOD_LABELS[period].charAt(0).toUpperCase()}${PERIOD_LABELS[period].slice(1)} aún no has leído. Cualquier ratito cuenta.`}
          </p>
          <section className="grid grid-cols-2 border-b border-rule" aria-label="Resumen del periodo">
            {metrics.map((metric) => {
              const change = pctChange(metric.value, metric.previous)
              return (
                <article key={metric.label} className="rule min-h-32 py-4 pr-3 even:pl-4">
                  <h2 className="eyebrow text-muted">{metric.label}</h2>
                  <p className={`folio mt-2 leading-none ${metric.format ? 'text-[25px] whitespace-nowrap' : 'text-[32px]'}`}>
                    <CountUp value={metric.value} format={metric.format ?? formatNumber} />
                  </p>
                  {change !== null && change >= 0 ? (
                    <p className="mt-1 text-xs leading-tight text-muted">
                      {change > 0
                        ? `${change} % más que ${PREVIOUS_LABELS[period]}`
                        : `Como ${PREVIOUS_LABELS[period]}`}
                    </p>
                  ) : (
                    metric.detail && <p className="mt-1 text-xs text-muted">{metric.detail}</p>
                  )}
                </article>
              )
            })}
          </section>
          <section className="space-y-4" aria-labelledby="pages-chart-heading">
            <header className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="pages-chart-heading" className="title">
                {view === 'map' ? 'Calendario' : period === 'year' ? 'Páginas por mes' : 'Páginas por día'}
              </h2>
              <div className="w-36 shrink-0">
                <Segmented
                  variant="underline"
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
                      className={`folio relative grid h-full place-items-center rounded-sm text-sm ${date === today ? 'ring-1 ring-inset ring-amber' : ''}`}
                    >
                      {Number(date.slice(8))}
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-1 bottom-1 h-1 rounded-sm"
                        style={{ background: levelColor(level(activity.get(date)?.score ?? 0)) }}
                      />
                    </span>
                  )}
                />
                <div
                  className="mt-2 flex items-center justify-end gap-1 text-xs text-muted"
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
                <p className="text-xs text-muted">
                  En Kindle sin número de páginas, los porcentajes colorean el día pero no suman páginas.
                </p>
              </>
            )}
          </section>
          <CoupleCompare key={period} period={period} today={today} label={PERIOD_LABELS[period]} />
          <Insights readings={readings} sessions={sessions} period={period} today={today} goal={profile.yearly_goal} />
          <ReadingPatterns range={{ ...range, to: today }} />
        </>
      )}
      <DaySheet
        date={selectedDay}
        onClose={() => setSelectedDay(null)}
        sessions={sessions}
        readings={readings}
        onRegister={(date) => {
          setSelectedDay(null)
          navigate(`/leer?modo=paginas&dia=${date}`)
        }}
      />
    </div>
  )
}
