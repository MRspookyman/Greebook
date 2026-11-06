import { useState, type SubmitEvent } from 'react'
import { z } from 'zod'
import { BottomSheet } from '@/components/BottomSheet'
import type { BookCandidate } from '@/lib/types'

const optionalPositiveInteger = z.union([
  z.literal('').transform(() => null),
  z.coerce.number().int().positive().max(2147483647),
])
const manualSchema = z.object({
  title: z.string().trim().min(1, 'Escribe el título'),
  authors: z.string(),
  pages: optionalPositiveInteger,
  year: optionalPositiveInteger,
  cover: z.union([z.literal(''), z.url().refine((value) => /^https?:\/\//i.test(value), 'Usa una URL http o https')]),
})

export function ManualBookForm({
  open,
  onClose,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  onSelect: (book: BookCandidate) => void
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Añadir a mano">
      <ManualFields onSelect={onSelect} />
    </BottomSheet>
  )
}

function ManualFields({ onSelect }: { onSelect: (book: BookCandidate) => void }) {
  const [error, setError] = useState('')
  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget))
    const result = manualSchema.safeParse(values)
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Revisa los datos del libro')
      return
    }
    const book = result.data
    onSelect({
      title: book.title,
      authors: book.authors
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      page_count: book.pages,
      published_year: book.year,
      cover_url: book.cover || null,
      google_id: null,
      isbn13: null,
      openlibrary_key: null,
      description: null,
    })
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-muted">Los libros que no encuentras también tienen sitio aquí.</p>
      <label className="label">
        <span className="lbl mb-2 block">Título</span>
        <input className="input" name="title" placeholder="El título del libro" required autoFocus />
      </label>
      <label className="label">
        <span className="lbl mb-2 block">Autoría</span>
        <input className="input" name="authors" placeholder="Autores separados por comas" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="label">
          <span className="lbl mb-2 block">Páginas</span>
          <input
            className="input"
            name="pages"
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            placeholder="Opcional"
          />
        </label>
        <label className="label">
          <span className="lbl mb-2 block">Año</span>
          <input
            className="input"
            name="year"
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            placeholder="Opcional"
          />
        </label>
      </div>
      <label className="label">
        <span className="lbl mb-2 block">Portada · opcional</span>
        <input className="input" name="cover" type="url" placeholder="https://…" />
      </label>
      {error && (
        <p className="text-danger" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn-primary w-full">Continuar</button>
    </form>
  )
}
