import { useState } from 'react'
import { format, formatDistanceToNowStrict } from 'date-fns'
import { es } from 'date-fns/locale'
import { Heart, Lock, LockOpen, Pencil, Reply, Share2, Trash2 } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { BottomSheet } from '@/components/BottomSheet'
import { toast } from '@/components/toast'
import { useMe } from '@/features/auth/me'
import { useQuoteReplies, useReactions, useReadings } from '@/lib/data'
import type { Quote } from '@/lib/types'
import {
  deleteQuote, deleteQuoteReply, myReadingOf, openQuoteEarly, pagesUntil, replyToQuote,
  toggleQuoteHeart, updateQuoteReply,
} from './quotes'
import { useQuotePhoto } from './photos'
import { QuoteSheet } from './QuoteSheet'
import { shareQuoteImage } from './shareImage'
import { removeWithUndo } from '@/lib/undo'

/** Quiet icon actions at the end of a card: share, edit, delete. */
const iconAction =
  'grid h-11 w-10 place-items-center rounded-full text-muted transition-[color,transform] duration-150 hover:text-ink active:scale-95 disabled:opacity-50'

const ago = (iso: string) => {
  const date = new Date(iso)
  const elapsed = Date.now() - date.getTime()
  if (elapsed < 60_000) return 'ahora'
  return elapsed > 7 * 24 * 60 * 60 * 1000
    ? format(date, "d 'de' MMMM 'de' yyyy", { locale: es })
    : formatDistanceToNowStrict(date, { addSuffix: true, locale: es })
}

/**
 * One quote or note on its page, with the author's ribbon. A partner's quote that would be a spoiler stays closed
 * until you reach its page; it can still be opened (they'll see you couldn't wait).
 */
