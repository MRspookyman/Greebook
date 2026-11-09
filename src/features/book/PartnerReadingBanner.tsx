import { useState } from 'react'
import { Link } from 'react-router'
import { useMe } from '@/features/auth/me'
import { useReadings, useTogether } from '@/lib/data'
import type { ReadingWithBook } from '@/lib/types'
import { formatUnitValue, percentOf } from '@/lib/units'
import { Avatar } from '@/components/Avatar'
import { QuoteSheet } from '@/features/quotes/QuoteSheet'
import { addTogether } from '@/features/us/together'
import { isPartnerReading } from '@/lib/presence'
import { toast } from '@/components/toast'

/** Says whose reading this is and links it to mine: the bridge between both diaries. */
export function PartnerReadingBanner({ reading }: { reading: ReadingWithBook }) {
  const { userId, partner } = useMe()
  const myReadings = useReadings(userId)
  const together = useTogether()
  const [tracing, setTracing] = useState(false)
  const [adding, setAdding] = useState(false)
  if (!partner) return null
  const mine = myReadings.data
    ?.filter((item) => item.book_id === reading.book_id)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]
  const listed = together.data?.some((item) => item.book_id === reading.book_id)
  const live = isPartnerReading(partner) && partner.reading_now_id === reading.id
  const color = `var(--${partner.accent})`
  return (
    <section className="enter rule space-y-2 pt-3" aria-label={`Lectura de ${partner.display_name}`}>
      <p className="flex items-center gap-2 text-sm">
        <Avatar person={partner} size={26} />
        <span>
          La lectura de <span style={{ color }}>{partner.display_name}</span>
        </span>
        {live && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-muted">
            <span className="live-dot" style={{ color }} aria-hidden />
            leyendo ahora
          </span>
        )}
      </p>
      {mine ? (
        <div className="flex flex-wrap items-center gap-x-4">
          <Link to={`/libro/${mine.id}`} className="btn btn-link px-0 text-sm">
            Tu lectura: {formatUnitValue(mine.unit, mine.current_position)}
            {mine.unit === 'pages' && ` · ${percentOf(mine)} %`}
          </Link>
          {['want', 'reading'].includes(mine.status) && (
            <button type="button" className="btn btn-link px-0 text-sm" onClick={() => setTracing(true)}>
              Guardar una cita
            </button>
          )}
        </div>
      ) : listed ? (
        <p className="text-xs text-muted">Está en lo que queréis leer juntos.</p>
      ) : (
        <button
          type="button"
          className="btn btn-link px-0 text-sm"
          disabled={adding}
          onClick={() => {
            setAdding(true)
            void addTogether(reading.book_id)
              .then(() => toast('Añadido a lo que queréis leer juntos'))
              .catch(() => toast('No se pudo añadir el libro'))
              .finally(() => setAdding(false))
          }}
        >
          Queremos leerlo juntos
        </button>
      )}
      {mine && <QuoteSheet open={tracing} onClose={() => setTracing(false)} bookId={mine.book_id} />}
    </section>
  )
}
