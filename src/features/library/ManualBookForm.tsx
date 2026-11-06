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
      <label className="label">
        Título
        <input className="input" name="title" required autoFocus />
      </label>
      <label className="label">
        Autores (separados por comas)
        <input className="input" name="authors" />
      </label>
      <label className="label">
        Páginas
        <input className="input" name="pages" type="number" min="1" step="1" />
      </label>
      <label className="label">
        Año de publicación
        <input className="input" name="year" type="number" min="1" step="1" />
      </label>
      <label className="label">
        URL de portada (opcional)
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
