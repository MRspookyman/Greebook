import { useState, type SubmitEvent } from 'react'
import { endOfYear, startOfYear } from 'date-fns'
import { ProgressBar } from '@/components/ProgressBar'
import { toast } from '@/components/toast'
import { useMe } from '@/features/auth/me'
import { useReadings, useSessions, useUpdateProfile } from '@/lib/data'
import { fmt, todayISO, toISODate } from '@/lib/dates'
import { summarize } from '@/lib/stats/aggregate'
import { bestStreak, currentStreak } from '@/lib/stats/streak'
import { formatDays, formatMinutes } from '@/lib/units'

export function StatsSection() {
  const { userId, profile } = useMe()
  const readingsQuery = useReadings(userId)
  const sessionsQuery = useSessions(userId)
  const updateProfile = useUpdateProfile(userId)
  const [goalDraft, setGoalDraft] = useState<string | null>(null)
  const [goalError, setGoalError] = useState('')
  const readings = readingsQuery.data ?? []
  const sessions = sessionsQuery.data ?? []
  const now = new Date()
  const year = now.getFullYear()
  const range = { from: toISODate(startOfYear(now)), to: toISODate(endOfYear(now)) }
  const summary = summarize(sessions, readings, range)
  const dates = new Set(sessions.map((session) => session.read_on))
  const finished = readings.filter(
    (reading) =>
      reading.status === 'finished' &&
      reading.finished_on !== null &&
      reading.finished_on >= range.from &&
      reading.finished_on <= range.to,
  )
  const rated = finished.filter((reading) => reading.rating !== null)
  const average = rated.length > 0 ? rated.reduce((sum, reading) => sum + reading.rating!, 0) / rated.length : null
  const moodCounts = new Map<string, number>()
  const monthCounts = Array<number>(12).fill(0)
  for (const reading of finished) {
    const monthIndex = Number(reading.finished_on!.slice(5, 7)) - 1
    monthCounts[monthIndex] = (monthCounts[monthIndex] ?? 0) + 1
    for (const mood of reading.moods) moodCounts.set(mood, (moodCounts.get(mood) ?? 0) + 1)
  }
  const topMoods = [...moodCounts]
    .sort(([a, countA], [b, countB]) => countB - countA || a.localeCompare(b, 'es'))
    .slice(0, 3)
  const maxBooks = Math.max(1, ...monthCounts)
  const loading = readingsQuery.isPending || sessionsQuery.isPending
  const failed = readingsQuery.isError || sessionsQuery.isError

  async function saveGoal(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const goal = Number(goalDraft ?? profile.yearly_goal)
    if (!Number.isInteger(goal) || goal < 1 || goal > 365) {
      setGoalError('El objetivo debe ser un número entero entre 1 y 365.')
      return
    }
    setGoalError('')
    try {
      await updateProfile.mutateAsync({ yearly_goal: goal })
      setGoalDraft(null)
      toast('Objetivo actualizado')
    } catch {
      setGoalError('No se ha podido guardar el objetivo. Inténtalo de nuevo.')
    }
  }

  return (
    <section className="flex flex-col gap-5" aria-labelledby="statistics-heading">
      <h2 id="statistics-heading">Estadísticas</h2>
      <div className="card flex flex-col gap-4">
        <form
          onSubmit={(event) => {
            void saveGoal(event)
          }}
          className="flex flex-col gap-2"
        >
          <label htmlFor="yearly-goal" className="label">
            Objetivo anual · {year}
          </label>
          <div className="flex items-end gap-3">
            <input
              id="yearly-goal"
              className="input min-w-0 flex-1"
              type="number"
              inputMode="numeric"
              min={1}
              max={365}
              step={1}
              required
              value={goalDraft ?? profile.yearly_goal}
              onChange={(event) => {
                setGoalDraft(event.target.value)
                setGoalError('')
              }}
              aria-describedby="yearly-goal-help"
              aria-invalid={goalError ? true : undefined}
              disabled={updateProfile.isPending}
            />
            <button
              className="btn btn-secondary"
              type="submit"
              disabled={updateProfile.isPending || goalDraft === null}
            >
              {updateProfile.isPending ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
          <p id="yearly-goal-help" className="text-xs text-muted">
            Entre 1 y 365 libros.
          </p>
          {goalError && (
            <p className="text-sm text-danger" role="alert">
              {goalError}
            </p>
          )}
        </form>
        {!loading && !failed && (
          <>
            <p className="text-sm">
              <span className="stat-number">
                {summary.booksFinished} / {profile.yearly_goal}
              </span>{' '}
              libros terminados
            </p>
            <ProgressBar value={summary.booksFinished / profile.yearly_goal} />
          </>
        )}
      </div>
      {failed ? (
        <div className="card flex flex-col gap-3" role="alert">
          <p>No se han podido cargar tus estadísticas.</p>
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
      ) : loading ? (
        <div className="grid animate-pulse grid-cols-2 gap-3" role="status" aria-label="Cargando estadísticas">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-border" />
          ))}
        </div>
      ) : (
        <>
          <dl className="card grid grid-cols-2 gap-5">
            <div>
              <dt className="text-sm text-muted">Racha actual</dt>
              <dd className="stat-number mt-1">{formatDays(currentStreak(dates, todayISO()))}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Mejor racha</dt>
              <dd className="stat-number mt-1">{formatDays(bestStreak(dates))}</dd>
            </div>
          </dl>
          <div className="card">
            <h3 className="mb-4 font-medium">Tu año en lecturas · {year}</h3>
            <dl className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-sm text-muted">Páginas</dt>
                <dd className="stat-number">{summary.pages.toLocaleString('es-ES')}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-sm text-muted">Horas escuchadas</dt>
                <dd className="stat-number">{formatMinutes(summary.audioMinutes)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-sm text-muted">Horas leídas registradas</dt>
                <dd className="stat-number">{formatMinutes(summary.readingMinutes)}</dd>
              </div>
            </dl>
          </div>
          <div className="card">
            <h3 className="mb-3 font-medium">Libros por mes</h3>
            <svg
              viewBox="0 0 360 156"
              className="w-full"
              role="img"
              aria-labelledby="books-chart-title books-chart-description"
            >
              <title id="books-chart-title">Libros terminados por mes en {year}</title>
              <desc id="books-chart-description">
                {monthCounts.map((count, index) => `${fmt(new Date(year, index, 1), 'MMMM')}: ${count}`).join('; ')}
              </desc>
              <line x1="0" x2="360" y1="124" y2="124" stroke="var(--border)" />
              {monthCounts.map((count, index) => {
                const date = new Date(year, index, 1)
                const height = (count / maxBooks) * 90
                const x = index * 30 + 5
                return (
                  <g key={index}>
                    <title>
                      {fmt(date, 'MMMM')}: {count}
                    </title>
                    <rect x={x} y={124 - height} width="20" height={height} rx="4" fill="var(--accent)" />
                    <text x={x + 10} y={116 - height} textAnchor="middle" fill="var(--ink)" fontSize="11">
                      {count}
                    </text>
                    <text x={x + 10} y="146" textAnchor="middle" fill="var(--muted)" fontSize="12">
                      {fmt(date, 'MMMM').charAt(0).toLocaleUpperCase('es-ES')}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
          <div className="card flex flex-col gap-5">
            <div>
              <h3 className="mb-1 font-medium">Valoración media de este año</h3>
              {average !== null ? (
                <p className="stat-number">
                  {average.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{' '}
                  <span className="text-sm text-muted">/ 5</span>
                </p>
              ) : (
                <p className="text-sm text-muted">Aún no has valorado ningún libro este año.</p>
              )}
            </div>
            <div>
              <h3 className="mb-2 font-medium">Ánimos más frecuentes</h3>
              {topMoods.length > 0 ? (
                <ol className="flex flex-wrap gap-2">
                  {topMoods.map(([mood, count]) => (
                    <li key={mood} className="rounded-full border border-border px-3 py-1 text-sm">
                      {mood} <span className="text-muted">· {count}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted">Tus ánimos aparecerán aquí al terminar un libro.</p>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
