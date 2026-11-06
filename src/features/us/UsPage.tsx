import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { Avatar } from '@/components/Avatar'
import { BottomSheet } from '@/components/BottomSheet'
import { Cover } from '@/components/Cover'
import { useMe } from '@/features/auth/me'
import { useInvites, useMessages, useReactions, useReadings, useSessions, useTogether } from '@/lib/data'
import { todayISO } from '@/lib/dates'
import type { Profile, ReadingWithBook } from '@/lib/types'
import { InviteCard } from './InviteCard'
import { MessageCard } from './MessageCard'
import { GoalProposal, MemoriesCard } from './MemoriesCard'
import { TogetherCard } from './TogetherCard'
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

function ReadingNow({ person, readings }: { person: Profile; readings: ReadingWithBook[] }) {
  const current = readings.filter((reading) => reading.status === 'reading')
  const since = person.reading_now_since ? new Date(person.reading_now_since).getTime() : 0
  const live = Date.now() - since >= 0 && Date.now() - since < 2 * 60 * 60 * 1000
  return (
    <div className="min-w-0 flex-1 space-y-2">
      <p className="text-xs font-medium text-muted">{person.display_name}</p>
      {current.length ? (
        current.map((reading) => (
          <Link key={reading.id} to={`/libro/${reading.id}`} className="flex min-h-11 items-center gap-2">
            <Cover book={reading.book} width={28} />
            <div className="min-w-0">
              <p className="line-clamp-2 text-sm">{reading.book.title}</p>
              {live && person.reading_now_id === reading.id && <p className="text-xs text-accent">leyendo ahora</p>}
            </div>
          </Link>
        ))
      ) : (
        <p className="text-sm text-muted">El próximo libro os espera</p>
      )}
    </div>
  )
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
  const [adding, setAdding] = useState(false)
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
  useEffect(() => {
    if (!linkedId || !messages.length) return
    const frame = requestAnimationFrame(() => {
      document.getElementById(`m-${linkedId}`)?.scrollIntoView({ block: 'center', behavior: 'auto' })
    })
    return () => cancelAnimationFrame(frame)
  }, [linkedId, messages])

  if (!partner)
    return (
      <section className="card">
        <h1>Rincón de los dos</h1>
        <p>Vuestro rincón estará aquí al vincular las dos cuentas.</p>
      </section>
    )

  return (
    <div className="space-y-5 pb-4 rise">
      <header className="flex items-center gap-3">
        <div className="flex -space-x-3">
          <Avatar person={profile} size={42} />
          <Avatar person={partner} size={42} />
        </div>
        <div>
          <h1 className="text-2xl">Rincón de los dos</h1>
          <p className="text-xs text-muted">{summary.daysTogether} días leyendo los dos este mes</p>
        </div>
      </header>
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
      {(items.length > 0 || linkedMessage) && (
        <section className="space-y-3" aria-label="Para ti">
          <h2 className="text-lg">Para ti</h2>
          {items.map((item) => {
            switch (item.type) {
              case 'message':
                return <MessageCard key={`m-${item.message.id}`} message={item.message} />
              case 'invite':
                return <InviteCard key={`i-${item.invite.id}`} invite={item.invite} />
              case 'together':
                return (
                  <div className="card" key={`t-${item.item.id}`}>
                    <TogetherCard item={item.item} />
                  </div>
                )
              case 'goal':
                return (
                  <div className="card" key={`g-${item.goal.month}`}>
                    <GoalProposal goal={item.goal} />
                  </div>
                )
            }
          })}
          {linkedMessage && !linkedAlreadyPending && <MessageCard message={linkedMessage} />}
        </section>
      )}
      <section className="card space-y-3" aria-label="Ahora mismo">
        <h2 className="text-lg">Ahora mismo</h2>
        <div className="flex gap-4">
          <ReadingNow person={profile} readings={mine} />
          <ReadingNow person={partner} readings={theirs} />
        </div>
        {invites
          .filter(
            (invite) =>
              !isInviteExpired(invite) &&
              (invite.status === 'accepted' || (invite.from_user === userId && invite.status === 'pending')),
          )
          .map((invite) => (
            <InviteCard key={invite.id} invite={invite} />
          ))}
        {rooms.length > 0 && (
          <div className="border-t border-border pt-2">
            {rooms.map((room) => {
              const unread = messages.filter(
                (message) =>
                  message.book_id === room.book.id && message.to_user === userId && !message.read_at && !message.locked,
              ).length
              return (
                <Link
                  key={room.book.id}
                  to={`/sala/${room.book.id}`}
                  className="flex min-h-11 items-center justify-between gap-2 text-sm"
                >
                  <span>Vuestra sala · {room.book.title}</span>
                  <span className="text-accent">{unread ? `${unread} por abrir` : 'Entrar →'}</span>
                </Link>
              )
            })}
          </div>
        )}
      </section>
      <section className="card space-y-3" aria-label="Queremos leer juntos">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg">Queremos leer juntos</h2>
          <button className="btn btn-ghost" onClick={() => setAdding(true)}>
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
      <section className="space-y-3" aria-label="Vuestros recuerdos">
        <h2 className="text-lg">Vuestros recuerdos</h2>
        <div className="card space-y-3">
          <h3 className="font-serif">{monthLabel(month)}</h3>
          <MemoriesCard summary={summary} goalPendingAbove={goalPendingAbove} />
        </div>
        {previousMonths.length > 0 && (
          <details className="card">
            <summary className="min-h-11 cursor-pointer py-3 text-sm">
              Meses anteriores ({previousMonths.length})
            </summary>
            <div className="space-y-3">
              {previousMonths.map((value) => {
                const past = summarize(value)
                return (
                  <details key={value}>
                    <summary className="min-h-11 cursor-pointer py-3 text-sm">
                      {monthLabel(value)} · {past.books.length} libros · {past.daysTogether} días juntos
                    </summary>
                    <MemoriesCard summary={past} />
                  </details>
                )
              })}
            </div>
          </details>
        )}
      </section>
      <BottomSheet open={adding} onClose={() => setAdding(false)} title="Queremos leer juntos">
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
                className="min-h-11 w-full"
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
            <p className="text-sm text-muted">Añadid un libro a «Quiero leer» para encontrarlo aquí.</p>
          )}
          <label className="lbl">
            ¿Por qué este? (opcional)
            <textarea
              className="min-h-20 w-full"
              maxLength={300}
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
              Añadir
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
