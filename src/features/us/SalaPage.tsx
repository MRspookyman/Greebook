import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, Send, Smile } from 'lucide-react'
import { Cover } from '@/components/Cover'
import { DualProgressBar } from '@/components/DualProgressBar'
import { toast } from '@/components/toast'
import { useMe } from '@/features/auth/me'
import { useMessages, useReadings } from '@/lib/data'
import type { Emotion } from '@/lib/types'
import { formatUnitValue, progressFraction } from '@/lib/units'
import { MessageCard } from './MessageCard'
import { EMOTIONS, markRead, sendMessage } from './messages'
import { useRooms } from './rooms'

export function SalaPage() {
  const { bookId } = useParams()
  const { userId, profile, partner } = useMe()
  const room = useRooms().find((item) => item.book.id === bookId)
  const readings = useReadings(userId)
  const partnerReadings = useReadings(partner?.id)
  const messages = useMessages()
  const [body, setBody] = useState('')
  const [emotion, setEmotion] = useState<Emotion | null>(null)
  const [page, setPage] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [emotionsOpen, setEmotionsOpen] = useState(false)
  const [editingPage, setEditingPage] = useState(false)
  const composerInput = useRef<HTMLTextAreaElement>(null)
  const bottom = useRef<HTMLDivElement>(null)
  const marking = useRef(new Set<string>())
  const conversation = (messages.data ?? [])
    .filter((message) => message.book_id === bookId && (message.kind === 'room' || message.kind === 'trace'))
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
  const newestMessageId = conversation.at(-1)?.id

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => bottom.current?.scrollIntoView({ block: 'end' }))
    return () => window.cancelAnimationFrame(frame)
  }, [bookId, newestMessageId, room?.book.id])

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    const keepComposerVisible = () => {
      if (document.activeElement === composerInput.current) {
        composerInput.current?.scrollIntoView({ block: 'nearest', behavior: 'auto' })
      }
    }
    viewport.addEventListener('resize', keepComposerVisible)
    return () => viewport.removeEventListener('resize', keepComposerVisible)
  }, [])

  useEffect(() => {
    const ids = conversation
      .filter(
        (message) =>
          message.to_user === userId && !message.locked && !message.read_at && !marking.current.has(message.id),
      )
      .map((message) => message.id)
    if (!ids.length) return
    ids.forEach((id) => marking.current.add(id))
    void markRead(ids).catch(() => {
      ids.forEach((id) => marking.current.delete(id))
      toast('No se pudieron marcar los mensajes como vistos')
    })
  }, [conversation, userId])

  if (!room) {
    const loading = readings.isPending || (!!partner && partnerReadings.isPending)
    return (
      <section className="space-y-4">
        <Link to="/nosotros" className="btn btn-ghost">
          <ArrowLeft size={18} /> Volver al rincón
        </Link>
        <h1>La sala de los dos</h1>
        <p className="text-sm text-muted" role="status">
          {loading ? 'Cargando la sala…' : 'La sala se abre cuando los dos tenéis este libro en Leyendo.'}
        </p>
      </section>
    )
  }
  const maxPage =
    room.mine.unit === 'pages'
      ? room.mine.current_position
      : room.mine.book.page_count === null
        ? 0
        : Math.floor(progressFraction(room.mine) * room.mine.book.page_count)
  const currentPage = page === null ? maxPage : Math.min(page, maxPage)
  async function send() {
    if (busy || (!body.trim() && !emotion)) return
    setBusy(true)
    try {
      await sendMessage({ kind: 'room', bookId, page: currentPage, emotion, body: body.trim() || null })
      setBody('')
      setEmotion(null)
      setPage(null)
      setEmotionsOpen(false)
      setEditingPage(false)
    } catch {
      toast('No se pudo dejar el mensaje')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="space-y-4">
      <Link to="/nosotros" className="btn btn-ghost">
        <ArrowLeft size={18} /> Rincón de los dos
      </Link>
      <header className="flex items-center gap-4">
        <Cover book={room.book} width={60} />
        <div className="min-w-0">
          <h1 className="text-2xl [overflow-wrap:anywhere]">{room.book.title}</h1>
          <p className="mt-1 text-xs text-muted">Vuestra sala</p>
        </div>
      </header>
      <div className="card space-y-2">
        <DualProgressBar
          a={{
            value: progressFraction(room.mine),
            accent: profile.accent,
            label: 'Tú',
            caption: formatUnitValue(room.mine.unit, room.mine.current_position),
          }}
          b={{
            value: progressFraction(room.theirs),
            accent: partner?.accent ?? 'blue',
            label: partner?.display_name ?? 'Tu pareja',
            caption: formatUnitValue(room.theirs.unit, room.theirs.current_position),
          }}
        />
      </div>
      <div
        className="space-y-3 pb-4"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Mensajes de la sala"
      >
        {messages.isPending && (
          <p className="text-sm text-muted" role="status">
            Cargando mensajes…
          </p>
        )}
        {messages.isError && (
          <button className="btn btn-secondary" onClick={() => void messages.refetch()}>
            Reintentar mensajes
          </button>
        )}
        {messages.isSuccess && !conversation.length && (
          <p className="py-4 text-center text-sm text-muted">Un rincón para lo que os despierte este libro.</p>
        )}
        {conversation.map((message) => (
          <MessageCard key={message.id} message={message} variant="bubble" showBook={false} />
        ))}
      </div>
      <form
        className="sticky bottom-[calc(76px+env(safe-area-inset-bottom))] z-20 flex scroll-mb-[calc(96px+env(safe-area-inset-bottom))] items-end gap-1 rounded-2xl border border-border bg-surface p-2 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault()
          void send()
        }}
      >
        {emotionsOpen && (
          <div className="absolute bottom-full left-0 mb-2 flex gap-1 rounded-2xl border border-border bg-surface p-1 shadow-sm">
            {(Object.entries(EMOTIONS) as [Emotion, { emoji: string; label: string }][]).map(([value, item]) => (
              <button
                key={value}
                type="button"
                className="icon-btn"
                aria-label={item.label}
                aria-pressed={emotion === value}
                onClick={() => {
                  setEmotion(emotion === value ? null : value)
                  setEmotionsOpen(false)
                }}
              >
                {item.emoji}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          className="icon-btn shrink-0"
          aria-label="Elegir emoción"
          aria-expanded={emotionsOpen}
          onClick={() => setEmotionsOpen(!emotionsOpen)}
        >
          {emotion ? EMOTIONS[emotion].emoji : <Smile size={19} />}
        </button>
        <textarea
          ref={composerInput}
          name="message"
          autoComplete="off"
          rows={1}
          className="min-h-11 max-h-28 min-w-0 flex-1 resize-y scroll-mb-[calc(96px+env(safe-area-inset-bottom))] rounded-xl bg-bg px-2 py-3 text-sm leading-[22px] outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Mensaje para tu pareja"
          placeholder="Déjale algo…"
          maxLength={5000}
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
        {editingPage ? (
          <input
            className="input h-11 w-20 shrink-0 px-2 text-xs"
            aria-label="Página del mensaje"
            type="number"
            min={0}
            max={maxPage}
            step={1}
            required
            autoFocus={window.matchMedia('(pointer: fine)').matches}
            name="messagePage"
            autoComplete="off"
            value={currentPage}
            onChange={(event) => setPage(Math.max(0, Math.trunc(Number(event.target.value))))}
            onBlur={() => setEditingPage(false)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                setEditingPage(false)
              }
            }}
          />
        ) : (
          <button
            type="button"
            className="min-h-11 shrink-0 px-1 text-xs text-muted"
            aria-label={`Editar página: ${currentPage}`}
            onClick={() => setEditingPage(true)}
          >
            p. {currentPage}
          </button>
        )}
        <button
          className="icon-btn shrink-0 bg-accent text-surface"
          aria-label={busy ? 'Dejando mensaje' : 'Dejar mensaje'}
          disabled={busy || (!body.trim() && !emotion)}
        >
          <Send size={18} />
        </button>
      </form>
      <div ref={bottom} className="h-20" aria-hidden />
    </section>
  )
}
