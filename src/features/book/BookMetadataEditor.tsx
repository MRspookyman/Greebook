import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { BottomSheet } from '@/components/BottomSheet'
import { toast } from '@/components/toast'
import { useOnline } from '@/features/session/useOnline'
import { qk } from '@/lib/data'
import { compressBookCover, validateMetadata, type MetadataDraft } from '@/lib/books/metadata'
import { queryClient } from '@/lib/queryClient'
import { supabase } from '@/lib/supabase'
import type { Book } from '@/lib/types'

interface Props {
  book: Book
  onSaved: () => void
}

function draftFor(book: Book): MetadataDraft {
  return {
    title: book.title,
    authors: book.authors.join(', '),
    pages: book.page_count === null ? '' : String(book.page_count),
    year: book.published_year === null ? '' : String(book.published_year),
    cover: book.cover_url ?? '',
  }
}

/** Trigger and nested sheet: mount inside the reading's options menu. */
export function BookMetadataEditor({ book, onSaved }: Props) {
  const online = useOnline()
  const [open, setOpen] = useState(false)
  return <>
    <button type="button" className="btn btn-secondary w-full" disabled={!online} onClick={() => setOpen(true)}>
      Editar datos del libro
    </button>
    {!online && <p className="text-sm text-muted">Sin conexión: no se pueden editar los datos del libro.</p>}
    {open && <MetadataSheet book={book} onClose={() => setOpen(false)} onSaved={onSaved} />}
  </>
}

