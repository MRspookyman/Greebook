import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/newsreader/opsz.css'
import '@fontsource-variable/newsreader/opsz-italic.css'
import '@fontsource/caveat/latin-500.css'
import '../../../src/styles/theme.css'
import '../../../src/styles/room.css'
import { Cover } from '../../../src/ui/Book'
import { Shelf } from '../../../src/ui/Shelf'
import { BookOpen, Chevron, Close, Covers, Flame, Paper, Plus, Search, Spines } from '../../../src/ui/icons'
import type { Book } from '../../../src/lib/types'
import './mockup.css'

// An isolated visual proposal. The same titles and bindings as the app's rehearsal;
// no session, database, service worker, or changes to the user's collection.
type Owner = 'me' | 'you' | 'both'
type Entry = { book: Book; owner: Owner; year: number; rating: number }
type Whose = 'all' | Owner
type Order = 'year' | 'title' | 'author' | 'rating'
const uuid = (n: number) => `00000001-0000-4000-8000-${String(n).padStart(12, '0')}`
function book(n: number, title: string, author: string, pages: number): Book {
  return {
    id: uuid(n),
    title,
    author,
    pages,
    cover_url: null,
    year: null,
    isbn: null,
    added_by: 'mockup',
    created_at: '',
    updated_at: '',
    deleted_at: null,
  }
}
const rows: Array<[string, string, number, Owner, number]> = [
  ['Nada', 'Carmen Laforet', 256, 'me', 2025],
  ['Pedro Páramo', 'Juan Rulfo', 128, 'both', 2025],
  ['El camino', 'Miguel Delibes', 224, 'you', 2025],
  ['Tea Rooms', 'Luisa Carnés', 256, 'me', 2025],
  ['La sombra del viento', 'Carlos Ruiz Zafón', 576, 'both', 2025],
  ['Distancia de rescate', 'Samanta Schweblin', 128, 'me', 2026],
  ['Los detectives salvajes', 'Roberto Bolaño', 624, 'you', 2026],
  ['Canto yo y la montaña baila', 'Irene Solà', 192, 'both', 2026],
  ['El infinito en un junco', 'Irene Vallejo', 452, 'me', 2026],
  ['La uruguaya', 'Pedro Mairal', 144, 'you', 2026],
  ['Temporada de huracanes', 'Fernanda Melchor', 232, 'both', 2026],
  ['Panza de burro', 'Andrea Abreu', 176, 'me', 2026],
  ['Patria', 'Fernando Aramburu', 648, 'you', 2026],
]
const entries = rows.map(([title, author, pages, owner, year], i): Entry => ({
  book: book(i + 1, title, author, pages),
  owner,
  year,
  rating: 3 + ((i + 1) % 3),
}))
const pending = book(51, 'La ciudad y los perros', 'Mario Vargas Llosa', 480)
const plain = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
const ribbons = (owner: Owner) =>
  owner === 'both' ? ['var(--me)', 'var(--you)'] : [owner === 'me' ? 'var(--me)' : 'var(--you)']

function Sprig({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 80 120" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.05" strokeLinecap="round" strokeLinejoin="round">
        <path d="M36 114c-10-34-9-62 8-94M31 93C14 90 10 76 13 66c13 4 19 15 18 27ZM31 73c18-2 28-15 28-27-15 3-26 13-28 27ZM36 52C21 49 17 36 20 26c13 4 17 15 16 26ZM42 32c15-3 21-15 19-25-13 5-18 13-19 25Z" />
        <path d="M35 111c12-12 25-18 35-20M52 97c-2-10 3-19 11-22 3 11-1 18-11 22Z" opacity=".6" />
      </g>
    </svg>
  )
}

function Dots({ owner }: { owner: Owner }) {
  return (
    <span className="shelf-dots" aria-hidden="true">
      {ribbons(owner).map((color) => (
        <i key={color} style={{ background: color }} />
      ))}
    </span>
  )
}

