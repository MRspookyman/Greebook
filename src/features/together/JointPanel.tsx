import { useState } from 'react'
import { Heart } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { useMe } from '@/features/auth/me'
import { useReadings, useReadTogether } from '@/lib/data'
import { fmt } from '@/lib/dates'
import { isPartnerReading } from '@/lib/presence'
import type { ReadingWithBook } from '@/lib/types'
import { formatLabel, formatPosition } from '@/lib/units'
import { useLiveTogether } from './live'

/** Both readers joined by a thread: each one's book and position, live, and the heartbeat button. */
export function JointPanel({
  togetherId,
  reading,
  myPage,
}: {
  togetherId: string
  reading: ReadingWithBook
  myPage: number
}) {
  const { profile, partner } = useMe()
  const theirs = useReadings(partner?.id).data ?? []
  const row = useReadTogether().data?.find((item) => item.id === togetherId)
  const { partnerPage, received, sendBeat } = useLiveTogether(togetherId, myPage)
  const [sent, setSent] = useState(0)
  const pulse = received + sent
  if (!partner) return null
  const live = isPartnerReading(partner)
  const theirReading = theirs.find((r) => r.id === partner.reading_now_id) ?? theirs.find((r) => r.status === 'reading')
  const theirPage = partnerPage ?? theirReading?.current_position ?? null
  const thread = `linear-gradient(90deg, var(--${partner.accent}), var(--${profile.accent}))`
  const reader = (who: 'them' | 'me') => {
    const person = who === 'them' ? partner : profile
    const r = who === 'them' ? theirReading : reading
    const page = who === 'them' ? theirPage : myPage
    return (
      <div className="grid min-w-0 justify-items-center gap-1.5 text-center">
        <Avatar person={person} size={60} live={who === 'me' || live} />
        <p className="text-sm font-extrabold" style={{ color: `var(--${person.accent})` }}>
          {who === 'them' ? person.display_name : 'Tú'}
        </p>
        <p className="line-clamp-2 text-[13px] leading-tight text-muted">{r?.book.title ?? '…'}</p>
        {r && <p className="text-xs text-muted">{formatLabel(r.format)}</p>}
        {page !== null && r && (
          <p className="folio text-[19px] whitespace-nowrap">{formatPosition({ ...r, current_position: page })}</p>
        )}
      </div>
    )
  }
  return (
    <section className="space-y-4 pt-2" aria-label={`Leyendo a la vez con ${partner.display_name}`}>
      <p className="text-center text-sm font-extrabold">
        Leyendo juntos
        {row && (
          <span className="block text-[12.5px] font-bold text-muted">
            desde las {fmt(new Date(row.started_at), 'HH:mm')}
          </span>
        )}
      </p>
      <div className="grid grid-cols-[1fr_64px_1fr] items-start">
        {reader('them')}
        <div className="relative mt-[30px] h-0.5 rounded-full" style={{ background: thread }} aria-hidden>
          <span
            key={pulse}
            className="absolute top-1/2 left-1/2 grid -translate-x-1/2 -translate-y-1/2 rounded-full bg-bg p-0.5 text-rose"
            style={{ animation: pulse ? 'gb-beat 900ms var(--ease)' : undefined }}
          >
            <Heart size={22} fill="currentColor" />
          </span>
        </div>
        {reader('me')}
      </div>
      <div className="flex justify-center">
        <button
          type="button"
          className="btn btn-soft text-rose"
          onClick={() => {
            sendBeat()
            setSent((n) => n + 1)
          }}
        >
          <Heart size={18} fill="currentColor" aria-hidden />
          <span className="text-ink">Mandar un latido</span>
        </button>
      </div>
    </section>
  )
}
