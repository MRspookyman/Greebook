import { useId, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router'
import { toggleFolded, useFolded } from '@/lib/folded'
import { isNext, type BookView } from '@/lib/model'
import { setShelfView, type ShelfView } from '@/lib/shelfView'
import type { Profile } from '@/lib/types'
import { Cover } from './Book'
import { Fold } from './Fold'
import { Chevron, Covers, Spines } from './icons'
import { Wax } from './Who'

export function ShelfViewSwitch({ view }: { view: ShelfView }) {
  return (
    <div className="shelf-views" role="group" aria-label="Cómo ver la estantería">
      <button
        type="button"
        aria-label="Ver los lomos"
        aria-pressed={view === 'lomos'}
        onClick={() => setShelfView('lomos')}
      >
        <Spines size={20} />
      </button>
      <button
        type="button"
        aria-label="Ver las portadas"
        aria-pressed={view === 'portadas'}
        onClick={() => setShelfView('portadas')}
      >
        <Covers size={20} />
      </button>
    </div>
  )
}

interface CabinetProps {
  id: string
  title: ReactNode
  summary: ReactNode
  open: boolean
  controls?: ReactNode
  archive?: boolean
  children: ReactNode
}

/** The existing remembered folds, with controls beside the heading rather than inside its button. */
export function ShelfCabinet({ id, title, summary, open, controls, archive, children }: CabinetProps) {
  const folded = useFolded().has(id) && !open
  const panel = useId()
  return (
    <section className={`shelf-cabinet ${archive ? 'shelf-cabinet--archive' : ''} ${folded ? 'is-folded' : ''}`}>
      <div className="shelf-cabinet-heading">
        <button
          type="button"
          className="shelf-year"
          aria-expanded={!folded}
          aria-controls={panel}
          onClick={() => toggleFolded(id)}
        >
          <span className="shelf-year-name">
            {title}
            <span className="shelf-year-star" aria-hidden>
              ✧
            </span>
          </span>
          <span className="shelf-year-count">{summary}</span>
          <Chevron size={17} />
        </button>
        {controls && <div className="shelf-cabinet-controls">{controls}</div>}
      </div>
      <div id={panel} className="shelf-collection" hidden={folded}>
        {children}
      </div>
    </section>
  )
}

function ShelfSprig() {
  return (
    <svg className="shelf-next-sprig" viewBox="0 0 80 120" fill="none" aria-hidden>
      <g stroke="currentColor" strokeWidth="1.05" strokeLinecap="round" strokeLinejoin="round">
        <path d="M36 114c-10-34-9-62 8-94M31 93C14 90 10 76 13 66c13 4 19 15 18 27ZM31 73c18-2 28-15 28-27-15 3-26 13-28 27ZM36 52C21 49 17 36 20 26c13 4 17 15 16 26ZM42 32c15-3 21-15 19-25-13 5-18 13-19 25Z" />
        <path d="M35 111c12-12 25-18 35-20M52 97c-2-10 3-19 11-22 3 11-1 18-11 22Z" opacity=".6" />
      </g>
    </svg>
  )
}

/** Every pending book keeps its owner and next-reading marks, even with multiple books or no partner. */
export function PendingBooks({
  books,
  partner,
  searching,
}: {
  books: BookView[]
  partner: Profile | null
  searching: boolean
}) {
  if (!books.length) return null
  return (
    <Fold
      id="estanteria:porleer"
      open={searching}
      className="shelf-waiting"
      header={
        <span className="shelf-waiting-heading">
          <span className="shelf-waiting-title">Por descubrir…</span>
          <span className="shelf-waiting-count">
            {books.length} {books.length === 1 ? 'libro por leer' : 'libros por leer'}
          </span>
        </span>
      }
    >
      <div className="shelf-pending-list">
        {books.map((view) => {
          const mine = view.mine?.status === 'pendiente'
          const theirs = partner && view.theirs?.status === 'pendiente'
          return (
            <Link
              key={view.book.id}
              to={`/libro/${view.book.id}`}
              className="shelf-next-book"
              style={{ '--pending-wax': mine ? 'var(--me)' : 'var(--you)' } as CSSProperties}
            >
              <span className="shelf-next-cover">
                <Cover book={view.book} width={77} />
              </span>
              <span className="shelf-next-copy">
                <span className="shelf-next-owner">
                  <span className="shelf-dots">
                    {mine && <Wax who="me" size={9} />}
                    {theirs && <Wax who="you" size={9} />}
                  </span>
                  <span>
                    {mine && theirs
                      ? 'En vuestra pila'
                      : mine
                        ? 'En tu pila'
                        : partner
                          ? `En la pila de ${partner.name}`
                          : 'Por leer'}
                  </span>
                </span>
                <strong>{view.book.title}</strong>
                {view.book.author && <em>{view.book.author}</em>}
                {(isNext(view.mine) || (partner && isNext(view.theirs))) && (
                  <span className="shelf-next-marks">
                    {isNext(view.mine) && (
                      <span>
                        <Wax who="me" size={9} />
                        Tu siguiente lectura
                      </span>
                    )}
                    {partner && isNext(view.theirs) && (
                      <span>
                        <Wax who="you" size={9} />
                        La siguiente de {partner.name}
                      </span>
                    )}
                  </span>
                )}
                <span className="shelf-next-action">
                  Abrir el libro <span aria-hidden>↗</span>
                </span>
              </span>
              <ShelfSprig />
            </Link>
          )
        })}
      </div>
    </Fold>
  )
}
