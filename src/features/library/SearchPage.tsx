import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Camera, Check, Play, Plus, Search } from 'lucide-react'
import { Cover } from '@/components/Cover'
import { EmptyState } from '@/components/EmptyState'
import { toast } from '@/components/toast'
import { useMe } from '@/features/auth/me'
import { lookupIsbn, searchBooks } from '@/lib/books/search'
import { qk } from '@/lib/data'
import type { BookCandidate } from '@/lib/types'
import { AddReadingSheet } from './AddReadingSheet'
import { addReading, AlreadyInLibrary, removeReading } from './addReading'
import { ManualBookForm } from './ManualBookForm'

const keyOf = (book: BookCandidate) => book.google_id ?? book.openlibrary_key ?? `${book.title}:${book.authors.join()}`

// zxing is large; load it only when the camera is opened.
const IsbnScanner = lazy(() => import('./IsbnScanner').then((m) => ({ default: m.IsbnScanner })))

export function SearchPage() {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [scanner, setScanner] = useState(false)
  const [manual, setManual] = useState(false)
  const [selected, setSelected] = useState<BookCandidate | null>(null)
  const [added, setAdded] = useState<Record<string, string>>({})
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const { userId } = useMe()
  const qc = useQueryClient()
  const navigate = useNavigate()
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(query.trim()), 400)
    return () => window.clearTimeout(timeout)
  }, [query])
  const ready = debounced.length >= 3 && debounced === query.trim()
  const results = useQuery({
    queryKey: ['book-search', debounced],
    queryFn: () => (/^97[89]\d{10}$/.test(debounced) ? lookupIsbn(debounced) : searchBooks(debounced)),
    enabled: ready,
    retry: false,
  })
  const waiting = query.trim().length >= 3 && (!ready || results.isPending)

  /** One tap: paper, with the page count the catalogue gave us. */
  async function quickAdd(book: BookCandidate, status: 'want' | 'reading') {
    const key = keyOf(book)
    if (busyKey || !book.page_count) return
    setBusyKey(key)
    try {
      const id = await addReading({ userId, candidate: book, format: 'paper', total: book.page_count, status })
      await qc.invalidateQueries({ queryKey: qk.readings(userId) })
      if (status === 'reading') {
        toast('Empiezas hoy', book.title)
        navigate(`/leer/${id}`)
        return
      }
      setAdded((current) => ({ ...current, [key]: id }))
      toast('Añadido a Pendientes', book.title, {
        label: 'Deshacer',
        run: () => void undo(book, id),
      })
    } catch (cause) {
      if (cause instanceof AlreadyInLibrary) {
        toast(cause.message)
        navigate(`/libro/${cause.readingId}`)
        return
      }
      toast('No se pudo añadir el libro', 'Comprueba tu conexión e inténtalo de nuevo.')
    } finally {
      setBusyKey(null)
    }
  }

  async function undo(book: BookCandidate, id: string) {
    try {
      await removeReading(id)
      setAdded((current) => {
        const next = { ...current }
        delete next[keyOf(book)]
        return next
      })
      await qc.invalidateQueries({ queryKey: qk.readings(userId) })
    } catch {
      toast('No se pudo deshacer', 'Puedes quitarlo desde su ficha.')
    }
  }
  const emptySearch = ready && (results.isError || (results.isSuccess && results.data.length === 0))
  return (
    <section className="space-y-6">
      <header className="enter flex items-center gap-3">
        <Link to="/biblioteca" className="icon-btn" aria-label="Volver a Estantería">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="display">Añadir libro</h1>
      </header>
      <div className="flex items-center gap-2">
        <label className="relative min-w-0 flex-1">
          <Search size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
          <span className="sr-only">Título, autor o ISBN</span>
          <input
            className="input pl-10"
            type="search"
            name="book-search"
            autoComplete="off"
            spellCheck={false}
            placeholder="p. ej. Patria o 978…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus={window.matchMedia('(pointer: fine)').matches}
          />
        </label>
        <button className="icon-btn" onClick={() => setScanner(true)} aria-label="Escanear ISBN con la cámara">
          <Camera size={22} />
        </button>
      </div>
      <div aria-live="polite">
        {query.trim().length < 3 && (
          <p className="py-2 text-sm text-muted">Busca por título, autor o ISBN. Escribe al menos 3 caracteres.</p>
        )}
        {waiting && (
          <div className="space-y-3" role="status">
            <span className="sr-only">Buscando libros…</span>
            {[0, 1, 2].map((n) => (
              <div key={n} className="flex animate-pulse gap-4 border-b border-rule py-4">
                <div className="bg-border w-16 h-24 rounded" />
                <div className="flex-1 space-y-3 py-2">
                  <div className="bg-border h-5 w-3/4 rounded" />
                  <div className="bg-border h-4 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}
        {ready && !results.isPending && results.isError && (
          <EmptyState title="No se pudo completar la búsqueda">
            <p className="text-muted">Comprueba tu conexión o añade el libro a mano.</p>
            <button className="btn btn-secondary" onClick={() => void results.refetch()}>
              Reintentar
            </button>
            <button className="btn btn-primary" onClick={() => setManual(true)}>
              Añadir a mano
            </button>
          </EmptyState>
        )}
        {ready && results.isSuccess && results.data.length === 0 && (
          <EmptyState title="No lo encuentro. ¿Lo añades a mano?">
            <button className="btn btn-primary" onClick={() => setManual(true)}>
              Añadir a mano
            </button>
          </EmptyState>
        )}
        {ready && results.isSuccess && results.data.length > 0 && (
          <ul>
            {results.data.map((book, index) => {
              const key = keyOf(book)
              const addedId = added[key]
              const pages = book.page_count
              return (
                <li key={`${key}:${index}`} className="border-b border-rule py-4">
                  <div className="flex gap-4">
                    <button
                      type="button"
                      className="pressable flex-none self-start"
                      onClick={() => setSelected(book)}
                      aria-label={`Más opciones para «${book.title}»`}
                    >
                      <Cover book={book} width={64} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <h2 className="line-clamp-2 font-serif text-[19px] leading-tight">{book.title}</h2>
                      <p className="mt-1 line-clamp-1 text-[13px] text-muted">
                        {book.authors.join(', ') || 'Autor desconocido'}
                      </p>
                      <p className="text-[13px] text-muted">
                        {[
                          book.published_year,
                          pages
                            ? `${new Intl.NumberFormat('es').format(pages)} ${pages === 1 ? 'página' : 'páginas'}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      {addedId ? (
                        <p className="mt-2 flex min-h-11 items-center gap-2 text-[14px]" role="status">
                          <Check size={16} className="text-accent" aria-hidden />
                          En Pendientes
                          <button
                            type="button"
                            className="btn btn-link ml-1 px-1"
                            onClick={() => void undo(book, addedId)}
                          >
                            Deshacer
                          </button>
                        </p>
                      ) : (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {pages ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-outline gap-1 px-2.5 text-[14px]"
                                disabled={busyKey !== null}
                                onClick={() => void quickAdd(book, 'reading')}
                              >
                                <Play size={14} aria-hidden />
                                Empezar ya
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline gap-1 px-2.5 text-[14px]"
                                disabled={busyKey !== null}
                                onClick={() => void quickAdd(book, 'want')}
                              >
                                <Plus size={16} aria-hidden />
                                A pendientes
                              </button>
                            </>
                          ) : null}
                          <button type="button" className="btn btn-link px-1" onClick={() => setSelected(book)}>
                            {pages ? 'Más opciones' : 'Añadir…'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      {!emptySearch && (
        <button className="btn btn-link w-full" onClick={() => setManual(true)}>
          Añadir un libro a mano
        </button>
      )}
      {scanner && (
        <Suspense fallback={null}>
          <IsbnScanner
            open
            onClose={() => setScanner(false)}
            onScan={(isbn) => {
              setScanner(false)
              setQuery(isbn)
              setDebounced(isbn)
            }}
          />
        </Suspense>
      )}
      <ManualBookForm
        open={manual}
        onClose={() => setManual(false)}
        onSelect={(book) => {
          setManual(false)
          setSelected(book)
        }}
      />
      <AddReadingSheet candidate={selected} onClose={() => setSelected(null)} />
    </section>
  )
}