function MetadataSheet({ book, onClose, onSaved }: Props & { onClose: () => void }) {
  const online = useOnline()
  const id = useId()
  const initial = useRef(draftFor(book)).current
  const [draft, setDraft] = useState(initial)
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [errors, setErrors] = useState<Partial<Record<keyof MetadataDraft, string>>>({})
  const [failure, setFailure] = useState('')
  const [busy, setBusy] = useState(false)
  const camera = useRef<HTMLInputElement>(null)
  const library = useRef<HTMLInputElement>(null)
  const saving = useRef(false)
  const dirty = !!photo || Object.keys(initial).some((key) => draft[key as keyof MetadataDraft] !== initial[key as keyof MetadataDraft])

  useEffect(() => {
    if (!photo) { setPreview(null); return }
    const url = URL.createObjectURL(photo)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  const change = (key: keyof MetadataDraft, value: string) => {
    setDraft((previous) => ({ ...previous, [key]: value }))
    setErrors((previous) => ({ ...previous, [key]: undefined }))
    setFailure('')
    if (key === 'cover') setPhoto(null)
  }
  const choosePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0]
    event.target.value = ''
    if (!selected) return
    if (!selected.type.startsWith('image/')) {
      setFailure('Selecciona una imagen para la portada.')
      return
    }
    setPhoto(selected)
    setErrors((previous) => ({ ...previous, cover: undefined }))
    setFailure('')
  }

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving.current || !online) return
    const result = validateMetadata(photo ? { ...draft, cover: '' } : draft)
    setErrors(result.errors)
    const first = Object.keys(result.errors)[0]
    if (first) {
      event.currentTarget.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus()
      return
    }
    saving.current = true
    setBusy(true)
    setFailure('')
    let uploadedPath: string | null = null
    let saved = false
    try {
      if (photo) {
        const blob = await compressBookCover(photo)
        const path = `${book.id}/${Date.now()}.jpg`
        const { error } = await supabase.storage.from('book-covers').upload(path, blob, { contentType: 'image/jpeg' })
        if (error) throw new Error('No se pudo subir la portada. Inténtalo de nuevo.')
        uploadedPath = path
        result.values.cover_url = supabase.storage.from('book-covers').getPublicUrl(path).data.publicUrl
      }
      const { error } = await supabase.from('books').update(result.values).eq('id', book.id).select('id').single()
      if (error) throw new Error('No se pudieron guardar los datos del libro. Inténtalo de nuevo.')
      saved = true
      // Book joins are cached in readings for both people, quotes and the shared list.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['readings'] }),
        queryClient.invalidateQueries({ queryKey: qk.quotes() }),
        queryClient.invalidateQueries({ queryKey: qk.together() }),
        queryClient.invalidateQueries({ queryKey: ['recommendations'] }),
      ])
      toast('Datos del libro actualizados')
      onClose()
      onSaved()
    } catch (error) {
      if (uploadedPath && !saved) await supabase.storage.from('book-covers').remove([uploadedPath])
      setFailure(error instanceof Error ? error.message : 'No se pudieron guardar los datos del libro.')
    } finally {
      saving.current = false
      setBusy(false)
    }
  }

  const field = (key: keyof MetadataDraft, label: string, options: { inputMode?: 'numeric' | 'url'; placeholder?: string } = {}) => (
    <label className="lbl" htmlFor={`${id}-${key}`}>
      {label}
      <input
        id={`${id}-${key}`} name={key} className="input" value={draft[key]}
        inputMode={options.inputMode} placeholder={options.placeholder}
        aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `${id}-${key}-error` : undefined}
        onChange={(event) => change(key, event.target.value)}
      />
      {errors[key] && <span id={`${id}-${key}-error`} className="text-sm text-danger">{errors[key]}</span>}
    </label>
  )

  return (
    <BottomSheet open onClose={() => { if (!saving.current) onClose() }} title="Editar datos del libro" dirty={dirty}>
      <form noValidate autoComplete="off" className="space-y-4" onSubmit={(event) => { void save(event) }}>
        <p className="text-sm text-muted">Estos datos y la portada se comparten con tu pareja.</p>
        <fieldset disabled={busy} className="space-y-4">
          {field('title', 'Título')}
          {field('authors', 'Autores', { placeholder: 'Separa los nombres con comas' })}
          <div className="grid grid-cols-2 gap-3">
            {field('pages', 'Número de páginas', { inputMode: 'numeric', placeholder: 'Opcional' })}
            {field('year', 'Año de publicación', { inputMode: 'numeric', placeholder: 'Opcional' })}
          </div>
          <p className="text-sm text-muted">Cambiar el número de páginas no modifica el total ni el progreso de ninguna lectura. Para ajustar tu total, usa «Editar lectura».</p>
          {field('cover', 'URL de portada', { inputMode: 'url', placeholder: 'https://…' })}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => camera.current?.click()}>Hacer foto</button>
            <button type="button" className="btn btn-secondary" onClick={() => library.current?.click()}>Elegir de Fotos</button>
            <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" aria-label="Hacer una foto de portada" onChange={choosePhoto} />
            <input ref={library} type="file" accept="image/*" className="hidden" aria-label="Elegir foto de portada" onChange={choosePhoto} />
          </div>
          {photo && <p className="text-sm text-muted">Foto seleccionada: {photo.name}. Se subirá al guardar.</p>}
          {(preview || draft.cover.trim()) && (
            <div className="flex items-start gap-3">
              <img src={preview ?? draft.cover.trim()} alt="Vista previa de la portada" className="h-32 w-24 rounded-md object-cover" />
              <button type="button" className="btn btn-ghost" onClick={() => { setPhoto(null); change('cover', '') }}>Quitar portada</button>
            </div>
          )}
          <p className="text-sm text-muted">Las portadas subidas son públicas. No uses fotos con información privada.</p>
        </fieldset>
        {failure && <p role="alert" className="text-sm text-danger">{failure}</p>}
        {!online && <p role="status" className="text-sm text-muted">Sin conexión. Conéctate para guardar los cambios.</p>}
        <button type="submit" className="btn btn-primary w-full" disabled={busy || !online}>{busy ? 'Guardando…' : 'Guardar cambios'}</button>
      </form>
    </BottomSheet>
  )
}
