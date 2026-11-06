import { lazy, Suspense, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Camera, Search } from 'lucide-react'
import { Cover } from '@/components/Cover'
import { EmptyState } from '@/components/EmptyState'
import { lookupIsbn, searchBooks } from '@/lib/books/search'
import type { BookCandidate } from '@/lib/types'
import { AddReadingSheet } from './AddReadingSheet'
import { ManualBookForm } from './ManualBookForm'

// zxing is large; load it only when the camera is opened.
const IsbnScanner = lazy(() => import('./IsbnScanner').then((m) => ({ default: m.IsbnScanner })))

export function SearchPage() {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [scanner, setScanner] = useState(false)
  const [manual, setManual] = useState(false)
  const [selected, setSelected] = useState<BookCandidate | null>(null)
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
  return (
    <section className="space-y-5">
      <header className="flex items-center gap-3">
        <Link to="/biblioteca" className="btn btn-ghost" aria-label="Volver a Biblioteca">
          <ArrowLeft size={22} />
        </Link>
        <h1>Buscar un libro</h1>
      </header>
      <div className="flex items-center gap-2">
        <label className="relative flex-1">
          <Search size={20} className="absolute left-3 top-3 text-muted" />
          <span className="sr-only">Título, autor o ISBN</span>
          <input
            className="input pl-10"
            type="search"
            placeholder="Título, autor o ISBN"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </label>
        <button className="btn btn-secondary" onClick={() => setScanner(true)} aria-label="Escanear ISBN con la cámara">
          <Camera size={22} />
        </button>
      </div>
      <div aria-live="polite">
        {query.trim().length < 3 && <p className="text-muted">Escribe al menos 3 caracteres para buscar.</p>}
        {waiting && (
          <div className="space-y-3" role="status">
            <span className="sr-only">Buscando libros…</span>
            {[0, 1, 2].map((n) => (
              <div key={n} className="card flex gap-4 animate-pulse">
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
          <ul className="space-y-3">
            {results.data.map((book, index) => (
              <li key={`${book.google_id ?? book.openlibrary_key ?? book.title}:${index}`}>
                <button className="card w-full flex gap-4 text-left items-center" onClick={() => setSelected(book)}>
                  <Cover book={book} width={64} />
                  <div className="min-w-0">
                    <h2 className="text-lg">{book.title}</h2>
                    <p className="text-muted text-sm">{book.authors.join(', ') || 'Autor desconocido'}</p>
                    <p className="text-muted text-sm">
                      {[book.published_year, book.page_count ? `${book.page_count} páginas` : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button className="btn btn-ghost w-full" onClick={() => setManual(true)}>
        Añadir un libro a mano
      </button>
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
