import { useEffect, useId, useRef, useState } from 'react'
import { Camera, Heart, Lock } from 'lucide-react'
import { BottomSheet } from '@/components/BottomSheet'
import { Segmented } from '@/components/Segmented'
import { Switch } from '@/components/Switch'
import { toast } from '@/components/toast'
import { useMe } from '@/features/auth/me'
import { useReadings } from '@/lib/data'
import type { Quote, QuoteKind } from '@/lib/types'
import { physicalPagePosition } from '@/lib/units'
import { myReadingOf, saveQuote, shareNote, updateQuote } from './quotes'
import { compressQuotePhoto, useQuotePhoto } from './photos'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'

interface Props {
  open: boolean
  onClose: () => void
  /** Book to start with; defaults to your most recent reading. */
  bookId?: string
  /** Physical page to start with; Kindle percentages are converted only with a known page count. */
  page?: number | null
  onSaved?: (id: string) => void
  quote?: Quote
}

/** Keep a sentence (cita) or your own words (nota) on a page. Shared by default, spoiler-safe for the partner. */
export function QuoteSheet({ open, onClose, bookId, page, onSaved, quote }: Props) {
  const { userId, partner } = useMe()
  const mine = useReadings(userId).data ?? []
  const theirs = useReadings(partner?.id).data ?? []
  const choices = [...mine]
    .sort((a, b) => Number(b.status === 'reading') - Number(a.status === 'reading') || b.updated_at.localeCompare(a.updated_at))
    .filter((r, index, all) => all.findIndex((candidate) => candidate.book_id === r.book_id) === index)
  const id = useId()
  const [kind, setKind] = useState<QuoteKind>('cita')
  const [book, setBook] = useState(bookId ?? choices[0]?.book_id ?? '')
  const [pageText, setPageText] = useState('')
  const [body, setBody] = useState('')
  const [comment, setComment] = useState('')
  const [shared, setShared] = useState(true)
  const [safe, setSafe] = useState(false)
  const [photo, setPhoto] = useState<Blob | null>(null)
  const [photoRemoved, setPhotoRemoved] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const existingPhoto = useQuotePhoto(open && !photoRemoved ? quote?.photo_path : null)
  const hasPhoto = !!photo || (!!quote?.photo_path && !photoRemoved)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const reading = myReadingOf(mine, book)

  useEffect(() => {
    if (!open) return
    const start = quote?.book_id ?? bookId ?? choices[0]?.book_id ?? ''
    const r = myReadingOf(mine, start)
    setBook(start)
    const position = r ? physicalPagePosition(r) : null
    setPageText(quote ? quote.page === null ? '' : String(quote.page) : page != null ? String(page) : position !== null ? String(position) : '')
    setKind(quote?.kind ?? 'cita')
    setBody(quote?.body ?? '')
    setComment(quote?.comment ?? '')
    setShared(quote?.shared ?? true)
    setSafe(quote?.safe ?? false)
    setPhoto(null)
    setPhotoRemoved(false)
    setError('')
    // Only when it opens: later reading updates must not wipe what is being written.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!photo) { setPreview(null); return }
    const url = URL.createObjectURL(photo)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  const pageNumber = pageText === '' ? null : Number(pageText)
  const maxPage = reading?.unit === 'pages' ? reading.total_units : (reading?.book.page_count ?? 5000)
  const note = partner ? shareNote(partner.display_name, myReadingOf(theirs, book), pageNumber, shared, safe) : null

  async function save() {
    if (busy) return
    if (!book) return setError('Elige el libro')
    if (!body.trim() && !hasPhoto)
      return setError('Escribe algo o añade una foto antes de guardar')
    if (pageText !== '' && (!/^\d+$/.test(pageText) || Number(pageText) > maxPage))
      return setError(`Escribe una página entre 0 y ${maxPage}`)
    setBusy(true)
    setError('')
    const savedId = quote?.id ?? crypto.randomUUID()
    const path = `${userId}/${savedId}.jpg`
    let uploaded = false
    let previousPhoto: Blob | null = null
    try {
      if (photo) {
        if (quote?.photo_path) {
          const previous = await supabase.storage.from('quote-photos').download(quote.photo_path)
          if (previous.error) throw previous.error
          previousPhoto = previous.data
        }
        const result = await supabase.storage.from('quote-photos').upload(path, photo, { contentType: 'image/jpeg', upsert: !!quote?.photo_path })
        if (result.error) throw result.error
        uploaded = true
      }
      const photoPath = photo ? path : photoRemoved ? null : quote?.photo_path ?? null
      if (quote) {
        await updateQuote(quote.id, {
          page: pageNumber, kind, body: body.trim() || null,
          comment: kind === 'cita' ? comment.trim() || null : null,
          shared: shared && !!partner, safe, photo_path: photoPath,
        })
      } else {
        await saveQuote({ id: savedId, bookId: book, page: pageNumber, kind, body,
          comment: kind === 'cita' ? comment : null, shared: shared && !!partner, safe, photoPath })
      }
      if (quote?.photo_path && photoRemoved && !photo)
        await supabase.storage.from('quote-photos').remove([quote.photo_path])
      await queryClient.invalidateQueries({ queryKey: ['quote-photo'] })
      toast(kind === 'cita' ? 'Cita guardada' : 'Nota guardada', note && shared ? note.text : undefined)
      onSaved?.(savedId)
      onClose()
    } catch {
      if (uploaded) {
        if (previousPhoto) await supabase.storage.from('quote-photos').upload(path, previousPhoto, { contentType: previousPhoto.type, upsert: true })
        else await supabase.storage.from('quote-photos').remove([path])
      }
      setError('No se pudo guardar. Comprueba la conexión e inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={quote ? 'Editar cita o nota' : kind === 'cita' ? 'Nueva cita' : 'Nueva nota'}
      dirty={!!body.trim() || !!comment.trim() || hasPhoto}
    >
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
          onChange={(value) => { setKind(value); if (value === 'nota') setComment('') }}
          aria-label="Qué quieres guardar"
        />
        {!quote && choices.length > 0 && (
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5" role="group" aria-label="Libro">
            {choices.map((r) => (
              <button
                key={r.book_id}
                type="button"
                className="chip flex-none"
                aria-pressed={r.book_id === book}
                onClick={() => {
                  setBook(r.book_id)
                  const position = physicalPagePosition(r)
                  setPageText(position === null ? '' : String(position))
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
            placeholder={
              kind === 'cita' ? 'Escríbela o cópiala de la página' : 'Algo que quieras que lea al llegar aquí'
            }
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
        <div className="space-y-2">
          <input ref={fileInput} type="file" accept="image/*" capture="environment" className="sr-only"
            aria-label="Foto de la página"
            onChange={async (event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (!file) return
              setPhotoBusy(true)
              setError('')
              try { setPhoto(await compressQuotePhoto(file)); setPhotoRemoved(false) }
              catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo preparar la foto') }
              finally { setPhotoBusy(false) }
            }} />
          {(preview || (!photoRemoved && existingPhoto.data)) && (
            <img src={preview ?? existingPhoto.data} alt="Foto de la página" className="max-h-56 w-full rounded-xl object-contain" />
          )}
          <div className="flex gap-2">
            <button type="button" className="btn btn-outline text-sm" disabled={busy || photoBusy} onClick={() => fileInput.current?.click()}>
              <Camera size={17} aria-hidden /> {photoBusy ? 'Preparando…' : hasPhoto ? 'Cambiar foto' : 'Añadir foto'}
            </button>
            {hasPhoto && <button type="button" className="btn btn-link text-sm" disabled={busy} onClick={() => { setPhoto(null); setPhotoRemoved(true) }}>Quitar foto</button>}
          </div>
        </div>
        <div className="flex items-end gap-3">
          <div className="w-[104px] flex-none space-y-1.5">
            <label className="label" htmlFor={`${id}-page`}>
              {reading?.unit === 'percent' ? 'Página (opcional)' : 'Página'}
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
        {reading?.unit === 'percent' && (
          <p className="text-[13px] text-muted">
            La cita se guarda en una página del libro, no en el porcentaje de Kindle.
            {reading.book.page_count
              ? ' La página sugerida es aproximada; puedes corregirla.'
              : ' Si no conoces la página, déjala vacía.'}
          </p>
        )}
        {partner && (
          <Switch checked={shared} onChange={setShared}>
            <span className="font-extrabold">Que la vea {partner.display_name}</span>
          </Switch>
        )}
        {partner && shared && (
          <Switch checked={safe} onChange={setSafe}>
            <span className="font-extrabold">Sin spoilers</span>
            <span className="block text-[13px] text-muted">Se verá aunque {partner.display_name} vaya por detrás</span>
          </Switch>
        )}
        {partner && shared && reading?.unit === 'percent' && !reading.book.page_count && (
          <p className="text-[13px] text-muted">Este libro no tiene páginas: {partner.display_name} la verá al terminarlo, o márcala sin spoilers. Si dejas la página vacía, se verá directamente.</p>
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
        <button className="btn btn-primary w-full" disabled={busy || photoBusy}>
          {busy ? 'Guardando…' : kind === 'cita' ? 'Guardar cita' : 'Guardar nota'}
        </button>
      </form>
    </BottomSheet>
  )
}
