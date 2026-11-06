import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Gift, Play, Users } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { Cover } from '@/components/Cover'
import { toast } from '@/components/toast'
import { useMe } from '@/features/auth/me'
import { startTimer, useActiveTimer } from '@/features/session/Timer'
import { isLive, nextStop, positionInPages } from '@/lib/club'
import { qk, useNudges, useReadings, useRecommendations } from '@/lib/data'
import { fmt, todayISO } from '@/lib/dates'
import { supabase } from '@/lib/supabase'
import type { RecommendationWithBook } from '@/lib/types'
import { formatPosition } from '@/lib/units'
import { useClubUnread, useJointBooks, useSortedClubs, type JointBook } from './joint'

const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h
    ? `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
    : `${m}:${String(s % 60).padStart(2, '0')}`
}

/** «Leyendo ahora»: my partner has a timer running. «Leer a la vez» starts mine on the same book if I have it. */
export function PartnerLiveCard({ style }: { style?: CSSProperties }) {
  const { userId, partner } = useMe()
  const theirs = useReadings(partner?.id)
  const mine = useReadings(userId)
  const timer = useActiveTimer()
  const [now, setNow] = useState(Date.now())
  const live = isLive(partner, now)
  useEffect(() => {
    if (!live) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [live])
  if (!partner || !live) return null
  const reading = theirs.data?.find((r) => r.id === partner.reading_now_id)
  const myActive = (mine.data ?? []).filter((r) => r.status === 'reading')
  const target = myActive.find((r) => r.book_id === reading?.book_id) ?? myActive[0]
  const together = !!timer
  return (
    <section
      className="card rise space-y-1"
      style={{
        ...style,
        background: `linear-gradient(135deg, color-mix(in oklab, var(--${partner.accent}) 15%, var(--surface)), var(--surface) 70%)`,
        borderColor: `color-mix(in oklab, var(--${partner.accent}) 30%, var(--border))`,
      }}
      aria-label={`${partner.display_name} está leyendo ahora`}
    >
      <div
        className="flex items-center justify-between text-[11px] font-semibold tracking-wide uppercase"
        style={{ color: `var(--${partner.accent})` }}
      >
        <span className="flex items-center gap-1.5">
          <span className="h-[7px] w-[7px] rounded-full bg-green" style={{ animation: 'gb-breathe 1.4s infinite' }} />
          {partner.display_name} está leyendo ahora
        </span>
        <span className="num font-medium text-muted normal-case" role="timer">
          {clock(now - new Date(partner.reading_now_since!).getTime())}
        </span>
      </div>
      <div className="flex items-center gap-2.5">
        <div className="min-w-0 flex-1">
          {reading && (
            <p className="truncate text-xs text-muted">
              {reading.book.title} · {formatPosition(reading).split(' / ')[0]}
            </p>
          )}
        </div>
      </div>
      {!together &&
        (target ? (
          <button
            className="btn min-h-11 px-3 text-xs text-surface"
            style={{ background: `var(--${partner.accent})` }}
            onClick={() => {
              if (startTimer(target)) toast(`Leyendo a la vez con ${partner.display_name}`, target.book.title)
            }}
          >
            <Play size={15} fill="currentColor" /> Leer a la vez
          </button>
        ) : (
          <Link className="btn btn-secondary w-full" to="/biblioteca">
            Elige un libro para leer a la vez
          </Link>
        ))}
    </section>
  )
}

function ClubCard({ joint }: { joint: JointBook }) {
  const { partner } = useMe()
  const { count, latest } = useClubUnread(joint.book.id)
  const stop = nextStop(joint.mine)
  const myPage = positionInPages(joint.mine, joint.book.page_count)
  return (
    <Link
      to={`/club/${joint.book.id}`}
      className="card pressable flex items-start gap-3"
      aria-label={`Club de dos: ${joint.book.title}`}
    >
      <Cover book={joint.book} width={44} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[13px] font-semibold">
            <Users size={13} className="mr-1 inline align-[-2px]" />
            Club · {joint.book.title}
          </p>
          {count > 0 && (
            <span
              className="num grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[11px] font-bold text-white"
              style={{ animation: 'gb-pop .5s var(--spring)' }}
            >
              {count}
            </span>
          )}
        </div>
        <p className="line-clamp-2 text-xs text-muted">
          {latest
            ? latest.page != null && myPage != null && latest.page > myPage && joint.mine.status !== 'finished'
              ? `${partner?.display_name} ha escrito en la p. ${latest.page} (por delante de ti)`
              : `${partner?.display_name}: «${latest.body}»`
            : 'Aún no habéis hablado de este libro. Escribe lo que te está pareciendo.'}
        </p>
        {stop && myPage != null && (
          <p className="text-[11px] font-semibold text-amber">
            Próxima parada: p. {stop} · a {stop - myPage} págs.
          </p>
        )}
      </div>
    </Link>
  )
}

export function ClubCards({ unreadOnly = false }: { unreadOnly?: boolean }) {
  const clubs = useSortedClubs()
  const first = clubs[0]
  if (!first || (unreadOnly && !first.unread)) return null
  return (
    <div className="space-y-1">
      <ClubCard joint={first.joint} />
      {clubs.length > 1 && (
        <Link to="/nosotros" className="flex min-h-11 items-center justify-end text-xs text-accent">
          +{clubs.length - 1} clubs
        </Link>
      )}
    </div>
  )
}

/** Accept a recommendation: my reading copies the format of my partner's. */
async function accept(rec: RecommendationWithBook, userId: string, partnerId: string) {
  const { data: source } = await supabase
    .from('readings')
    .select('format, unit, total_units')
    .eq('user_id', partnerId)
    .eq('book_id', rec.book_id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const today = todayISO()
  const startsNow = rec.together && rec.start_on !== null && rec.start_on <= today
  const { data: existing, error: findError } = await supabase
    .from('readings')
    .select('id, status')
    .eq('user_id', userId)
    .eq('book_id', rec.book_id)
    .in('status', ['want', 'reading'])
    .limit(1)
  if (findError) throw findError
  if (!existing?.length) {
    const total = source?.total_units ?? rec.book.page_count
    if (!total) throw new Error('Sin número de páginas')
    const { error } = await supabase.from('readings').insert({
      user_id: userId,
      book_id: rec.book_id,
      format: source?.format ?? 'paper',
      unit: source?.unit ?? 'pages',
      total_units: total,
      status: startsNow ? 'reading' : 'want',
      started_on: startsNow ? rec.start_on : null,
    })
    if (error) throw error
  } else if (startsNow && existing[0].status === 'want') {
    const { error } = await supabase
      .from('readings')
      .update({ status: 'reading', started_on: rec.start_on })
      .eq('id', existing[0].id)
      .eq('user_id', userId)
    if (error) throw error
  }
  const { error } = await supabase.from('recommendations').update({ status: 'accepted' }).eq('id', rec.id)
  if (error) throw error
}

export function RecommendationCards() {
  const { userId, partner } = useMe()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const recs = useRecommendations(!!partner)
  const [busy, setBusy] = useState<string | null>(null)
  const pending = (recs.data ?? []).filter((r) => r.to_user === userId && r.status === 'pending')
  if (!partner || !pending.length) return null
  async function act(rec: RecommendationWithBook, yes: boolean) {
    setBusy(rec.id)
    try {
      if (yes) await accept(rec, userId, partner!.id)
      else {
        const { error } = await supabase.from('recommendations').update({ status: 'dismissed' }).eq('id', rec.id)
        if (error) throw error
      }
      await Promise.all([
        qc.invalidateQueries({ queryKey: qk.recommendations() }),
        qc.invalidateQueries({ queryKey: qk.readings(userId) }),
      ])
      if (yes) {
        toast(`«${rec.book.title}» está en tu biblioteca`)
        if (rec.together) navigate(`/club/${rec.book_id}`)
      }
    } catch {
      toast('No se pudo guardar', yes ? 'Añádelo desde la biblioteca.' : undefined)
    } finally {
      setBusy(null)
    }
  }
  return (
    <>
      {pending.slice(0, 1).map((rec) => (
        <section
          key={rec.id}
          className="card rise flex items-start gap-3 border-transparent bg-soft"
          aria-label={`Recomendación de ${partner.display_name}`}
        >
          <Gift size={22} className="mt-0.5 shrink-0 text-accent" />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[13px] font-semibold">
              {partner.display_name} te recomienda «{rec.book.title}»
            </p>
            {rec.message && <p className="line-clamp-1 text-xs text-muted">«{rec.message}»</p>}
            {rec.together && (
              <p className="text-[11px] font-semibold text-amber">
                Para leerlo juntos{rec.start_on ? ` desde el ${fmt(rec.start_on, 'EEEE d')}` : ''}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <button
                className="btn btn-primary min-h-9 px-3 text-xs"
                disabled={busy === rec.id}
                onClick={() => void act(rec, true)}
              >
                {rec.together ? 'Leámoslo' : 'Añadir'}
              </button>
              <button
                className="btn min-h-9 px-3 text-xs text-muted"
                disabled={busy === rec.id}
                onClick={() => void act(rec, false)}
              >
                Ahora no
              </button>
            </div>
          </div>
        </section>
      ))}
    </>
  )
}

/** A «leámoslo juntos» whose start date has arrived and that I haven't started yet. */
export function TogetherStartCards() {
  const { userId, partner } = useMe()
  const qc = useQueryClient()
  const recs = useRecommendations(!!partner)
  const joint = useJointBooks()
  const today = todayISO()
  if (!partner) return null
  const due = joint.filter(
    (j) =>
      j.mine.status === 'want' &&
      (recs.data ?? []).some(
        (r) =>
          r.book_id === j.book.id &&
          r.together &&
          r.status !== 'dismissed' &&
          r.start_on !== null &&
          r.start_on <= today,
      ),
  )
  if (!due.length) return null
  return (
    <>
      {due.slice(0, 1).map((j) => (
        <section key={j.book.id} className="card rise flex items-center gap-3">
          <Cover book={j.book} width={40} />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold">Hoy empezáis «{j.book.title}»</p>
            <p className="text-xs text-muted">
              {j.theirs.status === 'reading' ? `${partner.display_name} ya ha empezado` : `Con ${partner.display_name}`}
            </p>
          </div>
          <button
            className="btn btn-primary min-h-9 px-3 text-xs"
            onClick={async () => {
              const { error } = await supabase
                .from('readings')
                .update({ status: 'reading', started_on: today })
                .eq('id', j.mine.id)
                .eq('user_id', userId)
              if (error) toast('No se pudo empezar')
              else await qc.invalidateQueries({ queryKey: qk.readings(userId) })
            }}
          >
            Empezar
          </button>
        </section>
      ))}
    </>
  )
}

/** One prioritized couple item keeps Hoy focused on the next useful action. */
export function TodayCouple({ children }: { children: ReactNode }) {
  const { userId, profile, partner } = useMe()
  const recs = useRecommendations(!!partner)
  const nudges = useNudges(!!partner)
  const clubs = useSortedClubs()
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  if (!partner) return null
  if (isLive(partner, now)) return <PartnerLiveCard />
  if ((recs.data ?? []).some((r) => r.to_user === userId && r.status === 'pending')) {
    return <RecommendationCards />
  }
  const nudge = nudges.data?.find(
    (n) => n.to_user === userId && (!profile.last_seen_us_at || n.created_at > profile.last_seen_us_at),
  )
  if (nudge) {
    return (
      <Link to="/nosotros" className="card flex min-h-11 items-center gap-2 text-xs">
        <Avatar person={partner} size={30} />
        <span>
          {partner.display_name} te dio un toque: «{nudge.message}»
        </span>
      </Link>
    )
  }
  const due = clubs.some(
    ({ joint: j }) =>
      j.mine.status === 'want' &&
      (recs.data ?? []).some(
        (r) =>
          r.book_id === j.book.id &&
          r.together &&
          r.status !== 'dismissed' &&
          r.start_on !== null &&
          r.start_on <= todayISO(),
      ),
  )
  if (due) return <TogetherStartCards />
  if (clubs[0]?.unread) return <ClubCards unreadOnly />
  return <>{children}</>
}
