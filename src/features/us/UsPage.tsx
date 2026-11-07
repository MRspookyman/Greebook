import { useEffect, useState, type CSSProperties } from 'react'
import { Link, useLocation } from 'react-router'
import { Coffee, Feather } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { BottomSheet } from '@/components/BottomSheet'
import { Cover } from '@/components/Cover'
import { Segmented } from '@/components/Segmented'
import { useEntered } from '@/components/motion'
import { useMe } from '@/features/auth/me'
import { useInvites, useMessages, useReactions, useReadings, useSessions, useTogether } from '@/lib/data'
import { todayISO } from '@/lib/dates'
import { formatDays, progressFraction } from '@/lib/units'
import type { Profile, ReadingWithBook } from '@/lib/types'
import { CoupleProgress } from './CoupleProgress'
import { InviteCard } from './InviteCard'
import { MessageCard } from './MessageCard'
import { RatitoSheet } from './RatitoSheet'
import { TraceSheet } from './TraceSheet'
import { CoupleGoalCard, MemoriesCard } from './MemoriesCard'
import { TogetherCard } from './TogetherCard'
import { ForYouItem, forYouKey } from './ForYouItem'
import { localMonth, monthMemories } from './memories'
import { usePendingForMe } from './messages'
import { useRooms } from './rooms'
import { isInviteExpired } from './ratito'
import { addTogether } from './together'

