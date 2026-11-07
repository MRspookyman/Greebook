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
  const [dirty, setDirty] = useState(false)
  return (
    <BottomSheet
      open={open}
      onClose={() => {
        setDirty(false)
        onClose()
      }}
      title="Añadir a mano"
      dirty={dirty}
    >
      <div onChangeCapture={() => setDirty(true)}>
        <ManualFields
          onSelect={(book) => {
            setDirty(false)
            onSelect(book)
          }}
        />
      </div>
    </BottomSheet>
  )
}

function ManualFields({ onSelect }: { onSelect: (book: BookCandidate) => void }) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget))
    const result = manualSchema.safeParse(values)
    if (!result.success) {
      const next: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const field = String(issue.path[0])
        next[field] ??=
          field === 'pages' || field === 'year'
            ? 'Indica un número entero mayor que cero.'
            : field === 'cover'
              ? 'Usa una dirección completa que empiece por https:// o http://.'
              : issue.message
      }
      setErrors(next)
      event.currentTarget.querySelector<HTMLInputElement>(`[name="${Object.keys(next)[0]}"]`)?.focus()
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
    <form onSubmit={submit} className="space-y-4" autoComplete="off" noValidate>
      <p className="text-sm text-muted">Los libros que no encuentras también tienen sitio aquí.</p>
      <label className="label">
        <span className="lbl mb-2 block">Título</span>
        <input
          className="input"
          name="title"
          placeholder="p. ej. Patria…"
          required
          autoFocus={window.matchMedia('(pointer: fine)').matches}
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? 'manual-title-error' : undefined}
        />
        {errors.title && (
          <span id="manual-title-error" role="alert" className="mt-2 block text-sm text-danger">
            {errors.title}
          </span>
        )}
      </label>
      <label className="label">
        <span className="lbl mb-2 block">Autoría</span>
        <input className="input" name="authors" placeholder="p. ej. Fernando Aramburu…" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="label">
          <span className="lbl mb-2 block">Páginas · opcional</span>
          <input
            className="input"
            name="pages"
            aria-invalid={!!errors.pages}
            aria-describedby={errors.pages ? 'manual-pages-error' : undefined}
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            placeholder="p. ej. 320…"
          />
          {errors.pages && (
            <span id="manual-pages-error" role="alert" className="mt-2 block text-sm text-danger">
              {errors.pages}
            </span>
          )}
        </label>
        <label className="label">
          <span className="lbl mb-2 block">Año · opcional</span>
          <input
            className="input"
            name="year"
            aria-invalid={!!errors.year}
            aria-describedby={errors.year ? 'manual-year-error' : undefined}
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            placeholder="p. ej. 2024…"
          />
          {errors.year && (
            <span id="manual-year-error" role="alert" className="mt-2 block text-sm text-danger">
              {errors.year}
            </span>
          )}
        </label>
      </div>
      <label className="label">
        <span className="lbl mb-2 block">Portada · opcional</span>
        <input
          className="input"
          name="cover"
          type="url"
          placeholder="https://ejemplo.com/portada…"
          aria-invalid={!!errors.cover}
          aria-describedby={errors.cover ? 'manual-cover-error' : undefined}
        />
        {errors.cover && (
          <span id="manual-cover-error" role="alert" className="mt-2 block text-sm text-danger">
            {errors.cover}
          </span>
        )}
      </label>
      <button className="btn btn-primary w-full">Continuar</button>
    </form>
  )
}
