import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNowStrict } from 'date-fns'
import { es } from 'date-fns/locale'
import { Hand, MessageCircle } from 'lucide-react'
import { useMe } from '@/features/auth/me'
import { Avatar } from '@/components/Avatar'
import { DualProgressBar } from '@/components/DualProgressBar'
import { EmptyState } from '@/components/EmptyState'
import { Segmented } from '@/components/Segmented'
import { Stars } from '@/components/Stars'
import { useEntered } from '@/components/motion'
import { clubStops } from '@/lib/club'
import { qk, useNudges, useReactions, useReadings, useRecommendations, useSessions, useSharedNotes } from '@/lib/data'
import { todayISO } from '@/lib/dates'
import { isSpoiler } from '@/lib/spoilers'
import { summarize } from '@/lib/stats/aggregate'
import { periodRange, type Period } from '@/lib/stats/insights'
import { supabase } from '@/lib/supabase'
import type { Profile, ReactionTarget, ReadingWithBook, Session } from '@/lib/types'
import { formatUnitDelta, progressFraction } from '@/lib/units'
import { ChallengeCard } from './ChallengeCard'
import { useJointBooks } from './joint'
import { jointDistance } from './jointDistance'
import { NudgeSheet, useNudgedToday } from './NudgeSheet'
import { ReactionBar } from './ReactionBar'

const periods = [
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: 'year', label: 'Año' },
] satisfies { value: Period; label: string }[]

type FeedFilter = 'all' | 'me' | 'quotes'

interface FeedEvent {
  key: string
  sort: string
  author: Profile
  forMe: boolean
  quote: boolean
  text: ReactNode
  link?: string
  reply?: string
  react?: { type: ReactionTarget; id: string; owner: string }
}

function Comparison({
  label,
  a,
  b,
  mine,
  partner,
  hours = false,
}: {
  label: string
  a: number
  b: number
  mine: Profile
  partner: Profile
  hours?: boolean
}) {
  const entered = useEntered()
  const max = Math.max(a, b, 1)
  const format = new Intl.NumberFormat('es', { maximumFractionDigits: hours ? 1 : 0 })
  return (
    <div className="grid grid-cols-[1fr_86px_1fr] items-center gap-2">
      <div className="flex justify-end" aria-hidden>
        <div
          className="h-2.5 rounded-full"
          style={{
            width: entered ? `${(a / max) * 100}%` : 0,
            background: `var(--${mine.accent})`,
            transition: 'width 1s var(--ease)',
          }}
        />
      </div>
      <div className="text-center text-xs leading-4">
        <p className="text-muted">{label}</p>
        <p
          className="num font-semibold"
          aria-label={`${mine.display_name}: ${format.format(a)}; ${partner.display_name}: ${format.format(b)}`}
        >
          {format.format(a)} · {format.format(b)}
        </p>
      </div>
      <div aria-hidden>
        <div
          className="h-2.5 rounded-full"
          style={{
            width: entered ? `${(b / max) * 100}%` : 0,
            background: `var(--${partner.accent})`,
            transition: 'width 1s var(--ease)',
          }}
        />
      </div>
    </div>
  )
}

function hoursInRange(sessions: Session[], readings: ReadingWithBook[], from: string, to: string) {
  const byId = new Map(readings.map((reading) => [reading.id, reading]))
  const minutes = sessions.reduce((total, session) => {
    if (session.read_on < from || session.read_on > to) return total
    const reading = byId.get(session.reading_id)
    if (!reading) return total
    return total + (reading.unit === 'minutes' ? session.end_pos - session.start_pos : (session.minutes ?? 0))
  }, 0)
  return minutes / 60
}

const ago = (iso: string) => formatDistanceToNowStrict(new Date(iso), { addSuffix: true, locale: es })
const short = (text: string, n = 90) => (text.length > n ? `${text.slice(0, n - 1)}…` : text)

/** Marks Nosotros as seen a moment after opening it; returns the previous mark for highlighting. */
function useSeenMark(): string | null {
  const { userId, profile } = useMe()
  const qc = useQueryClient()
  const [before] = useState(profile.last_seen_us_at)
  useEffect(() => {
    const id = window.setTimeout(async () => {
      const now = new Date().toISOString()
      qc.setQueryData<Profile>(qk.profile(userId), (old) => (old ? { ...old, last_seen_us_at: now } : old))
      await supabase.from('profiles').update({ last_seen_us_at: now }).eq('id', userId)
    }, 1200)
    return () => window.clearTimeout(id)
  }, [userId, qc])
  return before
}