function monthLabel(month: string) {
  const date = new Date(`${month}-01T12:00:00`)
  const name = new Intl.DateTimeFormat('es', { month: 'long' }).format(date)
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${date.getFullYear()}`
}

/** Two hairlines, one per reader, so a shared book shows at a glance who is where. */
function PairBars({
  mine,
  theirs,
  myAccent,
  partnerAccent,
}: {
  mine: number
  theirs: number
  myAccent: string
  partnerAccent: string
}) {
  const entered = useEntered()
  const bar = (value: number, accent: string, delay: string) => (
    <span className="relative block h-[2px] overflow-hidden bg-rule">
      <span
        className="absolute inset-0 origin-left"
        style={{
          background: `var(--${accent})`,
          transform: `scaleX(${entered ? Math.min(1, Math.max(0, value)) : 0})`,
          transition: `transform var(--dur-fill) var(--ease) ${delay}`,
        }}
      />
    </span>
  )
  return (
    <span className="mt-2 block space-y-[3px]" aria-hidden>
      {bar(mine, myAccent, '0ms')}
      {bar(theirs, partnerAccent, '80ms')}
    </span>
  )
}

/** Where each of you is, in the book's own unit. */
function gapText(mine: ReadingWithBook, theirs: ReadingWithBook, partner: Profile): string {
  if (mine.unit === 'pages' && theirs.unit === 'pages')
    return `Tú p. ${mine.current_position} · ${partner.display_name} p. ${theirs.current_position}`
  return `Tú ${Math.round(progressFraction(mine) * 100)} % · ${partner.display_name} ${Math.round(progressFraction(theirs) * 100)} %`
}

export function UsPage() {
  const { userId, profile, partner } = useMe()
  const location = useLocation()
  const mineQuery = useReadings(userId)
  const theirsQuery = useReadings(partner?.id)
  const mine = mineQuery.data ?? []
  const theirs = theirsQuery.data ?? []
  const mineSessions = useSessions(userId).data ?? []
  const theirSessions = useSessions(partner?.id).data ?? []
  const messagesQuery = useMessages()
  const messages = messagesQuery.data ?? []
  const invites = useInvites().data ?? []
  const reactions = useReactions().data ?? []
  const together = useTogether().data ?? []
  const { items } = usePendingForMe()
  const pendingTogetherIds = new Set(items.flatMap((item) => (item.type === 'together' ? [item.item.id] : [])))
  const listedTogether = together.filter((item) => !pendingTogetherIds.has(item.id))
  const goalPendingAbove = items.some((item) => item.type === 'goal')
  const rooms = useRooms()
  const [tabChoice, setTabChoice] = useState<'foryou' | 'together' | 'memories' | null>(null)
  const [adding, setAdding] = useState(false)
  const [sheet, setSheet] = useState<'trace' | 'ratito' | null>(null)
  const [showAllPending, setShowAllPending] = useState(false)
  const [bookId, setBookId] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const month = todayISO().slice(0, 7)
  const readings = [...mine, ...theirs]
  const sessions = [...mineSessions, ...theirSessions]
  const summarize = (value: string) =>
    monthMemories(value, readings, sessions, invites, messages, reactions, userId, partner?.id ?? '')
  const summary = summarize(month)
  const previousMonths = [
    ...new Set([
      ...sessions.map((session) => session.read_on.slice(0, 7)),
      ...readings.flatMap((reading) => (reading.finished_on ? [reading.finished_on.slice(0, 7)] : [])),
      ...invites
        .filter((invite) => invite.status === 'accepted')
        .map((invite) => localMonth(invite.starts_at ?? invite.created_at)),
      ...messages
        .filter((message) => reactions.some((reaction) => reaction.target_id === message.id))
        .map((message) => localMonth(message.created_at)),
    ]),
  ]
    .filter((value) => value < month)
    .sort()
    .reverse()
  const candidates = [
    ...new Map(
      readings
        .filter((reading) => reading.status === 'want' && !together.some((item) => item.book_id === reading.book_id))
        .map((reading) => [reading.book_id, reading.book]),
    ).values(),
  ]
  const linkedId = location.hash.startsWith('#m-') ? location.hash.slice(3) : null
  const linkedMessage = linkedId ? messages.find((message) => message.id === linkedId) : undefined
  const linkedAlreadyPending = items.some((item) => item.type === 'message' && item.message.id === linkedId)
  const linkedItem = items.find((item) =>
    item.type === 'message'
      ? item.message.id === linkedId
      : item.type === 'invite'
        ? item.invite.id === linkedId
        : item.type === 'together' && item.item.id === linkedId,
  )
  const prioritizedItems = linkedItem ? [linkedItem, ...items.filter((item) => item !== linkedItem)] : items
  const tab = tabChoice ?? (items.length > 0 || linkedId ? 'foryou' : 'together')
  const previewCount = linkedMessage && !linkedAlreadyPending ? 0 : 1
  const visibleItems = showAllPending ? prioritizedItems : prioritizedItems.slice(0, previewCount)
  useEffect(() => {
    if (!linkedId || !messages.length) return
    const frame = requestAnimationFrame(() => {
      document.getElementById(`m-${linkedId}`)?.scrollIntoView({ block: 'center', behavior: 'auto' })
    })
    return () => cancelAnimationFrame(frame)
  }, [linkedId, messages])

  if (!partner)
    return (
      <section className="space-y-4">
        <h1 className="display">
          Rincón <span className="display-italic table">de los dos</span>
        </h1>
        <p>Vuestro rincón estará aquí al vincular las dos cuentas.</p>
      </section>
    )

  return (
    <div className="space-y-8 pb-4">
      <header className="enter space-y-4">
        <h1 className="display">
          Rincón <span className="display-italic table">de los dos</span>
        </h1>
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <Avatar person={profile} size={28} />
            <Avatar person={partner} size={28} />
          </div>
          <p className="text-xs text-muted">{formatDays(summary.daysTogether)} leyendo los dos este mes</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn btn-outline" onClick={() => setSheet('trace')}>
            <Feather size={16} aria-hidden />
            Dejarle algo
          </button>
          <button type="button" className="btn btn-outline" onClick={() => setSheet('ratito')}>
            <Coffee size={16} aria-hidden />
            Un ratito juntos
          </button>
        </div>
      </header>
      <TraceSheet open={sheet === 'trace'} onClose={() => setSheet(null)} />
      <RatitoSheet open={sheet === 'ratito'} onClose={() => setSheet(null)} />
      <Segmented
        options={[
          { value: 'foryou', label: items.length ? `Para ti · ${items.length}` : 'Para ti' },
          { value: 'together', label: 'Juntos' },
          { value: 'memories', label: 'Recuerdos' },
        ]}
        value={tab}
        onChange={setTabChoice}
        aria-label="Sección del rincón"
      />
      {(mineQuery.isPending || theirsQuery.isPending || messagesQuery.isPending) && (
        <p className="text-sm text-muted" role="status">
          Abriendo vuestro rincón…
        </p>
      )}
      {(mineQuery.isError || theirsQuery.isError || messagesQuery.isError) && (
        <p className="text-sm text-danger" role="alert">
          No se ha podido cargar todo el rincón. Vuelve a abrirlo cuando tengas conexión.
        </p>
      )}
      {tab === 'foryou' && !items.length && !linkedMessage && (
        <p className="text-[15px] text-muted">
          Nada pendiente. Cuando {partner.display_name} te deje algo, aparecerá aquí.
        </p>
      )}
      {tab === 'foryou' && (items.length > 0 || linkedMessage) && (
        <section className="enter space-y-3" style={{ '--i': 1 } as CSSProperties} aria-label="Para ti">
          {visibleItems.map((item) => (
            <ForYouItem key={forYouKey(item)} item={item} preview={!showAllPending} />
          ))}
          {linkedMessage && !linkedAlreadyPending && <MessageCard message={linkedMessage} preview={!showAllPending} />}
          {items.length > previewCount && (
            <button
              className="btn btn-link min-h-11"
              aria-expanded={showAllPending}
              onClick={() => setShowAllPending(!showAllPending)}
            >
              {showAllPending ? 'Ver menos' : `Ver ${items.length - previewCount} más`}
            </button>
          )}
        </section>
      )}
      {tab === 'together' && (
        <>
          <div className="enter space-y-2" style={{ '--i': 2 } as CSSProperties}>
            <CoupleProgress />
            {invites
              .filter(
                (invite) =>
                  !isInviteExpired(invite) &&
                  (invite.status === 'accepted' || (invite.from_user === userId && invite.status === 'pending')),
              )
              .map((invite) => (
                <InviteCard key={invite.id} invite={invite} />
              ))}
          </div>
          <section className="enter space-y-1" style={{ '--i': 3 } as CSSProperties} aria-labelledby="rooms-title">
            <h2 id="rooms-title" className="title mb-2">
              Leyendo juntos
            </h2>
            {rooms.length === 0 && (
              <p className="text-sm text-muted">
                Cuando los dos tengáis el mismo libro en «Leyendo», aquí se abre su sala.
              </p>
            )}
            {rooms.map((room) => {
              const unread = messages.filter(
                (message) =>
                  message.book_id === room.book.id && message.to_user === userId && !message.read_at && !message.locked,
              ).length
              return (
                <Link key={room.book.id} to={`/libro/${room.mine.id}?pestana=juntos`} className="rule flex items-center gap-4 py-3">
                  <Cover book={room.book} width={44} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-serif text-xl leading-tight">{room.book.title}</span>
                    <PairBars
                      mine={progressFraction(room.mine)}
                      theirs={progressFraction(room.theirs)}
                      myAccent={profile.accent}
                      partnerAccent={partner.accent}
                    />
                    <span className="mt-1.5 block text-xs text-muted">{gapText(room.mine, room.theirs, partner)}</span>
                  </span>
                  <span className="shrink-0 text-xs text-accent underline underline-offset-4">
                    {unread ? `${unread} por abrir` : 'Entrar'}
                  </span>
                </Link>
              )
            })}
          </section>
          <section
            className="rule enter space-y-3 pt-5"
            style={{ '--i': 4 } as CSSProperties}
            aria-labelledby="goal-title"
          >
            <h2 id="goal-title" className="title">
              Propósito de {monthLabel(month).split(' ')[0].toLocaleLowerCase('es')}
            </h2>
            <CoupleGoalCard summary={summary} goalPendingAbove={goalPendingAbove} />
          </section>
          <section className="rule space-y-4 pt-5" aria-label="Queremos leer juntos">
            <div className="flex items-center justify-between gap-2">
              <h2 className="title">Queremos leer juntos</h2>
              <button className="btn btn-link shrink-0" onClick={() => setAdding(true)}>
                + Añadir
              </button>
            </div>
            {!together.length && (
              <p className="text-sm text-muted">Un libro que os apetezca compartir, para cuando llegue el momento.</p>
            )}
            {pendingTogetherIds.size > 0 && (
              <p className="text-sm text-muted">{pendingTogetherIds.size} esperando vuestra respuesta arriba</p>
            )}
            {listedTogether.slice(0, 1).map((item) => (
              <TogetherCard key={item.id} item={item} />
            ))}
            {listedTogether.length > 1 && (
              <details>
                <summary className="min-h-11 cursor-pointer py-3 text-sm">
                  Ver {listedTogether.length - 1} {listedTogether.length === 2 ? 'libro' : 'libros'} más
                </summary>
                <div className="space-y-5">
                  {listedTogether.slice(1).map((item) => (
                    <TogetherCard key={item.id} item={item} />
                  ))}
                </div>
              </details>
            )}
          </section>
        </>
      )}
      {tab === 'memories' && (
        <section className="space-y-4" aria-label="Vuestros recuerdos">
          <div className="space-y-3">
            <h3 className="text-xs text-muted">{monthLabel(month)}</h3>
            <MemoriesCard summary={summary} withGoal={false} />
          </div>
          {previousMonths.length > 0 && (
            <details className="rule">
              <summary className="min-h-11 cursor-pointer py-3 text-sm">
                Meses anteriores ({previousMonths.length})
              </summary>
              <div className="space-y-3">
                {previousMonths.map((value) => {
                  const past = summarize(value)
                  return (
                    <details key={value}>
                      <summary className="min-h-11 cursor-pointer py-3 text-sm">
                        {monthLabel(value)} · {past.books.length} {past.books.length === 1 ? 'libro' : 'libros'} ·{' '}
                        {formatDays(past.daysTogether)} juntos
                      </summary>
                      <MemoriesCard summary={past} />
                    </details>
                  )
                })}
              </div>
            </details>
          )}
        </section>
      )}
      <BottomSheet
        open={adding}
        onClose={() => setAdding(false)}
        title="Queremos leer juntos"
        dirty={!!bookId || !!reason.trim()}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (!bookId) return
            setBusy(true)
            setError('')
            void addTogether(bookId, reason)
              .then(() => {
                setAdding(false)
                setBookId('')
                setReason('')
              })
              .catch((cause: unknown) => {
                setError(cause instanceof Error ? cause.message : 'No se pudo añadir el libro')
              })
              .finally(() => setBusy(false))
          }}
        >
          {candidates.length > 0 ? (
            <label className="lbl">
              Un libro de vuestras listas
              <select
                className="input min-h-11 w-full"
                name="book"
                autoComplete="off"
                required
                value={bookId}
                onChange={(event) => setBookId(event.target.value)}
              >
                <option value="">Elegid un libro…</option>
                {candidates.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.title}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-sm text-muted">Añadid un libro a «Pendientes» para encontrarlo aquí.</p>
          )}
          <label className="lbl">
            ¿Por qué este? (opcional)
            <textarea
              className="min-h-20 w-full"
              maxLength={300}
              name="reason"
              autoComplete="off"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" disabled={busy || !bookId}>
              {busy ? 'Añadiendo…' : 'Añadir a juntos'}
            </button>
            <Link to="/biblioteca/buscar" className="btn btn-ghost" onClick={() => setAdding(false)}>
              Buscar otro libro
            </Link>
          </div>
        </form>
      </BottomSheet>
    </div>
  )
}