function PreviewBook({ selected, onClose }: { selected: Book | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (selected) ref.current?.showModal()
    else ref.current?.close()
  }, [selected])
  return (
    <dialog ref={ref} className="shelf-book-dialog" onCancel={onClose} onClose={onClose}>
      {selected && (
        <>
          <button className="shelf-dialog-close" aria-label="Cerrar libro" onClick={onClose}>
            <Close size={22} />
          </button>
          <Cover book={selected} width={118} />
          <h2>{selected.title}</h2>
          <p>{selected.author}</p>
          <span>{selected.pages} páginas</span>
          <button className="shelf-back" onClick={onClose}>
            Volver a la estantería
          </button>
        </>
      )}
    </dialog>
  )
}

function Mockup() {
  const [whose, setWhose] = useState<Whose>('all')
  const [query, setQuery] = useState('')
  const [order, setOrder] = useState<Order>('year')
  const [view, setView] = useState<'lomos' | 'portadas'>('lomos')
  const [selected, setSelected] = useState<Book | null>(null)
  const [folded, setFolded] = useState<Record<string, boolean>>({ '2025': true })
  const matches = (book: Book) => plain(`${book.title} ${book.author}`).includes(plain(query.trim()))
  const owned = (owner: Owner) =>
    whose === 'all' || (whose === 'both' ? owner === 'both' : owner === whose || owner === 'both')
  const filtered = entries.filter((entry) => matches(entry.book) && owned(entry.owner))
  const groups =
    order === 'year'
      ? [2026, 2025]
          .map((year) => ({ label: String(year), entries: filtered.filter((entry) => entry.year === year) }))
          .filter((group) => group.entries.length)
      : [
          {
            label: 'Leídos',
            entries: [...filtered].sort((a, b) =>
              order === 'rating' ? b.rating - a.rating : a.book[order].localeCompare(b.book[order], 'es'),
            ),
          },
        ].filter((group) => group.entries.length)
  const waiting = owned('you') && matches(pending)
  const searching = Boolean(query.trim())

  const cabinet = (group: (typeof groups)[number], index: number) => {
    const open = searching || !folded[group.label]
    return (
      <section
        key={group.label}
        className={`shelf-cabinet ${index === 0 ? 'shelf-cabinet--first' : 'shelf-cabinet--archive'} ${open ? '' : 'is-folded'}`}
      >
        <div className="shelf-cabinet-heading">
          <button
            className="shelf-year"
            aria-expanded={open}
            aria-controls={`collection-${group.label}`}
            onClick={() => setFolded({ ...folded, [group.label]: open })}
          >
            <span className="shelf-year-name">
              {group.label}
              <span className="shelf-year-star" aria-hidden="true">
                ✧
              </span>
            </span>
            <span className="shelf-year-count">
              {group.entries.length} {group.entries.length === 1 ? 'libro' : 'libros'}
              <span aria-hidden="true"> · </span>
              <span>{group.label === '2026' && whose === 'all' && !searching ? '46 noches' : 'historias vividas'}</span>
            </span>
            <Chevron size={17} />
          </button>
          {index === 0 && (
            <div className="shelf-views" role="group" aria-label="Cómo ver la estantería">
              <button aria-label="Ver los lomos" aria-pressed={view === 'lomos'} onClick={() => setView('lomos')}>
                <Spines size={20} />
              </button>
              <button
                aria-label="Ver las portadas"
                aria-pressed={view === 'portadas'}
                onClick={() => setView('portadas')}
              >
                <Covers size={20} />
              </button>
            </div>
          )}
        </div>
        {open && (
          <div id={`collection-${group.label}`} className="shelf-collection">
            <Shelf
              view={view}
              items={group.entries.map((entry) => ({
                book: entry.book,
                ribbons: ribbons(entry.owner),
                ratings: [{ color: ribbons(entry.owner)[0], stars: entry.rating }],
              }))}
              onOpen={setSelected}
            />
          </div>
        )}
      </section>
    )
  }

  return (
    <>
      <main className="room shelf-proposal">
        <header className="room-header shelf-date">
          <span className="room-date">VIERNES, 13 DE NOVIEMBRE</span>
          <BookOpen className="room-mark" size={17} />
        </header>
        <div className="shelf-heading">
          <div>
            <h1>
              La <em>estantería</em>
            </h1>
            <p>Historias que se quedan.</p>
          </div>
          <a className="room-add shelf-add" href="/anadir" aria-label="Añadir un libro en la app">
            <Plus size={21} />
          </a>
        </div>
        <div className="shelf-owners" role="group" aria-label="De quién son los libros">
          {(
            [
              ['all', 'Todos'],
              ['both', 'Los dos'],
              ['me', 'Tú'],
              ['you', 'Javier'],
            ] as const
          ).map(([value, label]) => (
            <button key={value} aria-pressed={whose === value} onClick={() => setWhose(value)}>
              {value !== 'all' && <Dots owner={value} />}
              {label}
            </button>
          ))}
        </div>
        <div className="shelf-tools">
          <label className="shelf-search">
            <Search size={18} />
            <span className="sr-only">Buscar título o autor</span>
            <input
              type="search"
              placeholder="Título o autor"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              enterKeyHint="search"
            />
          </label>
          <label className="shelf-order">
            <span className="sr-only">Ordenar libros</span>
            <select value={order} onChange={(e) => setOrder(e.target.value as Order)}>
              <option value="year">Por año</option>
              <option value="title">Por título</option>
              <option value="author">Por autor</option>
              <option value="rating">Valoración</option>
            </select>
            <Chevron size={13} />
          </label>
        </div>
        {groups[0] && cabinet(groups[0], 0)}
        {waiting && (
          <section className="shelf-waiting" aria-labelledby="shelf-waiting-title">
            <header>
              <h2 id="shelf-waiting-title">
                Por descubrir<span aria-hidden="true">…</span>
              </h2>
              <span>1 LIBRO POR LEER</span>
            </header>
            <button className="shelf-next-book" onClick={() => setSelected(pending)}>
              <span className="shelf-next-cover">
                <Cover book={pending} width={77} />
              </span>
              <span className="shelf-next-copy">
                <span className="shelf-next-owner">
                  <Dots owner="you" />
                  En la pila de Javier
                </span>
                <strong>{pending.title}</strong>
                <em>{pending.author}</em>
                <span className="shelf-next-action">
                  Abrir el libro <span aria-hidden="true">↗</span>
                </span>
              </span>
              <Sprig className="shelf-next-sprig" />
            </button>
          </section>
        )}
        {groups.slice(1).map((group, index) => cabinet(group, index + 1))}
        {!filtered.length && !waiting && (
          <div className="shelf-empty">
            <Spines size={34} />
            <h2>No encontramos ese libro.</h2>
            <p>Prueba con otro título, autor o lector.</p>
            <button
              onClick={() => {
                setQuery('')
                setWhose('all')
              }}
            >
              Ver todos los libros
            </button>
          </div>
        )}
        <p className="shelf-footnote">
          <span aria-hidden="true">✧</span> Cada lomo, un lugar al que volver.
        </p>
      </main>
      <nav className="app-nav" aria-label="Secciones">
        <div className="app-nav-inner">
          <a className="app-nav-item" href="/">
            <span className="app-nav-icon">
              <Flame size={22} />
            </span>
            <span>Velas</span>
          </a>
          <a className="app-nav-item" href="/mesilla">
            <span className="app-nav-icon">
              <BookOpen size={22} />
            </span>
            <span>Mesita</span>
          </a>
          <a
            className="app-nav-item"
            href="#"
            aria-current="page"
            onClick={(e) => {
              e.preventDefault()
              window.scrollTo({
                top: 0,
                behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
              })
            }}
          >
            <span className="app-nav-icon">
              <Spines size={22} />
            </span>
            <span>Estantería</span>
          </a>
          <a className="app-nav-item" href="/notas">
            <span className="app-nav-icon">
              <Paper size={22} />
              <span className="app-nav-badge" />
            </span>
            <span>Notas</span>
          </a>
          <a className="app-nav-item" href="/ajustes">
            <span className="app-nav-icon">
              <span className="app-nav-avatar" style={{ background: 'var(--me)' }}>
                L
              </span>
            </span>
            <span>Tú</span>
          </a>
        </div>
      </nav>
      <PreviewBook selected={selected} onClose={() => setSelected(null)} />
    </>
  )
}

createRoot(document.getElementById('root')!).render(<Mockup />)