export function UsPage() {
  const { userId, profile, partner } = useMe()
  const myReadings = useReadings(userId)
  const theirReadings = useReadings(partner?.id)
  const mySessions = useSessions(userId)
  const theirSessions = useSessions(partner?.id)
  const notes = useSharedNotes(!!partner)
  const reactions = useReactions()
  const nudges = useNudges(!!partner)
  const recs = useRecommendations(!!partner)
  const joint = useJointBooks()
  const nudgedToday = useNudgedToday()
  const seenBefore = useSeenMark()
  const [period, setPeriod] = useState<Period>('week')
  const [filter, setFilter] = useState<FeedFilter>('all')
  const [nudging, setNudging] = useState(false)
  const [limit, setLimit] = useState(8)

  const header = (
    <header className="flex min-h-11 items-center justify-between gap-3">
      <h1 className="font-serif text-[28px] font-semibold">Nosotros</h1>
      {partner && (
        <button
          className="btn min-h-10 px-3.5 text-sm"
          style={{
            background: `color-mix(in oklab, var(--${partner.accent}) 15%, var(--surface))`,
            color: `var(--${partner.accent})`,
          }}
          onClick={() => setNudging(true)}
          aria-label={nudgedToday ? 'Ya le has dado un toque hoy' : `Dar un toque a ${partner.display_name}`}
        >
          <Hand size={17} /> {nudgedToday ? 'Toque enviado' : 'Toque'}
        </button>
      )}
    </header>
  )
  if (!partner) {
    return (
      <div className="space-y-4">
        {header}
        <EmptyState title="Un espacio para los dos">
          Cuando vuestros perfiles estén emparejados, aquí aparecerán vuestras lecturas.
        </EmptyState>
      </div>
    )
  }
  const queries = [myReadings, theirReadings, mySessions, theirSessions]
  if (queries.some((query) => query.isPending)) {
    return (
      <div className="space-y-4">
        {header}
        <div role="status" aria-label="Cargando vuestras lecturas" className="animate-pulse space-y-4">
          <div className="h-28 rounded-[20px] bg-track" />
          <div className="h-11 rounded-xl bg-track" />
          <div className="h-52 rounded-[20px] bg-track" />
        </div>
      </div>
    )
  }
  if (queries.some((query) => query.isError)) {
    return (
      <div className="space-y-4">
        {header}
        <p>No se pudieron cargar vuestras lecturas.</p>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            for (const query of queries) void query.refetch()
          }}
        >
          Reintentar
        </button>
      </div>
    )
  }
  const mine = myReadings.data ?? []
  const theirs = theirReadings.data ?? []
  const ms = mySessions.data ?? []
  const ps = theirSessions.data ?? []
  const today = todayISO()
  const range = { ...periodRange(period, today), to: today }
  const a = summarize(ms, mine, range)
  const b = summarize(ps, theirs, range)
  const readingById = new Map([...mine, ...theirs].map((reading) => [reading.id, reading]))
  const noteById = new Map((notes.data ?? []).map((note) => [note.id, note]))
  const sessionById = new Map(ms.map((session) => [session.id, session]))
  const myReadingOf = (bookId: string) =>
    mine
      .filter((r) => r.book_id === bookId)
      .sort((x, y) => Number(y.status !== 'finished') - Number(x.status !== 'finished'))[0]

  // ── Feed ──
  const events: FeedEvent[] = []
  for (const session of ps) {
    const reading = readingById.get(session.reading_id)
    if (!reading) continue
    events.push({
      key: `s-${session.id}`,
      sort: session.created_at,
      author: partner,
      forMe: false,
      quote: false,
      link: `/libro/${reading.id}`,
      text: (
        <>
          +{formatUnitDelta(reading.unit, session.end_pos - session.start_pos)} en <strong>{reading.book.title}</strong>
        </>
      ),
      react: { type: 'session', id: session.id, owner: partner.id },
    })
  }
  for (const reading of theirs) {
    if (reading.status !== 'finished' || !reading.finished_on) continue
    events.push({
      key: `f-${reading.id}`,
      sort: reading.updated_at,
      author: partner,
      forMe: false,
      quote: false,
      link: `/libro/${reading.id}`,
      text: (
        <>
          Terminó <strong>{reading.book.title}</strong>
          {reading.rating != null && (
            <span className="ml-1 inline-flex items-center gap-1 align-middle">
              <span aria-hidden>·</span>
              <Stars value={reading.rating} size={12} />
            </span>
          )}
        </>
      ),
      react: { type: 'reading', id: reading.id, owner: partner.id },
    })
  }
  for (const note of notes.data ?? []) {
    const reading = readingById.get(note.reading_id)
    if (!reading) continue
    const fromPartner = note.user_id === partner.id
    const parent = note.reply_to ? noteById.get(note.reply_to) : undefined
    const toMe = fromPartner && parent?.user_id === userId
    const myReading = myReadingOf(reading.book_id)
    const hidden = fromPartner && !!myReading && isSpoiler(note, myReading, reading.book)
    if (!fromPartner && note.kind !== 'quote') continue
    const what = note.kind === 'quote' ? 'una cita' : note.kind === 'note' ? 'una nota' : null
    events.push({
      key: `n-${note.id}`,
      sort: note.created_at,
      author: fromPartner ? partner : profile,
      forMe: toMe,
      quote: note.kind === 'quote',
      link: `/club/${reading.book_id}`,
      reply: hidden ? undefined : `/club/${reading.book_id}?responder=${note.id}`,
      text: (
        <>
          {toMe
            ? `Respondió a tu ${parent?.kind === 'quote' ? 'cita' : 'mensaje'}`
            : what
              ? `${fromPartner ? 'Compartió' : 'Compartiste'} ${what} de `
              : 'Escribió en el club de '}
          {!toMe && <strong>{reading.book.title}</strong>}
          {hidden ? (
            <span className="block text-xs text-muted">En la p. {note.page}, por delante de ti</span>
          ) : (
            <span className={`mt-1 block ${note.kind === 'quote' ? 'font-serif' : ''}`}>
              {note.kind === 'quote' ? `«${short(note.body, 140)}»` : short(note.body)}
            </span>
          )}
        </>
      ),
      react: fromPartner && !hidden ? { type: 'note', id: note.id, owner: partner.id } : undefined,
    })
  }
  for (const reaction of reactions.data ?? []) {
    if (reaction.user_id !== partner.id) continue
    const target =
      reaction.target_type === 'note'
        ? noteById.get(reaction.target_id)
        : reaction.target_type === 'session'
          ? sessionById.get(reaction.target_id)
          : readingById.get(reaction.target_id)
    if (!target || target.user_id !== userId) continue
    const reading =
      'reading_id' in target ? readingById.get(target.reading_id) : (target as ReadingWithBook)
    events.push({
      key: `r-${reaction.id}`,
      sort: reaction.created_at,
      author: partner,
      forMe: true,
      quote: false,
      link: reading ? (reaction.target_type === 'note' ? `/club/${reading.book_id}` : `/libro/${reading.id}`) : undefined,
      text: (
        <>
          Reaccionó {reaction.emoji} a tu{' '}
          {reaction.target_type === 'note' ? 'mensaje' : reaction.target_type === 'session' ? 'sesión' : 'lectura'}
          {reading && (
            <>
              {' '}
              de <strong>{reading.book.title}</strong>
            </>
          )}
        </>
      ),
    })
  }
  for (const nudge of nudges.data ?? []) {
    if (nudge.to_user !== userId) continue
    events.push({
      key: `t-${nudge.id}`,
      sort: nudge.created_at,
      author: partner,
      forMe: true,
      quote: false,
      text: <>Te dio un toque: «{nudge.message}»</>,
    })
  }
  for (const rec of recs.data ?? []) {
    if (rec.to_user !== userId) continue
    events.push({
      key: `c-${rec.id}`,
      sort: rec.created_at,
      author: partner,
      forMe: true,
      quote: false,
      link: rec.status === 'pending' ? '/' : undefined,
      text: (
        <>
          Te recomendó <strong>{rec.book.title}</strong>
          {rec.together && ' para leerlo juntos'}
          {rec.message && <span className="mt-1 block text-xs text-muted">«{short(rec.message)}»</span>}
        </>
      ),
    })
  }
  events.sort((x, y) => y.sort.localeCompare(x.sort))
  const isNew = (event: FeedEvent) => event.author.id === partner.id && (!seenBefore || event.sort > seenBefore)
  const forMeCount = events.filter((event) => event.forMe && isNew(event)).length
  const shown = events
    .filter((event) => (filter === 'me' ? event.forMe : filter === 'quotes' ? event.quote : true))

  const myDay = ms.some((session) => session.read_on === today)
  const partnerDay = ps.some((session) => session.read_on === today)
  const headline =
    myDay && partnerDay
      ? 'Hoy habéis leído los dos 💚💙'
      : myDay || partnerDay
        ? `${myDay ? profile.display_name : partner.display_name} ya ha leído hoy`
        : 'Todavía estáis a tiempo de leer hoy'

  return (
    <div className="space-y-3.5">
      {header}
      <ChallengeCard />

      {joint
        .filter((j) => j.mine.status === 'reading' || j.theirs.status === 'reading')
        .map((j) => (
          <Link
            key={j.book.id}
            to={`/club/${j.book.id}`}
            className="card pressable block space-y-1"
            aria-label={`Club de dos: ${j.book.title}`}
          >
            <div className="flex items-center justify-between gap-3 text-xs">
              <h2 className="flex shrink-0 items-center gap-1.5 font-sans text-xs font-semibold">
                <MessageCircle size={14} /> Club de dos
              </h2>
              <span className="truncate text-muted">{j.book.title}</span>
            </div>
            <DualProgressBar
              a={{
                value: progressFraction(j.mine),
                accent: profile.accent,
                label: profile.display_name,
                caption: j.mine.unit === 'pages' ? String(j.mine.current_position) : undefined,
              }}
              b={{
                value: progressFraction(j.theirs),
                accent: partner.accent,
                label: partner.display_name,
                caption: j.theirs.unit === 'pages' ? String(j.theirs.current_position) : undefined,
              }}
              stops={clubStops(j.mine).map((page) => ({
                value: page / j.mine.total_units,
                done:
                  j.mine.current_position >= page &&
                  progressFraction(j.theirs) * j.mine.total_units >= page,
                label: `Parada p. ${page}`,
              }))}
            />
            <p className="text-xs text-muted">{jointDistance(j.mine, j.theirs, partner.display_name)}</p>
          </Link>
        ))}

      <Segmented
        options={[
          { value: 'all', label: 'Todo' },
          { value: 'me', label: 'Para mí', count: forMeCount || undefined },
          { value: 'quotes', label: 'Citas' },
        ]}
        value={filter}
        onChange={(value) => {
          setFilter(value)
          setLimit(8)
        }}
        aria-label="Filtrar actividad"
      />
      {shown.length ? (
        <section className="card py-1" aria-label="Actividad">
          <div className="divide-y divide-dashed divide-border">
            {shown.slice(0, limit).map((event, index) => {
              const fresh = isNew(event)
              const body = (
                <div className="min-w-0 text-[13px] leading-[1.35]">
                  <div className="line-clamp-4">{event.text}</div>
                </div>
              )
              return (
                <article
                  key={event.key}
                  className={`rise flex gap-2.5 py-2.5 ${fresh ? '-ml-3.5 border-l-[3px] [border-left-style:solid] pl-[11px]' : ''}`}
                  style={
                    {
                      '--k': Math.min(index, 10),
                      borderLeftColor: fresh ? `var(--${partner.accent})` : undefined,
                    } as CSSProperties
                  }
                >
                  <Avatar person={event.author} size={30} />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    {event.link ? (
                      <Link to={event.link} className="block">
                        {body}
                      </Link>
                    ) : (
                      body
                    )}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {event.react && (
                        <ReactionBar targetType={event.react.type} targetId={event.react.id} ownerId={event.react.owner} />
                      )}
                      {event.reply && (
                        <Link to={event.reply} className="chip min-h-9 px-3 text-xs">
                          Responder
                        </Link>
                      )}
                      <span className="text-[11px] text-muted">{ago(event.sort)}</span>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
          {shown.length > limit && (
            <button className="btn btn-ghost w-full text-sm" onClick={() => setLimit(limit + 12)}>
              Ver más actividad
            </button>
          )}
        </section>
      ) : notes.isPending ? (
        <p role="status" className="text-sm text-muted">
          Cargando actividad…
        </p>
      ) : (
        <EmptyState
          title={
            filter === 'me'
              ? 'Aún no hay nada para ti'
              : filter === 'quotes'
                ? 'Aún no habéis compartido citas'
                : `${partner.display_name} aún no ha registrado nada`
          }
        />
      )}

      <section className="card space-y-3" aria-label="Vuestras lecturas cara a cara">
        <Segmented options={periods} value={period} onChange={setPeriod} aria-label="Periodo de comparación" />
        <div className="flex justify-center gap-4 text-[13px] font-semibold">
          <span className="max-w-[45%] truncate" style={{ color: `var(--${profile.accent})` }}>
            {profile.display_name}
          </span>
          <span className="max-w-[45%] truncate" style={{ color: `var(--${partner.accent})` }}>
            {partner.display_name}
          </span>
        </div>
        <div key={period} className="space-y-3">
          <Comparison label="Páginas" a={a.pages} b={b.pages} mine={profile} partner={partner} />
          <Comparison label="Libros" a={a.booksFinished} b={b.booksFinished} mine={profile} partner={partner} />
          <Comparison label="Días" a={a.activeDays} b={b.activeDays} mine={profile} partner={partner} />
          <Comparison
            label="Horas"
            a={hoursInRange(ms, mine, range.from, range.to)}
            b={hoursInRange(ps, theirs, range.from, range.to)}
            mine={profile}
            partner={partner}
            hours
          />
        </div>
        <p className="text-center text-[11px] text-muted">{headline}</p>
      </section>
      <NudgeSheet open={nudging} onClose={() => setNudging(false)} />
    </div>
  )
}

