import { useState } from 'react'
import { formatDistanceToNowStrict } from 'date-fns'
import { es } from 'date-fns/locale'
import { Heart, Lock, LockOpen, Reply, Trash2 } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { toast } from '@/components/toast'
import { useMe } from '@/features/auth/me'
import { useQuoteReplies, useReactions, useReadings } from '@/lib/data'
import type { Quote } from '@/lib/types'
import { deleteQuote, myReadingOf, openQuoteEarly, pagesUntil, replyToQuote, toggleQuoteHeart } from './quotes'

const ago = (iso: string) =>
  Date.now() - new Date(iso).getTime() < 60_000
    ? 'ahora'
    : formatDistanceToNowStrict(new Date(iso), { addSuffix: true, locale: es })

/**
 * One quote or note on its page, with the author's ribbon. A partner's quote that would be a spoiler stays closed
 * until you reach its page; it can still be opened (they'll see you couldn't wait).
 */
export function QuoteCard({ quote, compact = false, showBook = true }: { quote: Quote; compact?: boolean; showBook?: boolean }) {
  const { userId, profile, partner } = useMe()
  const mine = quote.user_id === userId
  const author = mine ? profile : partner
  const readings = useReadings(userId)
  const replies = (useQuoteReplies().data ?? []).filter((r) => r.quote_id === quote.id)
  const reactions = useReactions().data ?? []
  const liked = reactions.some((r) => r.target_id === quote.id && r.user_id === userId)
  const partnerLiked = reactions.some((r) => r.target_id === quote.id && r.user_id === partner?.id)
  const [replying, setReplying] = useState(false)
  const [reply, setReply] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  if (!author) return null
  const color = `var(--${author.accent})`
  const fresh = !mine && !quote.locked && !quote.seen_at

  async function act(action: () => Promise<unknown>, error: string) {
    if (busy) return
    setBusy(true)
    try {
      await action()
    } catch {
      toast(error)
    } finally {
      setBusy(false)
    }
  }

  const meta = (
    <div className="flex items-center gap-2.5 pr-6 text-[13px] leading-snug text-muted">
      <Avatar person={author} size={30} />
      <p className="min-w-0 flex-1">
        <b className="font-extrabold text-ink">{mine ? 'Tú' : author.display_name}</b>
        {showBook && <> · {quote.book.title}</>}
        {quote.page !== null && <> · p. {quote.page}</>}
        <br />
        {ago(quote.created_at)}
        {!quote.shared && ' · solo tú la ves'}
      </p>
      {fresh && <span className="rounded-full bg-plum px-2 py-0.5 text-xs font-extrabold text-on-plum">Nueva</span>}
    </div>
  )
  const ribbon = (
    <span
      aria-hidden
      className="absolute top-0 right-[22px] h-[26px] w-[10px]"
      style={{ background: color, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)' }}
    />
  )

  if (quote.locked) {
    const left = pagesUntil(quote, myReadingOf(readings.data, quote.book_id))
    return (
      <article
        id={`c-${quote.id}`}
        className="relative scroll-mt-6 space-y-2.5 rounded-[22px] px-[18px] pt-4 pb-2 shadow-[var(--paper-shadow)]"
        style={{
          background:
            'repeating-linear-gradient(-45deg, transparent 0 9px, color-mix(in oklab, var(--rule) 55%, transparent) 9px 10px), var(--surface)',
        }}
        aria-label={`${author.display_name} te dejó algo en la página ${quote.page}`}
      >
        {ribbon}
        {meta}
        <p className="flex items-center gap-2 font-extrabold">
          <Lock size={18} aria-hidden /> Se abre en la p. {quote.page}
        </p>
        <p className="text-sm text-muted">
          {left !== null ? `Te faltan ${left} ${left === 1 ? 'página' : 'páginas'}. ` : ''}
          {author.display_name} te lo dejó para cuando llegues.
        </p>
        <div className="-mx-2 flex flex-wrap items-center gap-x-3 border-t border-dashed border-rule pt-1">
          {confirmOpen ? (
            <>
              <span className="px-2 text-sm">Puede destriparte algo.</span>
              <button className="btn btn-link px-2 text-sm" disabled={busy} onClick={() => void act(() => openQuoteEarly(quote.id), 'No se pudo abrir')}>
                Abrirla
              </button>
              <button className="btn btn-link px-2 text-sm" onClick={() => setConfirmOpen(false)}>
                Mejor espero
              </button>
            </>
          ) : (
            <button className="btn btn-link px-2 text-sm no-underline" onClick={() => setConfirmOpen(true)}>
              <LockOpen size={17} aria-hidden /> Abrir igualmente
            </button>
          )}
        </div>
      </article>
    )
  }

  return (
    <article
      id={`c-${quote.id}`}
      className="relative scroll-mt-6 space-y-2.5 rounded-[22px] bg-surface px-[18px] pt-4 pb-2 shadow-[var(--paper-shadow)] target:outline-2 target:outline-amber"
    >
      {ribbon}
      {meta}
      {quote.kind === 'cita' ? (
        <p className="quote-text wrap-anywhere">«{quote.body}»</p>
      ) : (
        <p className="hand wrap-anywhere text-[25px]">{quote.body}</p>
      )}
      {quote.comment && (
        <p className="hand wrap-anywhere" style={{ color }}>
          {quote.comment}
        </p>
      )}
      {quote.opened_early && !mine && <p className="text-xs text-muted">La abriste antes de llegar.</p>}
      {quote.opened_early && mine && <p className="text-xs text-muted">{partner?.display_name} no pudo esperar y la abrió antes.</p>}
      {!compact &&
        replies.map((r) => {
          const who = r.user_id === userId ? profile : partner
          if (!who) return null
          return (
            <p key={r.id} className="flex items-start gap-2 rounded-[14px] bg-sunk px-3 py-2 text-sm">
              <Avatar person={who} size={22} />
              <span className="wrap-anywhere">{r.body}</span>
            </p>
          )
        })}
      {compact && replies.length > 0 && (
        <p className="text-xs text-muted">
          {replies.length} {replies.length === 1 ? 'respuesta' : 'respuestas'}
        </p>
      )}
      {replying && (
        <form
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (!reply.trim()) return
            void act(async () => {
              await replyToQuote(quote.id, reply)
              setReply('')
              setReplying(false)
            }, 'No se pudo enviar la respuesta')
          }}
        >
          <label className="sr-only" htmlFor={`reply-${quote.id}`}>
            Tu respuesta
          </label>
          <textarea
            id={`reply-${quote.id}`}
            className="input hand min-h-12 flex-1 resize-none text-[21px]"
            maxLength={1000}
            rows={1}
            placeholder="Escribe algo bonito"
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            autoFocus
          />
          <button className="btn btn-primary" disabled={busy || !reply.trim()}>
            Enviar
          </button>
        </form>
      )}
      <div className="-mx-2 flex flex-wrap items-center border-t border-dashed border-rule pt-1">
        {mine ? (
          <span className={`flex min-h-11 items-center gap-1.5 px-2 text-sm font-extrabold ${partnerLiked ? 'text-rose' : 'text-muted'}`}>
            <Heart size={18} fill={partnerLiked ? 'currentColor' : 'none'} aria-hidden />
            {partnerLiked ? `Le gusta a ${partner?.display_name}` : quote.shared ? 'Aún sin corazón' : 'Privada'}
          </span>
        ) : (
          <button
            type="button"
            aria-pressed={liked}
            disabled={busy}
            className={`flex min-h-11 items-center gap-1.5 rounded-full px-2.5 text-sm font-extrabold ${liked ? 'text-rose' : 'text-muted'}`}
            onClick={() => void act(() => toggleQuoteHeart(quote.id), 'No se pudo guardar el corazón')}
          >
            <Heart size={19} fill={liked ? 'currentColor' : 'none'} aria-hidden style={{ transition: 'fill 140ms var(--ease)' }} />
            {liked ? 'Te gusta' : 'Me gusta'}
          </button>
        )}
        {quote.shared && !replying && (
          <button type="button" className="flex min-h-11 items-center gap-1.5 px-2 text-sm font-extrabold" onClick={() => setReplying(true)}>
            <Reply size={18} aria-hidden /> Responder
          </button>
        )}
        {mine &&
          (confirmDelete ? (
            <span className="ml-auto flex items-center">
              <button className="btn btn-link px-2 text-sm text-danger" disabled={busy} onClick={() => void act(() => deleteQuote(quote.id), 'No se pudo borrar')}>
                Borrar
              </button>
              <button className="btn btn-link px-2 text-sm" onClick={() => setConfirmDelete(false)}>
                No
              </button>
            </span>
          ) : (
            <button type="button" className="ml-auto grid min-h-11 min-w-11 place-items-center text-muted" aria-label="Borrar" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={17} aria-hidden />
            </button>
          ))}
      </div>
    </article>
  )
}
