import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNowStrict } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowLeft, ArrowUp, Lock, Reply, X } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { Cover } from '@/components/Cover'
import { DualProgressBar } from '@/components/DualProgressBar'
import { EmptyState } from '@/components/EmptyState'
import { toast } from '@/components/toast'
import { useMe } from '@/features/auth/me'
import { useOnline } from '@/features/session/useOnline'
import { clubStops, nextStop, positionInPages, stopStep } from '@/lib/club'
import { qk, useReadings, useSharedNotes } from '@/lib/data'
import { isSpoiler } from '@/lib/spoilers'
import { supabase } from '@/lib/supabase'
import type { Note, Profile, ReadingWithBook } from '@/lib/types'
import { progressFraction } from '@/lib/units'
import { clubNotes, markClubSeen } from './joint'
import { jointDistance } from './jointDistance'
import { ReactionBar } from './ReactionBar'

const OPEN = new Set(['want', 'reading'])
const pick = (list: ReadingWithBook[], bookId: string) =>
  list
    .filter((r) => r.book_id === bookId)
    .sort((a, b) => Number(OPEN.has(b.status)) - Number(OPEN.has(a.status)) || b.updated_at.localeCompare(a.updated_at))[0]

export function ClubPage() {
  const { bookId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const online = useOnline()
  const { userId, profile, partner } = useMe()
  const myReadings = useReadings(userId)
  const theirReadings = useReadings(partner?.id)
  const notesQuery = useSharedNotes(!!partner)
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const bottom = useRef<HTMLDivElement>(null)
  const replyId = params.get('responder')

  const mine = pick(myReadings.data ?? [], bookId)
  const theirs = pick(theirReadings.data ?? [], bookId)
  const book = mine?.book ?? theirs?.book
  const notes = useMemo(
    () =>
      clubNotes(notesQuery.data ?? [], bookId, [...(myReadings.data ?? []), ...(theirReadings.data ?? [])]).sort(
        (a, b) => a.created_at.localeCompare(b.created_at),
      ),
    [notesQuery.data, bookId, myReadings.data, theirReadings.data],
  )
  const byId = new Map(notes.map((note) => [note.id, note]))
  const spoiler = (note: Note) =>
    note.user_id !== userId && !!mine && !!book && isSpoiler(note, mine, book) && !revealed.has(note.id)
  const visible = notes.filter((note) => !(note.user_id !== userId && mine && book && isSpoiler(note, mine, book)))
  const ahead = notes.filter((note) => !visible.includes(note))
  const replyTo = replyId ? byId.get(replyId) : undefined

  useEffect(() => {
    if (bookId) markClubSeen(bookId)
  }, [bookId, notes.length])
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' })
  }, [notes.length])

  if (!partner) return <EmptyState title="El club de dos necesita a tu pareja emparejada" />
  if (myReadings.isPending || theirReadings.isPending)
    return <div className="card h-64 animate-pulse" aria-label="Cargando club" />
  if (!book) return <EmptyState title="No encontramos este libro en vuestras bibliotecas" />

  const myPage = mine ? positionInPages(mine, book.page_count) : null
  const reference = mine ?? theirs!
  const stops = clubStops(reference)
  const theirPos = theirs
    ? reference.unit === theirs.unit
      ? theirs.current_position
      : progressFraction(theirs) * reference.total_units
    : 0
  const minePos = mine?.current_position ?? 0
  const upcoming = mine ? nextStop(mine) : null

  async function send() {
    const text = body.trim()
    if (!text || busy || !mine) return
    if (!online) {
      toast('Sin conexión', 'Escribe cuando vuelvas a tener red.')
      return
    }
    setBusy(true)
    try {
      const { error } = await supabase.from('notes').insert({
        reading_id: mine.id,
        user_id: userId,
        kind: 'message',
        body: text,
        page: myPage,
        shared: true,
        reply_to: replyTo?.id ?? null,
      })
      if (error) throw error
      setBody('')
      setParams({}, { replace: true })
      await Promise.all([
        qc.invalidateQueries({ queryKey: qk.sharedNotes() }),
        qc.invalidateQueries({ queryKey: qk.notes(mine.id) }),
      ])
    } catch {
      toast('No se pudo enviar el mensaje')
    } finally {
      setBusy(false)
    }
  }

  const bubble = (note: Note, index: number) => {
    const me = note.user_id === userId
    const author: Profile = me ? profile : partner
    const hidden = spoiler(note)
    const parent = note.reply_to ? byId.get(note.reply_to) : undefined
    return (
      <div
        key={note.id}
        className={`rise flex max-w-[86%] flex-col gap-1 ${me ? 'items-end self-end' : 'items-start self-start'}`}
        style={{ '--k': Math.min(index, 8) } as CSSProperties}
      >
        <button
          type="button"
          className={`relative overflow-hidden rounded-2xl px-3 py-2 text-left text-[14px] leading-snug ${me ? 'rounded-br-[6px]' : 'rounded-bl-[6px]'}`}
          style={{ background: `color-mix(in oklab, var(--${author.accent}) 15%, var(--surface))` }}
          aria-label={hidden ? `Mensaje de ${author.display_name} en la p. ${note.page}, oculto por spoiler. Toca para verlo` : undefined}
          onClick={() => {
            if (hidden) setRevealed(new Set([...revealed, note.id]))
            else setParams({ responder: note.id }, { replace: true })
          }}
        >
          {parent && (
            <span className="mb-1 block border-l-2 border-current pl-2 text-xs text-muted line-clamp-2">
              {spoiler(parent) ? 'Mensaje oculto (spoiler)' : parent.body}
            </span>
          )}
          <span
            className={`block whitespace-pre-wrap break-words transition-[filter] duration-500 ${note.kind === 'quote' ? 'font-serif' : ''} ${hidden ? 'select-none blur-[6px]' : ''}`}
          >
            {note.kind === 'quote' ? `«${note.body}»` : note.body}
          </span>
          {hidden && (
            <span className="absolute inset-0 grid place-items-center text-xs font-semibold text-ink">
              <span className="flex items-center gap-1">
                <Lock size={13} /> Spoiler · p. {note.page} · lo verás al llegar
              </span>
            </span>
          )}
        </button>
        <div className={`flex items-center gap-1.5 text-[11px] text-muted ${me ? 'flex-row-reverse' : ''}`}>
          <span>
            {me ? 'Tú' : author.display_name}
            {note.page != null && ` · p. ${note.page}`}
            {note.kind !== 'message' && ` · ${note.kind === 'quote' ? 'cita' : 'nota'}`}
            {' · '}
            {formatDistanceToNowStrict(new Date(note.created_at), { addSuffix: true, locale: es })}
          </span>
          {!hidden && <ReactionBar targetType="note" targetId={note.id} ownerId={note.user_id} />}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3.5 pb-36">
      <div className="flex items-center gap-2">
        <button
          className="icon-btn"
          aria-label="Volver"
          onClick={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/nosotros'))}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 text-center text-sm font-semibold">Club de dos</h1>
        <div className="flex -space-x-2">
          <span className="rounded-full ring-2 ring-bg">
            <Avatar person={profile} size={30} />
          </span>
          <span className="rounded-full ring-2 ring-bg">
            <Avatar person={partner} size={30} />
          </span>
        </div>
      </div>

      <section className="card space-y-1">
        <Link to={mine ? `/libro/${mine.id}` : `/libro/${theirs!.id}`} className="flex items-start gap-3">
          <Cover book={book} width={44} />
          <div className="min-w-0">
            <h2 className="font-serif text-lg leading-tight font-semibold">{book.title}</h2>
            <p className="text-xs text-muted">
              {mine && theirs
                ? jointDistance(mine, theirs, partner.display_name)
                : mine
                  ? `${partner.display_name} aún no lo tiene en su biblioteca`
                  : 'Aún no lo tienes en tu biblioteca'}
            </p>
          </div>
        </Link>
        {mine && theirs && (
          <>
            <DualProgressBar
              a={{
                value: progressFraction(mine),
                accent: profile.accent,
                label: profile.display_name,
                caption: mine.unit === 'pages' ? String(mine.current_position) : `${Math.round(progressFraction(mine) * 100)} %`,
              }}
              b={{
                value: progressFraction(theirs),
                accent: partner.accent,
                label: partner.display_name,
                caption:
                  theirs.unit === 'pages' ? String(theirs.current_position) : `${Math.round(progressFraction(theirs) * 100)} %`,
              }}
              stops={stops.map((page) => ({
                value: page / reference.total_units,
                done: minePos >= page && theirPos >= page,
                label: `Parada p. ${page}`,
              }))}
            />
            {stops.length > 0 && (
              <div className="flex justify-between gap-2 text-[11px] text-muted">
                <span>Paradas cada {stopStep(reference.total_units)} págs.</span>
                {upcoming && <span className="font-semibold text-amber">Próxima: p. {upcoming}</span>}
              </div>
            )}
          </>
        )}
      </section>

      {notesQuery.isPending ? (
        <p className="text-sm text-muted" role="status">
          Cargando mensajes…
        </p>
      ) : notes.length === 0 ? (
        <EmptyState title="Aún no habéis hablado de este libro">
          <p className="text-sm text-muted">
            Escribe abajo lo que te está pareciendo. Lo que escribas lleva tu página y {partner.display_name} no lo
            verá hasta llegar a ella.
          </p>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-2.5" aria-live="polite">
          {visible.map(bubble)}
          {ahead.length > 0 && (
            <>
              <div className="flex items-center gap-2 text-[11px] font-semibold" style={{ color: `var(--${partner.accent})` }}>
                <span className="h-px flex-1 bg-current opacity-40" />
                Por delante de ti
                <span className="h-px flex-1 bg-current opacity-40" />
              </div>
              {ahead.map((note, index) => bubble(note, visible.length + index))}
            </>
          )}
        </div>
      )}
      <div ref={bottom} />

      {mine &&
        createPortal(
          <div className="fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-20 mx-auto max-w-xl px-3 pb-2">
            {replyTo && (
              <div className="mb-1.5 flex items-center gap-2 rounded-xl bg-surface px-3 py-1.5 text-xs shadow-sm">
                <Reply size={13} className="shrink-0 text-muted" />
                <span className="min-w-0 flex-1 truncate">
                  Respondiendo a {replyTo.user_id === userId ? 'ti' : partner.display_name}:{' '}
                  {spoiler(replyTo) ? 'mensaje oculto' : replyTo.body}
                </span>
                <button className="grid h-8 w-8 place-items-center" aria-label="Cancelar respuesta" onClick={() => setParams({}, { replace: true })}>
                  <X size={15} />
                </button>
              </div>
            )}
            <form
              className="flex items-center gap-2 rounded-[18px] border border-border bg-surface py-1.5 pr-1.5 pl-2 shadow-[0_10px_24px_-14px_rgb(0_0_0/0.4)]"
              onSubmit={(event) => {
                event.preventDefault()
                void send()
              }}
            >
              {myPage != null && (
                <span className="num shrink-0 rounded-lg bg-soft px-2 py-1 text-[11px] font-semibold text-accent">p. {myPage}</span>
              )}
              <input
                className="min-w-0 flex-1 bg-transparent py-2 outline-none"
                placeholder="Escribe sobre lo que llevas leído…"
                aria-label="Mensaje para el club"
                maxLength={5000}
                value={body}
                onChange={(event) => setBody(event.target.value)}
              />
              <button
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-surface transition-transform duration-300 [transition-timing-function:var(--spring)] active:scale-90 disabled:opacity-50"
                aria-label="Enviar"
                disabled={!body.trim() || busy}
              >
                <ArrowUp size={19} />
              </button>
            </form>
          </div>,
          document.body,
        )}
    </div>
  )
}
