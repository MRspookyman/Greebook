import { useEffect, useId, useState } from 'react'
import { Camera, Heart, Lock } from 'lucide-react'
import { BottomSheet } from '@/components/BottomSheet'
import { Segmented } from '@/components/Segmented'
import { Switch } from '@/components/Switch'
import { toast } from '@/components/toast'
import { useMe } from '@/features/auth/me'
import { useReadings } from '@/lib/data'
import type { QuoteKind } from '@/lib/types'
import { myReadingOf, saveQuote, shareNote } from './quotes'

interface Props {
  open: boolean
  onClose: () => void
  /** Book to start with; defaults to your most recent reading. */
  bookId?: string
  /** Page to start with; defaults to where you are in that book. */
  page?: number | null
  onSaved?: (id: string) => void
}

/** Keep a sentence (cita) or your own words (nota) on a page. Shared by default, spoiler-safe for the partner. */
export function QuoteSheet({ open, onClose, bookId, page, onSaved }: Props) {
  const { userId, partner } = useMe()
  const mine = useReadings(userId).data ?? []
  const theirs = useReadings(partner?.id).data ?? []
  const choices = [
    ...new Map(
      mine
        .filter((r) => r.status === 'reading' || r.book_id === bookId)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .map((r) => [r.book_id, r] as const),
    ).values(),
  ]
  const id = useId()
  const [kind, setKind] = useState<QuoteKind>('cita')
  const [book, setBook] = useState(bookId ?? choices[0]?.book_id ?? '')
  const [pageText, setPageText] = useState('')
  const [body, setBody] = useState('')
  const [comment, setComment] = useState('')
  const [shared, setShared] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const reading = myReadingOf(mine, book)

  useEffect(() => {
    if (!open) return
    const start = bookId ?? choices[0]?.book_id ?? ''
    const r = myReadingOf(mine, start)
    setBook(start)
    setPageText(page != null ? String(page) : r && r.unit === 'pages' ? String(r.current_position) : '')
    setKind('cita')
    setBody('')
    setComment('')
    setShared(true)
    setError('')
    // Only when it opens: later reading updates must not wipe what is being written.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const pageNumber = pageText === '' ? null : Number(pageText)
  const maxPage = reading?.unit === 'pages' ? reading.total_units : (reading?.book.page_count ?? 5000)
  const note = partner ? shareNote(partner.display_name, myReadingOf(theirs, book), pageNumber, shared) : null

  async function save() {
    if (busy) return
    if (!book) return setError('Elige el libro')
    if (!body.trim()) return setError(kind === 'cita' ? 'Escribe la frase antes de guardarla' : 'Escribe la nota antes de guardarla')
    if (pageText !== '' && (!/^\d+$/.test(pageText) || Number(pageText) > maxPage))
      return setError(`Escribe una página entre 0 y ${maxPage}`)
    setBusy(true)
    setError('')
    try {
      const saved = await saveQuote({ bookId: book, page: pageNumber, kind, body, comment, shared: shared && !!partner })
      toast(kind === 'cita' ? 'Cita guardada' : 'Nota guardada', note && shared ? note.text : undefined)
      onSaved?.(saved)
      onClose()
    } catch {
      setError('No se pudo guardar. Comprueba la conexión e inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={kind === 'cita' ? 'Nueva cita' : 'Nueva nota'} dirty={!!body.trim() || !!comment.trim()}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          void save()
        }}
      >
        <Segmented<QuoteKind>
          options={[
            { value: 'cita', label: 'Cita del libro' },
            { value: 'nota', label: 'Nota mía' },
          ]}
          value={kind}
          onChange={setKind}
          aria-label="Qué quieres guardar"
        />
        {choices.length > 1 && (
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5" role="group" aria-label="Libro">
            {choices.map((r) => (
              <button
                key={r.book_id}
                type="button"
                className="chip flex-none"
                aria-pressed={r.book_id === book}
                onClick={() => {
                  setBook(r.book_id)
                  if (r.unit === 'pages') setPageText(String(r.current_position))
                }}
              >
                {r.book.title}
              </button>
            ))}
          </div>
        )}
        <div className="space-y-1.5">
          <label className="label" htmlFor={`${id}-body`}>
            {kind === 'cita' ? 'La frase' : 'Lo que quieres dejar aquí'}
          </label>
          <textarea
            id={`${id}-body`}
            className={`input min-h-28 resize-none ${kind === 'cita' ? 'quote-text' : 'hand text-[23px]'}`}
            maxLength={2000}
            placeholder={kind === 'cita' ? 'Escríbela o cópiala de la página' : 'Algo que quieras que lea al llegar aquí'}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          {kind === 'cita' && (
            <p className="flex items-start gap-2 text-[13px] text-muted">
              <Camera size={16} className="mt-0.5 flex-none" aria-hidden />
              En el iPhone puedes copiarla de la página con la cámara: toca el campo y elige «Escanear texto».
            </p>
          )}
        </div>
        <div className="flex items-end gap-3">
          <div className="w-[104px] flex-none space-y-1.5">
            <label className="label" htmlFor={`${id}-page`}>
              Página
            </label>
            <input
              id={`${id}-page`}
              className="input num text-lg"
              inputMode="numeric"
              autoComplete="off"
              value={pageText}
              onChange={(event) => setPageText(event.target.value.replace(/\D/g, ''))}
            />
          </div>
          {kind === 'cita' && (
            <div className="min-w-0 flex-1 space-y-1.5">
              <label className="label" htmlFor={`${id}-comment`}>
                Tu comentario (opcional)
              </label>
              <input
                id={`${id}-comment`}
                className="input hand text-[21px]"
                maxLength={500}
                autoComplete="off"
                placeholder="Por qué te la guardas"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
              />
            </div>
          )}
        </div>
        {partner && (
          <Switch checked={shared} onChange={setShared}>
            <span className="font-extrabold">Que la vea {partner.display_name}</span>
          </Switch>
        )}
        {note && (
          <p className="flex items-start gap-2 text-[13px] text-muted" aria-live="polite">
            {note.locked ? (
              <Lock size={16} className="mt-0.5 flex-none" aria-hidden />
            ) : (
              <Heart size={16} className="mt-0.5 flex-none text-rose" fill="currentColor" aria-hidden />
            )}
            {note.text}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? 'Guardando…' : kind === 'cita' ? 'Guardar cita' : 'Guardar nota'}
        </button>
      </form>
    </BottomSheet>
  )
}
