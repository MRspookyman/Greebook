import { CountUp } from '@/components/CountUp'
import { useEntered } from '@/components/motion'
import { useMe } from '@/features/auth/me'
import { useReadings, useSessions } from '@/lib/data'
import { summarize } from '@/lib/stats/aggregate'
import { periodRange, type Period } from '@/lib/stats/insights'
import { formatDays } from '@/lib/units'

/**
 * «Los dos»: the same period for both readers, side by side. Each bar is relative to whoever
 * read more, and the closing line counts what you share (days read together), not who won.
 */
export function CoupleCompare({ period, today, label }: { period: Period; today: string; label: string }) {
  const { userId, profile, partner } = useMe()
  const myReadings = useReadings(userId).data ?? []
  const mySessions = useSessions(userId).data ?? []
  const theirReadings = useReadings(partner?.id).data ?? []
  const theirSessions = useSessions(partner?.id).data ?? []
  const entered = useEntered()
  if (!partner) return null
  const range = { ...periodRange(period, today), to: today }
  const inRange = (date: string) => date >= range.from && date <= range.to
  const mine = summarize(mySessions, myReadings, range)
  const hers = summarize(theirSessions, theirReadings, range)
  const myDays = new Set(mySessions.filter((s) => inRange(s.read_on)).map((s) => s.read_on))
  const together = new Set(
    theirSessions.filter((s) => inRange(s.read_on) && myDays.has(s.read_on)).map((s) => s.read_on),
  ).size
  const rows = [
    { name: 'Tú', accent: profile.accent, summary: mine },
    { name: partner.display_name, accent: partner.accent, summary: hers },
  ]
  const max = Math.max(1, ...rows.map((row) => row.summary.pages))
  return (
    <section className="rule space-y-4 pt-5" aria-labelledby="couple-compare">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="couple-compare" className="title">
          Los dos
        </h2>
        <span className="text-xs text-muted">{label}</span>
      </div>
      <dl className="space-y-4">
        {rows.map((row, index) => (
          <div key={row.name}>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="eyebrow" style={{ color: `var(--${row.accent})` }}>
                {row.name}
              </dt>
              <dd className="m-0 text-right">
                <span className="folio">
                  <CountUp value={row.summary.pages} />
                </span>{' '}
                <span className="text-xs text-muted">
                  págs ·{' '}
                  {formatDays(row.summary.activeDays)}
                  {row.summary.booksFinished
                    ? ` · ${row.summary.booksFinished} ${row.summary.booksFinished === 1 ? 'libro' : 'libros'}`
                    : ''}
                </span>
              </dd>
            </div>
            <div className="mt-2 h-[3px] overflow-hidden bg-rule" aria-hidden>
              <div
                className="h-full origin-left"
                style={{
                  background: `var(--${row.accent})`,
                  transform: `scaleX(${entered ? row.summary.pages / max : 0})`,
                  transition: `transform var(--dur-fill) var(--ease) ${index * 90}ms`,
                }}
              />
            </div>
          </div>
        ))}
      </dl>
      <p className="flex items-center gap-2 text-sm text-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-amber" aria-hidden />
        {together === 0 ? `Aún no habéis coincidido ${label}` : `${formatDays(together)} leyendo los dos ${label}`}
      </p>
    </section>
  )
}