export function QuoteCard({
  quote,
  compact = false,
  showBook = true,
}: {
  quote: Quote
  compact?: boolean
  showBook?: boolean
}) {
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
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [photoOpen, setPhotoOpen] = useState(false)
  const [editingReply, setEditingReply] = useState<string | null>(null)
  const [replyDraft, setReplyDraft] = useState('')
  const [beat, setBeat] = useState(false)
  const photo = useQuotePhoto(quote.locked ? null : quote.photo_path)
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
    const reading = (readings.data ?? []).find(
      (r) => r.book_id === quote.book_id && (r.status === 'want' || r.status === 'reading') &&
        r.unit === 'percent' && !r.book.page_count,
    )
    const waitsForFinish = quote.page !== null && !!reading
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
          <Lock size={18} aria-hidden /> {waitsForFinish ? 'Se abre al terminar el libro' : `Se abre en la p. ${quote.page}`}
        </p>
        <p className="text-sm text-muted">
          {waitsForFinish ? (
            'Llevas esta lectura en porcentaje y el libro no tiene número de páginas. Esta cita con página se abrirá al marcar la lectura como terminada, o puedes abrirla antes.'
          ) : (
            <>
              {left !== null ? `Te faltan ${left} ${left === 1 ? 'página' : 'páginas'}. ` : ''}
              {author.display_name} te lo dejó para cuando llegues.
            </>
          )}
        </p>
        <div className="-mx-2 flex flex-wrap items-center gap-x-3 border-t border-dashed border-rule pt-1">
          {confirmOpen ? (
            <>
              <span className="px-2 text-sm">Puede destriparte algo.</span>
              <button
                className="btn btn-link px-2 text-sm"
                disabled={busy}
                onClick={() => void act(() => openQuoteEarly(quote.id), 'No se pudo abrir')}
              >
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
      {quote.body && (quote.kind === 'cita' ? (
        <p className="quote-text wrap-anywhere">«{quote.body}»</p>
      ) : (
        <p className="hand wrap-anywhere text-[25px]">{quote.body}</p>
      ))}
      {quote.photo_path && (
        photo.data ? (
          <button
            type="button"
            className="block w-full overflow-hidden rounded-[14px]"
            aria-label="Ver foto de la cita a tamaño completo"
            onClick={() => setPhotoOpen(true)}
          >
            <img src={photo.data} alt={`Foto guardada de ${quote.book.title}`} className="max-h-80 w-full object-contain" />
          </button>
        ) : (
          <p className="text-sm text-muted" role="status">
            {photo.isError ? 'No se pudo cargar la foto.' : 'Cargando foto…'}
            {photo.isError && (
              <button type="button" className="btn btn-link text-sm" onClick={() => void photo.refetch()}>
                Reintentar
              </button>
            )}
          </p>
        )
      )}
      {quote.comment && (
        <p className="hand wrap-anywhere" style={{ color }}>
          {quote.comment}
        </p>
      )}
      {quote.opened_early && !mine && <p className="text-xs text-muted">La abriste antes de llegar.</p>}
      {quote.opened_early && mine && (
        <p className="text-xs text-muted">{partner?.display_name} no pudo esperar y la abrió antes.</p>
      )}
      {!compact &&
        replies.map((r) => {
          const who = r.user_id === userId ? profile : partner
          if (!who) return null
          return (
            <div key={r.id} className="flex items-start gap-2 rounded-[14px] bg-sunk px-3 py-2 text-sm">
              <Avatar person={who} size={22} />
              <div className="min-w-0 flex-1">
                {r.user_id === userId && editingReply === r.id ? (
                  <form onSubmit={(event) => {
                    event.preventDefault()
                    if (!replyDraft.trim()) return
                    void act(async () => {
                      await updateQuoteReply(r.id, replyDraft.trim())
                      setEditingReply(null)
                    }, 'No se pudo guardar la respuesta')
                  }}>
                    <label className="sr-only" htmlFor={`edit-reply-${r.id}`}>Editar tu respuesta</label>
                    <textarea
                      id={`edit-reply-${r.id}`}
                      className="input min-h-12 w-full resize-none"
                      value={replyDraft}
                      maxLength={1000}
                      onChange={(event) => setReplyDraft(event.target.value)}
                      autoFocus
                    />
                    <div className="flex flex-wrap gap-2">
                      <button className="btn btn-link text-sm" disabled={busy || !replyDraft.trim()}>Guardar</button>
                      <button type="button" className="btn btn-link text-sm" disabled={busy} onClick={() => setEditingReply(null)}>Cancelar</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex items-start gap-1">
                      <p className="min-w-0 flex-1 wrap-anywhere">{r.body}</p>
                      {r.user_id === userId && (
                        <span className="-my-2.5 -mr-2.5 flex flex-none">
                          <button type="button" className={iconAction} aria-label="Editar tu respuesta" disabled={busy} onClick={() => {
                            setEditingReply(r.id)
                            setReplyDraft(r.body)
                          }}>
                            <Pencil size={15} aria-hidden />
                          </button>
                          <button
                            type="button"
                            className={iconAction}
                            aria-label="Borrar tu respuesta"
                            disabled={busy}
                            onClick={() =>
                              removeWithUndo({
                                ids: [r.id],
                                message: 'Respuesta borrada',
                                failMessage: 'No se pudo borrar la respuesta',
                                commit: () => deleteQuoteReply(r.id),
                              })
                            }
                          >
                            <Trash2 size={15} aria-hidden />
                          </button>
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
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
      <div className="-mx-2 flex items-center border-t border-dashed border-rule pt-1">
        {mine ? (
          partnerLiked && (
            <span className="flex min-h-11 items-center gap-1.5 px-2 text-sm font-extrabold whitespace-nowrap text-rose">
              <Heart size={18} fill="currentColor" aria-hidden />
              Le gusta<span className="sr-only"> a {partner?.display_name}</span>
            </span>
          )
        ) : (
          <button
            type="button"
            aria-pressed={liked}
            disabled={busy}
            className={`flex min-h-11 items-center gap-1.5 rounded-full px-2.5 text-sm font-extrabold transition-colors duration-150 ${liked ? 'text-rose' : 'text-muted'}`}
            onClick={() => {
              if (!liked) setBeat(true)
              void act(() => toggleQuoteHeart(quote.id, userId), 'No se pudo guardar el corazón')
            }}
          >
            <Heart
              size={19}
              fill={liked ? 'currentColor' : 'none'}
              aria-hidden
              onAnimationEnd={() => setBeat(false)}
              style={{ transition: 'fill 140ms var(--ease)', animation: beat ? 'gb-beat 560ms var(--ease)' : undefined }}
            />
            {liked ? 'Te gusta' : 'Me gusta'}
          </button>
        )}
        {quote.shared && !replying && (
          <button
            type="button"
            className="flex min-h-11 items-center gap-1.5 px-2 text-sm font-extrabold whitespace-nowrap"
            onClick={() => setReplying(true)}
          >
            <Reply size={18} aria-hidden /> Responder
          </button>
        )}
        <span className="ml-auto flex items-center">
          {(quote.body || quote.photo_path) && (
            <button
              type="button"
              className={iconAction}
              aria-label="Compartir como imagen"
              disabled={busy || (!quote.body && !photo.data)}
              onClick={() => void act(async () => {
                const result = await shareQuoteImage({
                  body: quote.body,
                  photoUrl: photo.data,
                  title: quote.book.title,
                  authors: quote.book.authors,
                  savedBy: author.display_name,
                  accent: author.accent,
                  page: quote.page,
                  kind: quote.kind,
                })
                if (result === 'downloaded') toast('Imagen descargada')
              }, 'No se pudo compartir la imagen')}
            >
              <Share2 size={18} aria-hidden />
            </button>
          )}
          {mine && (
            <button type="button" className={iconAction} aria-label="Editar" disabled={busy} onClick={() => setEditing(true)}>
              <Pencil size={17} aria-hidden />
            </button>
          )}
          {mine && (
            <button
              type="button"
              className={iconAction}
              aria-label="Borrar"
              onClick={() =>
                removeWithUndo({
                  ids: [quote.id],
                  message: quote.kind === 'nota' ? 'Nota borrada' : 'Cita borrada',
                  failMessage: 'No se pudo borrar',
                  commit: () => deleteQuote(quote.id, quote.photo_path),
                })
              }
            >
              <Trash2 size={17} aria-hidden />
            </button>
          )}
        </span>
      </div>
      {mine && <QuoteSheet open={editing} onClose={() => setEditing(false)} quote={quote} />}
      <BottomSheet open={photoOpen} onClose={() => setPhotoOpen(false)} title="Foto de la cita">
        {photo.data && (
          <img
            src={photo.data}
            alt={`Foto guardada de ${quote.book.title}`}
            className="mx-auto max-h-[78dvh] w-full rounded-[14px] object-contain"
          />
        )}
      </BottomSheet>
    </article>
  )
}
