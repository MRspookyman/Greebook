import { useState } from 'react'
import { Link } from 'react-router'
import { Gift, MessageCircle } from 'lucide-react'
import { useMe } from '@/features/auth/me'
import { useReadings } from '@/lib/data'
import { clubStops } from '@/lib/club'
import type { ReadingWithBook } from '@/lib/types'
import { progressFraction } from '@/lib/units'
import { DualProgressBar } from '@/components/DualProgressBar'
import { jointDistance } from './jointDistance'
import { useClubUnread } from './joint'
import { RecommendSheet } from './RecommendSheet'

/** «Juntos» tab of a book: shared progress, the club de dos and «Recomendar a …». */
export function JointReadingSection({ reading }: { reading: ReadingWithBook }) {
  const { userId, profile, partner } = useMe()
  const mine = useReadings(userId)
  const theirs = useReadings(partner?.id)
  const [recommending, setRecommending] = useState(false)
  const { count } = useClubUnread(reading.book_id)
  if (!partner) return <p className="py-3 text-sm text-muted">Cuando estéis emparejados, aquí leeréis juntos.</p>
  const latest = (list: ReadingWithBook[]) =>
    list
      .filter((r) => r.book_id === reading.book_id)
      .sort(
        (a, b) =>
          Number(b.status === 'reading') - Number(a.status === 'reading') || b.updated_at.localeCompare(a.updated_at),
      )[0]
  const myReading = reading.user_id === userId ? reading : latest(mine.data ?? [])
  const partnerReading = reading.user_id === partner.id ? reading : latest(theirs.data ?? [])
  const own = reading.user_id === userId
  const both = !!myReading && !!partnerReading

  return (
    <section className="space-y-3 pt-3">
      {both && (
        <div className="card space-y-1">
          <h2 className="font-sans text-sm font-semibold">Vuestro progreso</h2>
          <DualProgressBar
            a={{
              value: progressFraction(myReading),
              accent: profile.accent,
              label: profile.display_name,
              caption: myReading.unit === 'pages' ? String(myReading.current_position) : undefined,
            }}
            b={{
              value: progressFraction(partnerReading),
              accent: partner.accent,
              label: partner.display_name,
              caption: partnerReading.unit === 'pages' ? String(partnerReading.current_position) : undefined,
            }}
            stops={clubStops(myReading).map((page) => ({
              value: page / myReading.total_units,
              done:
                myReading.current_position >= page && progressFraction(partnerReading) * myReading.total_units >= page,
              label: `Parada p. ${page}`,
            }))}
          />
          <p className="text-xs text-muted">{jointDistance(myReading, partnerReading, partner.display_name)}</p>
        </div>
      )}
      {both ? (
        <Link to={`/club/${reading.book_id}`} className="btn btn-primary w-full">
          <MessageCircle size={18} /> Abrir el club de dos
          {count > 0 && (
            <span className="num grid h-5 min-w-5 place-items-center rounded-full bg-surface px-1 text-[11px] font-bold text-accent">
              {count}
            </span>
          )}
        </Link>
      ) : (
        <p className="text-sm text-muted">
          {own
            ? `${partner.display_name} no tiene este libro. Recomiéndaselo y, si queréis, leedlo a la vez.`
            : `Tú no tienes este libro. Si lo añades, se abre vuestro club de dos.`}
        </p>
      )}
      {own && (
        <button className="btn btn-secondary w-full" onClick={() => setRecommending(true)}>
          <Gift size={18} /> Recomendar a {partner.display_name}
        </button>
      )}
      {own && <RecommendSheet reading={reading} open={recommending} onClose={() => setRecommending(false)} />}
    </section>
  )
}
