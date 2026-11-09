import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { Plus, Search } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { useMe } from '@/features/auth/me'
import { useQuotes } from '@/lib/data'
import { QuoteCard } from './QuoteCard'
import { QuoteSheet } from './QuoteSheet'
import { markQuotesSeen, useUnseenQuotes } from './quotes'
import { normalizeQuoteSearch } from './search'

type Filter = 'all' | 'theirs' | 'mine' | `book:${string}`

/** The wall: every sentence and note you leave each other, each on its page. */
export function CitasPage() {
  const { userId, partner } = useMe()
  const query = useQuotes()
  const quotes = query.data ?? []
  const [filter, setFilter] = useState<Filter>('all')
  const [params, setParams] = useSearchParams()
  // «Nueva cita» from the home-screen shortcut opens the composer straight away.
  const [composing, setComposing] = useState(() => params.get('nueva') === '1')
  useEffect(() => {
    if (params.get('nueva') !== '1') return
    setParams((previous) => {
      previous.delete('nueva')
      return previous
    }, { replace: true })
  }, [params, setParams])
  const [search, setSearch] = useState('')
  const location = useLocation()
  const unseen = useUnseenQuotes()
  const marking = useRef(new Set<string>())
  const books = [...new Map(quotes.map((q) => [q.book_id, q.book] as const)).values()]
  const needle = normalizeQuoteSearch(search)
  const visible = quotes.filter(
    (q) =>
      (filter === 'all' ||
        (filter === 'theirs' && q.user_id !== userId) ||
        (filter === 'mine' && q.user_id === userId) ||
        filter === `book:${q.book_id}`) &&
      (!needle || normalizeQuoteSearch([q.body, q.comment, q.book.title].filter(Boolean).join(' ')).includes(needle)),
  )

  // Opening the wall is reading it: what's new from your partner stops being new.
  const pending = unseen.quoteIds.filter((id) => !marking.current.has(id)).join(',')
  useEffect(() => {
    if (!pending) return
    const ids = pending.split(',')
    ids.forEach((id) => marking.current.add(id))
    const timer = window.setTimeout(() => {
      void markQuotesSeen(ids).catch(() => ids.forEach((id) => marking.current.delete(id)))
    }, 1500)
    return () => window.clearTimeout(timer)
  }, [pending])

  useEffect(() => {
    if (!location.hash.startsWith('#c-') || !quotes.length) return
    const frame = requestAnimationFrame(() =>
      document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'center' }),
    )
    return () => cancelAnimationFrame(frame)
  }, [location.hash, quotes.length])

  const chip = (value: Filter, label: string) => (
    <button
      key={value}
      type="button"
      className="chip flex-none"
      aria-pressed={filter === value}
      onClick={() => setFilter(value)}
    >
      {label}
    </button>
  )

  return (
    <div className="space-y-6">
      <header className="enter flex min-h-11 items-center justify-between gap-3">
        <h1 className="display">Citas</h1>
        <button type="button" className="btn btn-primary min-h-11 px-4 text-sm" onClick={() => setComposing(true)}>
          <Plus size={18} aria-hidden /> Nueva
        </button>
      </header>
      {quotes.length > 0 && (
        <div className="space-y-3">
          <label className="relative block">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted"
              size={18}
              aria-hidden
            />
            <span className="sr-only">Buscar citas</span>
            <input
              id="quotes-search"
              type="search"
              className="input pl-10"
              placeholder="Buscar frase, comentario o libro"
              autoComplete="off"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div
            className="no-scrollbar fade-x -mx-5 flex gap-2 overflow-x-auto px-5"
            role="group"
            aria-label="Filtrar citas"
          >
            {chip('all', 'Todas')}
            {partner && chip('theirs', `De ${partner.display_name}`)}
            {chip('mine', 'Mías')}
            {books.map((book) => chip(`book:${book.id}`, book.title))}
          </div>
        </div>
      )}
      {query.isPending ? (
        <div className="h-40 animate-pulse rounded-[22px] bg-sunk" role="status" aria-label="Cargando citas" />
      ) : query.isError && !query.data ? (
        <div role="alert" className="space-y-3">
          <p className="text-danger">No se pudieron cargar las citas.</p>
          <button className="btn btn-outline" onClick={() => void query.refetch()}>
            Reintentar
          </button>
        </div>
      ) : visible.length === 0 ? (
        <EmptyState title={quotes.length ? 'Nada con este filtro' : 'Aún no hay ninguna cita'}>
          <p className="text-muted">
            Cuando una frase te guste, guárdala con su página si la conoces
            {partner ? ` y ${partner.display_name} la verá` : ''}.
          </p>
          <button className="btn btn-primary mt-2" onClick={() => setComposing(true)}>
            Guardar la primera
          </button>
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {visible.map((quote, index) => (
            <div key={quote.id} className="enter" style={{ '--i': Math.min(index, 6) } as CSSProperties}>
              <QuoteCard quote={quote} />
            </div>
          ))}
        </div>
      )}
      <QuoteSheet open={composing} onClose={() => setComposing(false)} />
    </div>
  )
}
