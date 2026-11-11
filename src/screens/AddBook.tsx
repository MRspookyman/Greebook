import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { addBook, findBook, placeBookmark, type NewBook, type Placement } from '@/lib/actions'
import { searchBooks, type Found } from '@/lib/books/search'
import { getMe } from '@/lib/sync/store'
import type { Book } from '@/lib/types'
import { usePeople } from '@/session'
import { Cover } from '@/ui/Book'
import { CoverPhoto } from '@/ui/CoverPhoto'
import { Back, Search } from '@/ui/icons'
import { PlacementForm } from '@/ui/Placement'
import { Sheet } from '@/ui/Sheet'
import { useBack } from '@/ui/useBack'
import { toast } from '@/ui/toast'

/** A found book dressed as one, to draw its cover before it exists. */
const preview = (found: NewBook & { key?: string }): Book => ({
  ...found, id: found.key ?? found.title, added_by: getMe(), created_at: '', updated_at: '', deleted_at: null,
})

/** Bring a book into the room: look it up, or write it in by hand. */
export function AddBook() {
  const { db, partner } = usePeople()
  const navigate = useNavigate()
  const back = useBack()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Found[] | null>(null)
  const [state, setState] = useState<'idle' | 'searching' | 'failed'>('idle')
  const [picked, setPicked] = useState<NewBook | null>(null)
  const [byHand, setByHand] = useState(false)

  useEffect(() => {
    const text = query.trim()
    if (text.length < 3) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setState('searching')
      searchBooks(text, controller.signal)
        .then((found) => {
          setResults(found)
          setState('idle')
        })
        .catch(() => {
          if (!controller.signal.aborted) setState('failed')
        })
    }, 420)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  const pick = (book: NewBook) => {
    const existing = findBook(book)
    if (existing && Object.values(db.readings).some((reading) =>
      reading.book_id === existing.id && reading.user_id === getMe() && !reading.deleted_at,
    )) {
      toast('Ya lo tienes en tu lado.')
      navigate(`/libro/${existing.id}`, { replace: true })
      return
    }
    setPicked(book)
  }

  const place = (placement: Placement) => {
    if (!picked) return
    const book = addBook(picked)
    placeBookmark(book, placement)
    navigate(`/libro/${book.id}`, { replace: true })
  }
  // Fewer than three letters is not a search yet: whatever was found before no longer applies.
  const searching = query.trim().length >= 3
  const already = picked ? findBook(picked) : undefined
  const theirs = already && Object.values(db.readings).find((r) => r.book_id === already.id && r.user_id !== getMe() && !r.deleted_at)

  return (
    <main className="fade mx-auto min-h-dvh max-w-xl px-5 pb-28" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 10px)' }}>
      <button className="icon-btn -ml-2" aria-label="Volver" onClick={back}>
        <Back />
      </button>
      <h1 className="display mt-2">¿Qué libro traes?</h1>

      <label className="relative mt-6 block">
        <span className="sr-only">Título o autor</span>
        <Search className="quiet absolute top-1/2 left-4 -translate-y-1/2" size={20} />
        <input
          className="field !pl-12"
          type="search"
          enterKeyHint="search"
          autoFocus
          placeholder="Título o autor"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
      </label>

      <div className="mt-5" aria-live="polite">
        {searching && state === 'searching' && <p className="quiet">Buscando…</p>}
        {searching && state === 'failed' && <p className="quiet">No he podido buscar (¿sin conexión?). Puedes escribirlo a mano.</p>}
        {searching && state === 'idle' && results?.length === 0 && <p className="quiet">No lo encuentro. Puedes escribirlo a mano.</p>}
      </div>

      <ul className="mt-1 flex flex-col">
        {(searching ? results : null)?.map((found) => (
          <li key={found.key}>
            <button
              type="button"
              className="pressable flex w-full items-center gap-4 border-b border-rule py-3 text-left"
              onClick={() => pick(found)}
            >
              <Cover book={preview(found)} width={46} />
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 block text-[18.5px] leading-tight">{found.title}</span>
                <span className="quiet block truncate text-[15px] italic">{found.author}</span>
                <span className="quiet block text-[15px]">
                  {[found.year, found.pages && `${found.pages} páginas`].filter(Boolean).join(' · ')}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <button className="btn btn-text -ml-2 mt-4" onClick={() => setByHand(true)}>
        Escribirlo a mano
      </button>

      <Sheet open={byHand} onClose={() => setByHand(false)} title="A mano">
        {byHand && (
          <ByHand
            title={query.trim()}
            onDone={(book) => {
              setByHand(false)
              pick(book)
            }}
          />
        )}
      </Sheet>

      <Sheet open={!!picked} onClose={() => setPicked(null)} title={picked?.title}>
        {picked && (
          <>
            {theirs && partner && (
              <p className="mb-5 rounded-[14px] bg-ink/5 px-4 py-3 text-[16px]">
                {partner.name} ya lo tiene en vuestra estantería. Será el mismo libro, con tu cinta al lado de la suya.
              </p>
            )}
            <PlacementForm pages={already?.pages ?? picked.pages} onDone={place} />
          </>
        )}
      </Sheet>
    </main>
  )
}

function ByHand({ title: initial, onDone }: { title: string; onDone: (book: NewBook) => void }) {
  const [title, setTitle] = useState(initial)
  const [author, setAuthor] = useState('')
  const [cover, setCover] = useState<string | null>(null)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (title.trim()) onDone({ title: title.trim(), author: author.trim(), cover_url: cover, pages: null, year: null, isbn: null })
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label className="label" htmlFor="hand-title">
          Título
        </label>
        <input id="hand-title" className="field" required maxLength={300} value={title} onChange={(e) => setTitle(e.currentTarget.value)} />
      </div>
      <div>
        <label className="label" htmlFor="hand-author">
          Quién lo escribió
        </label>
        <input id="hand-author" className="field" maxLength={300} value={author} onChange={(e) => setAuthor(e.currentTarget.value)} />
      </div>
      <CoverPhoto book={{ id: title || 'libro', title: title || 'Título', author, pages: null }} value={cover} onChange={setCover} />
      <button className="btn btn-primary mt-2" disabled={!title.trim()}>
        Seguir
      </button>
    </form>
  )
}
