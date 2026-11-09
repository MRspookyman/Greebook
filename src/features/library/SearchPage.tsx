import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Camera, ChevronRight, Search } from 'lucide-react'
import { Cover } from '@/components/Cover'
import { EmptyState } from '@/components/EmptyState'
import { FilterChips } from '@/components/FilterChips'
import { searchBooks } from '@/lib/books/search'
import { isIsbn, normalizeIsbn, type SearchMode } from '@/lib/books/searchMode'
import type { BookCandidate } from '@/lib/types'
import { AddReadingSheet } from './AddReadingSheet'
import { ManualBookForm } from './ManualBookForm'

// zxing is large; load it only when the camera is opened.
const IsbnScanner = lazy(() => import('./IsbnScanner').then((m) => ({ default: m.IsbnScanner })))

export function SearchPage() {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<SearchMode>('all')
  const input = useRef<HTMLInputElement>(null)
  const [debounced, setDebounced] = useState('')
  const [scanner, setScanner] = useState(false)
  const [manual, setManual] = useState(false)
  const [selected, setSelected] = useState<BookCandidate | null>(null)
  const searchTerm = mode === 'isbn' ? normalizeIsbn(query) : query.trim()
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(searchTerm), 400)
    return () => window.clearTimeout(timeout)
  }, [searchTerm, mode])
  const valid = mode === 'isbn' ? isIsbn(searchTerm) : searchTerm.length >= 3
  const ready = valid && debounced === searchTerm
  const results = useQuery({
    queryKey: ['book-search', mode, debounced],
    queryFn: () => searchBooks(debounced, mode),
    enabled: ready,
    retry: false,
  })
  const waiting = valid && (!ready || results.isPending)
  const emptySearch = ready && (results.isError || (results.isSuccess && results.data.length === 0))
  const searchLabel = mode === 'title' ? 'Título' : mode === 'author' ? 'Autor' : mode === 'isbn' ? 'ISBN' : 'Título, autor o ISBN'
  return (
    <section className="space-y-6">
      <header className="enter flex items-center gap-3">
        <Link to="/biblioteca" className="icon-btn" aria-label="Volver a Biblioteca">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="display">Añadir libro</h1>
      </header>
      <FilterChips
        aria-label="Buscar libros por"
        options={[
          { value: 'all', label: 'Todo' },
          { value: 'title', label: 'Título' },
          { value: 'author', label: 'Autor' },
          { value: 'isbn', label: 'ISBN' },
        ]}
        value={mode}
        onChange={(value) => {
          setMode(value)
          setDebounced('')
          input.current?.focus()
        }}
      />
      <div className="flex items-center gap-2">
        <label className="relative min-w-0 flex-1">
          <Search size={20} className="pointer-events-none absolute top-3 left-0 text-muted" />
          <span className="sr-only">{searchLabel}</span>
          <input
            ref={input}
            className="input rounded-none border-x-0 border-t-0 border-b-rule bg-transparent pl-7"
            type="search"
            inputMode={mode === 'isbn' ? 'numeric' : 'search'}
            name="book-search"
            autoComplete="off"
            spellCheck={false}
            placeholder={mode === 'title' ? 'p. ej. Patria' : mode === 'author' ? 'p. ej. Almudena Grandes' : mode === 'isbn' ? 'ISBN de 10 o 13 cifras' : 'p. ej. Patria o 978…'}
            value={query}
            onChange={(e) => setQuery(mode === 'isbn' ? normalizeIsbn(e.target.value) : e.target.value)}
            autoFocus={window.matchMedia('(pointer: fine)').matches}
          />
        </label>
        <button className="icon-btn" onClick={() => setScanner(true)} aria-label="Escanear ISBN con la cámara">
          <Camera size={22} />
        </button>
      </div>
      <div aria-live="polite">
        {!valid && (
          <p className="py-2 text-sm text-muted">
            {mode === 'isbn' ? 'Escribe el ISBN de 10 o 13 cifras del libro.' : `Busca por ${searchLabel.toLocaleLowerCase('es')}. Escribe al menos 3 caracteres.`}
          </p>
        )}
        {waiting && (
          <div className="space-y-3" role="status">
            <span className="sr-only">Buscando libros…</span>
            {[0, 1, 2].map((n) => (
              <div key={n} className="flex animate-pulse gap-4 rounded-card border border-rule bg-surface p-4">
                <div className="h-[132px] w-[88px] shrink-0 rounded bg-border" />
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
          <ul className="space-y-4">
            {results.data.map((book, index) => (
              <li
                key={`${book.google_id ?? book.openlibrary_key ?? book.title}:${index}`}
                className="overflow-hidden rounded-card border border-rule bg-surface shadow-[var(--paper-shadow)]"
              >
                <button
                  className="pressable flex min-h-44 w-full items-center gap-4 p-4 text-left"
                  onClick={() => setSelected(book)}
                >
                  <Cover book={book} width={88} />
                  <div className="min-w-0 flex-1">
                    <h2 className="line-clamp-2 font-serif text-xl leading-tight">{book.title}</h2>
                    <p className="mt-1 line-clamp-2 text-xs text-muted">
                      {book.authors.join(', ') || 'Autor desconocido'}
                    </p>
                    <p className="text-muted text-sm">
                      {[
                        book.published_year,
                        book.page_count
                          ? `${new Intl.NumberFormat('es').format(book.page_count)} ${book.page_count === 1 ? 'página' : 'páginas'}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden />
                </button>
              </li>
            ))}
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
              setMode('isbn')
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
      <AddReadingSheet
        candidate={selected}
        onClose={() => setSelected(null)}
        onBackfilled={() => {
          setSelected(null)
          setQuery('')
          setDebounced('')
          window.requestAnimationFrame(() => input.current?.focus())
        }}
      />
    </section>
  )
}
