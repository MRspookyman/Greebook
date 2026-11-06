import { useState } from 'react'
import { Link } from 'react-router'
import { useMe } from '@/features/auth/me'
import { useReadings, useSessions } from '@/lib/data'
import { greeting, todayISO } from '@/lib/dates'
import { currentStreak } from '@/lib/stats/streak'
import { formatDays, formatPosition, progressFraction } from '@/lib/units'
import type { ReadingWithBook } from '@/lib/types'
import { usePendingSessionCount } from '@/lib/offline/sessionQueue'
import { Cover } from '@/components/Cover'
import { ProgressBar } from '@/components/ProgressBar'
import { EmptyState } from '@/components/EmptyState'
import { LogSessionSheet } from '@/features/session/LogSessionSheet'
import { Timer } from '@/features/session/Timer'

export function TodayPage() {
  const { userId, profile, partner } = useMe()
  const readings = useReadings(userId)
  const sessions = useSessions(userId)
  const partnerReadings = useReadings(partner?.id)
  const pending = usePendingSessionCount()
  const [logging, setLogging] = useState<ReadingWithBook | null>(null)
  const today = todayISO()
  const finished =
    readings.data?.filter((r) => r.status === 'finished' && r.finished_on?.startsWith(today.slice(0, 4))).length ?? 0
  const active = readings.data?.filter((r) => r.status === 'reading') ?? []
  const partnerActive = partnerReadings.data?.filter((r) => r.status === 'reading') ?? []
  const streak = currentStreak(new Set(sessions.data?.map((s) => s.read_on) ?? []), today)
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1>
          {greeting()}, {profile.display_name}
        </h1>
        <p className="text-muted">
          {formatDays(streak)} de racha
        </p>
      </header>
      {pending > 0 && (
        <p className="card text-muted" role="status">
          {pending} {pending === 1 ? 'sesión pendiente' : 'sesiones pendientes'} de sincronizar
        </p>
      )}
      {readings.isPending ? (
        <div className="card h-48 animate-pulse" aria-label="Cargando lecturas" />
      ) : readings.isError && !readings.data ? (
        <p className="text-danger">No se pudieron cargar tus libros. Inténtalo al volver a conectarte.</p>
      ) : active.length === 0 ? (
        <EmptyState title="Aún no estás leyendo nada">
          <Link className="btn btn-primary mt-4" to="/biblioteca/buscar">
            Buscar un libro
          </Link>
        </EmptyState>
      ) : (
        <section className="space-y-4" aria-label="Tus lecturas actuales">
          {active.map((reading) => (
            <article className="card space-y-4" key={reading.id}>
              <Link to={`/libro/${reading.id}`} className="flex items-center gap-4 min-h-11">
                <Cover book={reading.book} width={64} />
                <div className="min-w-0">
                  <h2>{reading.book.title}</h2>
                  <p className="text-muted">{reading.book.authors.join(', ')}</p>
                </div>
              </Link>
              <ProgressBar value={progressFraction(reading)} />
              <p className="text-muted">{formatPosition(reading)}</p>
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-primary" onClick={() => setLogging(reading)}>
                  Registrar
                </button>
                <Timer reading={reading} />
              </div>
            </article>
          ))}
        </section>
      )}
      {partner && (
        <section className="space-y-3">
          <h2>{partner.display_name} está leyendo…</h2>
          {partnerReadings.isPending ? (
            <div className="card h-24 animate-pulse" />
          ) : partnerActive.length ? (
            partnerActive.map((reading) => (
              <Link className="card flex gap-3 items-center" key={reading.id} to={`/libro/${reading.id}`}>
                <Cover book={reading.book} width={44} />
                <div className="flex-1 min-w-0 space-y-2">
                  <p className="font-serif text-lg">{reading.book.title}</p>
                  <ProgressBar value={progressFraction(reading)} color={`var(--${partner.accent})`} />
                  <p className="text-muted text-sm">{formatPosition(reading)}</p>
                </div>
              </Link>
            ))
          ) : (
            <p className="text-muted">Todavía no tiene ningún libro en curso.</p>
          )}
        </section>
      )}
      <section className="card space-y-3">
        <h2>Tu objetivo anual</h2>
        <p className="stat-number text-3xl">
          {finished} / {profile.yearly_goal}
        </p>
        <ProgressBar value={finished / profile.yearly_goal} />
        <p className="text-muted">{finished === 1 ? 'Libro terminado' : 'Libros terminados'} este año</p>
        <Link className="btn btn-ghost" to="/perfil">
          Ver estadísticas
        </Link>
      </section>
      <LogSessionSheet open={logging !== null} onClose={() => setLogging(null)} reading={logging ?? undefined} />
    </div>
  )
}
