import { useState } from 'react'
import { Heart, LockKeyhole } from 'lucide-react'
import { useMe } from '@/features/auth/me'
import { useMessages, useReactions, useReadings } from '@/lib/data'
import type { Message } from '@/lib/types'
import { EMOTIONS, markRead, openEarly, sendMessage, toggleHeart } from './messages'

type MessageVariant = 'card' | 'bubble'

export function MessageCard({
  message,
  showBook = true,
  variant = 'card',
  preview = false,
}: {
  message: Message
  showBook?: boolean
  variant?: MessageVariant
  preview?: boolean
}) {
  return <MessageContent message={message} showBook={showBook} variant={variant} ancestors={[]} preview={preview} />
}

function MessageContent({
  message,
  showBook,
  variant,
  ancestors,
  preview = false,
}: {
  message: Message
  showBook: boolean
  variant: MessageVariant
  ancestors: string[]
  preview?: boolean
}) {
  const { userId, profile, partner } = useMe()
  const mine = message.from_user === userId
  const author = mine ? profile : partner
  const bubble = variant === 'bubble'
  const ownReadings = useReadings(userId).data ?? []
  const partnerReadings = useReadings(partner?.id).data ?? []
  const messages = useMessages().data ?? []
  const hearts = (useReactions().data ?? []).filter((reaction) => reaction.target_id === message.id)
  const hearted = hearts.some((reaction) => reaction.user_id === userId)
  const reading = ownReadings.find((r) => r.book_id === message.book_id && ['want', 'reading'].includes(r.status))
  const book = [...ownReadings, ...partnerReadings].find((r) => r.book_id === message.book_id)?.book
  const parent = message.reply_to ? messages.find((item) => item.id === message.reply_to) : undefined
  const replies = messages.filter((item) => item.reply_to === message.id && !ancestors.includes(item.id))
  const [expanded, setExpanded] = useState(false)
  const [replying, setReplying] = useState(false)
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar. Inténtalo otra vez.')
    } finally {
      setBusy(false)
    }
  }
  const remaining =
    reading && message.page !== null
      ? Math.max(
          0,
          message.page -
            (reading.unit === 'pages'
              ? reading.current_position
              : reading.book.page_count
                ? Math.floor((reading.current_position / reading.total_units) * reading.book.page_count)
                : 0),
        )
      : null
  const time = new Date(message.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  const emotion = !message.locked && message.emotion ? EMOTIONS[message.emotion] : null
  return (
    <article
      id={`m-${message.id}`}
      className={
        bubble
          ? `w-fit max-w-[92%] space-y-2 border-l bg-surface/40 px-4 py-3 scroll-mt-5 target:ring-2 target:ring-accent [overflow-wrap:anywhere] ${author?.accent === 'green' ? 'border-green' : 'border-blue'} ${mine ? 'ml-auto' : 'mr-auto'}`
          : 'rule space-y-3 py-4 scroll-mt-5 target:ring-2 target:ring-accent [overflow-wrap:anywhere]'
      }
    >
      {!bubble && (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className={`eyebrow min-w-0 flex-1 ${author?.accent === 'green' ? 'text-green' : 'text-blue'}`}>
            Una huella de {author?.display_name ?? 'tu pareja'}
            {message.page !== null ? ` · p. ${message.page}` : ''}
          </span>
          <time className="ml-auto shrink-0 text-xs text-muted" dateTime={message.created_at}>
            {time}
          </time>
        </div>
      )}
      {!bubble && emotion && (
        <p className="text-xs">
          {emotion.emoji} {emotion.label}
        </p>
      )}
      {bubble && emotion && (
        <p className="text-xs text-muted">
          {emotion.emoji} {emotion.label}
        </p>
      )}
      {message.locked ? (
        <>
          <p className="text-sm">
            <LockKeyhole className="mr-1 inline" size={15} aria-hidden /> Te dejó algo
            {!bubble && book ? ` en «${book.title}»` : ''}
            {bubble ? ' en la p. ' : ' · p. '}
            {message.page}
            {remaining !== null && remaining > 0 ? ` · te faltan ${remaining}` : ' · te espera cuando llegues'}
          </p>
          <button
            className="btn btn-ghost min-h-11"
            disabled={busy}
            onClick={() => {
              if (window.confirm('Puede contar algo que aún no has leído. ¿Abrir igualmente?')) {
                void run(() => openEarly(message.id))
              }
            }}
          >
            Abrir igualmente
          </button>
        </>
      ) : (
        <>
          {!bubble && parent && (
            <p className="truncate border-l border-rule pl-3 text-xs text-muted">
              En respuesta a: «
              {parent.locked
                ? 'Un mensaje por abrir'
                : (parent.body ?? (parent.emotion ? EMOTIONS[parent.emotion].label : 'Un mensaje'))}
              »
            </p>
          )}
          {message.body && (
            <p
              className={`hand whitespace-pre-wrap [overflow-wrap:anywhere] ${preview && !expanded ? 'line-clamp-3' : ''}`}
            >
              {message.body}
            </p>
          )}
          {preview && (message.body || replies.length > 0) && (
            <button
              className="btn btn-link min-h-11 text-xs"
              aria-expanded={expanded}
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Ver menos' : 'Leer el mensaje completo'}
            </button>
          )}
          {!bubble && showBook && book && (
            <p className="truncate text-xs text-muted">
              {book.title}
              {message.page !== null ? ` · p. ${message.page}` : ''}
            </p>
          )}
          {bubble && (
            <p className="text-right text-xs text-muted">
              {message.page !== null ? `p. ${message.page} · ` : ''}
              <time dateTime={message.created_at}>{time}</time>
            </p>
          )}
          {!mine ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <button
                className={`btn btn-link min-h-11 shrink-0 gap-2 whitespace-nowrap text-xs ${hearted ? 'text-accent' : 'text-muted'}`}
                aria-label="Me ha gustado"
                aria-pressed={hearted}
                disabled={busy}
                onClick={() => void run(() => toggleHeart(message.id))}
              >
                <Heart size={16} fill={hearted ? 'currentColor' : 'none'} aria-hidden />
                {hearted ? 'Te ha gustado' : 'Me gusta'}
              </button>
              <button
                className="btn btn-link min-h-11 shrink-0 whitespace-nowrap text-xs"
                aria-expanded={replying}
                onClick={() => setReplying(!replying)}
              >
                Responder
              </button>
              {!message.read_at && (
                <button
                  className="btn btn-link min-h-11 shrink-0 whitespace-nowrap text-xs"
                  aria-label="Quitar de Para ti"
                  disabled={busy}
                  onClick={() => void run(() => markRead([message.id]))}
                >
                  Hecho
                </button>
              )}
            </div>
          ) : (
            hearts.length > 0 && (
              <p className="text-xs" aria-label="Tu pareja le ha dado un corazón">
                <Heart size={16} fill="currentColor" aria-hidden />
              </p>
            )
          )}
          {replying && (
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                if (!body.trim()) return
                void run(async () => {
                  await sendMessage({ kind: 'reply', replyTo: message.id, bookId: message.book_id, body })
                  setBody('')
                  setReplying(false)
                })
              }}
            >
              <input
                autoFocus={window.matchMedia('(pointer: fine)').matches}
                name="reply"
                autoComplete="off"
                className="hand min-h-11 min-w-0 flex-1 placeholder:font-sans placeholder:text-sm"
                aria-label="Responder al mensaje"
                placeholder="Responder…"
                maxLength={1000}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    setReplying(false)
                  }
                }}
              />
              <button className="btn btn-outline" disabled={busy || !body.trim()}>
                Enviar
              </button>
            </form>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {!message.locked && replies.length > 0 && (!preview || expanded) && (
        <div className="space-y-3 border-l border-rule pl-3">
          {(expanded ? replies : replies.slice(0, 2)).map((reply) => (
            <MessageContent
              key={reply.id}
              message={reply}
              showBook={false}
              variant="bubble"
              ancestors={[...ancestors, message.id]}
            />
          ))}
          {replies.length > 2 && (
            <button className="btn btn-link min-h-11 text-xs" onClick={() => setExpanded(!expanded)}>
              {expanded ? 'Ver menos' : `Ver ${replies.length - 2} más`}
            </button>
          )}
        </div>
      )}
    </article>
  )
}
