import { Link } from 'react-router'
import { BottomSheet } from '@/components/BottomSheet'
import { Cover } from '@/components/Cover'
import { fmt } from '@/lib/dates'
import type { ReadingWithBook, Session } from '@/lib/types'
import { formatMinutes, formatUnitDelta } from '@/lib/units'

interface Props {
  date: string | null
  onClose: () => void
  sessions: Session[]
  readings: ReadingWithBook[]
  onRegister: (date: string) => void
}

export function DaySheet({ date, onClose, sessions, readings, onRegister }: Props) {
  const byId = new Map(readings.map((reading) => [reading.id, reading]))
  const daySessions = sessions.filter((session) => session.read_on === date)

  return (
    <BottomSheet open={date !== null} onClose={onClose} title={date ? fmt(date, "d 'de' MMMM") : undefined}>
      <div className="flex flex-col gap-4">
        {daySessions.length === 0 && <p className="py-4 text-muted">No hay sesiones registradas en este día.</p>}
        {daySessions.map((session) => {
          const reading = byId.get(session.reading_id)
          return (
            <article key={session.id} className="rule flex items-center gap-4 py-4">
              {reading && <Cover book={reading.book} width={48} />}
              <div className="min-w-0">
                {reading ? (
                  <Link
                    className="inline-flex min-h-11 items-center font-serif text-xl [overflow-wrap:anywhere]"
                    to={`/libro/${reading.id}`}
                    onClick={onClose}
                  >
                    {reading.book.title}
                  </Link>
                ) : (
                  <p>Lectura no disponible</p>
                )}
                <p className="text-sm text-muted">
                  {reading && `+${formatUnitDelta(reading.unit, session.end_pos - session.start_pos)}`}
                  {session.minutes !== null && `${reading ? ' · ' : ''}${formatMinutes(session.minutes)} de lectura`}
                </p>
              </div>
            </article>
          )
        })}
        <button
          className="btn btn-primary w-full"
          onClick={() => {
            if (date) onRegister(date)
          }}
        >
          Registrar en este día
        </button>
      </div>
    </BottomSheet>
  )
}
