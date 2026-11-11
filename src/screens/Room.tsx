import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { chooseCandle, lightCandle } from '@/lib/actions'
import {
  bookViews, candleReading, dropped, fmtPosition, heldBy, isLit, isNext, matchesStars, matchesText, sortViews, live, nightstand, pile, progressOf, shelves, standGroups,
  waxLeft, type BookView, type ShelfOrder, type Whose,
} from '@/lib/model'
import { nightsLine, nightsOf, sharedNights } from '@/lib/nights'
import { markNoticed, useNoticed } from '@/lib/noticed'
import { waitingFor } from '@/lib/slips'
import { useSyncStatus } from '@/lib/sync/store'
import { capital, fmtSince, fmtToday, nightOf } from '@/lib/time'
import type { Book, Profile } from '@/lib/types'
import { memoryFor, memoryLine } from '@/lib/memory'
import { usePeople, useNow, useSession, useWink } from '@/session'
import { Cover, Lying } from '@/ui/Book'
import { Candle } from '@/ui/Candle'
import { Covers, Flame, Plus, Spines, Search } from '@/ui/icons'
import { setShelfView, useShelfView } from '@/lib/shelfView'
import { Plank, Shelf, type ShelfItem } from '@/ui/Shelf'
import { Sheet } from '@/ui/Sheet'
import { toast } from '@/ui/toast'
import { useHold } from '@/ui/useHold'
import { PersonRow, Wax, type Person } from '@/ui/Who'

/** The whole app is this room: the sill with your two candles, the nightstand, and the shelf below. */
export function Room({ section }: { section: 'velas' | 'mesilla' | 'estanteria' }) {
  const { db, me, partner } = usePeople()
  const { remote } = useSession()
  const status = useSyncStatus()
  const now = useNow()
  const navigate = useNavigate()

  const views = useMemo(() => bookViews(db, me.id), [db, me.id])
  const sessions = useMemo(() => live(db.sessions), [db.sessions])
  const stand = useMemo(() => nightstand(views, sessions), [views, sessions])
  const chosen = candleReading(db, me.id, views, sessions)
  const mineLit = isLit(me, now)
  const theirsLit = isLit(partner, now)
  const nights = partner
    ? nightsLine(sharedNights(nightsOf(sessions, me.id), nightsOf(sessions, partner.id)), nightOf(new Date(now)))
    : null

  const bookOf = (person: Profile | null): Book | undefined => {
    const reading = person?.candle_reading_id ? db.readings[person.candle_reading_id] : undefined
    return reading ? db.books[reading.book_id] : undefined
  }
  const theirBook = bookOf(partner)

  const light = () => {
    if (!chosen?.mine) {
      toast('Primero pon un libro en la mesilla', { label: 'Añadir', run: () => navigate('/anadir') })
      return
    }
    navigator.vibrate?.(18)
    lightCandle(chosen.mine)
    navigate('/velada')
  }

  let line: ReactNode
  if (mineLit && theirsLit) line = 'Estáis leyendo los dos.'
  else if (theirsLit && partner) {
    line = (
      <>
        {partner.name} está leyendo{theirBook ? <> <em>{theirBook.title}</em></> : ''}. ¿Enciendes la tuya?
      </>
    )
  } else if (mineLit) line = partner ? `Tu vela está encendida. ${partner.name} la ve.` : 'Tu vela está encendida.'
  else if (!chosen) line = 'Pon un libro en la mesilla y enciende tu vela.'
  else line = nights ?? 'Las dos velas esperan.'

  const wink = useWink(partner?.name)
  const memory = useMemo(
    () => memoryFor(views, nightOf(new Date(now)), new Set(sessions.map((s) => s.reading_id))),
    [views, sessions, now],
  )
  const noticed = useNoticed(me.id)
  // Notes of theirs I can read and whose notice I haven't tapped yet. Tapped once, it is not said again.
  const waiting = useMemo(() => waitingFor(db, me.id).filter((thing) => !noticed.has(thing.slip.id)), [db, me.id, noticed])
  const [whose, setWhose] = useState<Whose>('todos')
  const groups = standGroups(stand)
  const myBooks = [...groups.both, ...groups.mine]
  const myOpen = myBooks.length
  // One line per book with notes of theirs I can read now. What they say is read inside the book.
  const notices = [...new Set(waiting.map((thing) => thing.book))].map((book) => ({
    book,
    slips: waiting.filter((thing) => thing.book === book).map((thing) => thing.slip.id),
  }))
  const allPending = pile(views)
  const allYears = shelves(views)
  const [text, setText] = useState('')
  const [order, setOrder] = useState<ShelfOrder>('fecha')
  const [minStars, setMinStars] = useState(0)
  const searching = text.trim() !== '' || minStars !== 0
  // Stars only exist on finished books: asking for them leaves the pile and the dropped ones out.
  const pending = minStars !== 0 ? [] : allPending.filter((view) => heldBy(view, whose, 'pendiente') && matchesText(view, text))
  const finished = (view: BookView) => heldBy(view, whose, 'terminado') && matchesText(view, text) && matchesStars(view, minStars, whose)
  const years = allYears.map(({ year, books }) => ({ year, books: books.filter(finished) })).filter(({ books }) => books.length > 0)
  /** Ordered by anything but the year, the finished books stand all together. */
  const together = order === 'fecha' ? null : sortViews(years.flatMap(({ books }) => books), order, whose)
  const myNext = pending.find((view) => isNext(view.mine))
  const theirNext = pending.find((view) => isNext(view.theirs))
  const left = minStars !== 0 ? [] : dropped(views).filter((view) => matchesText(view, text))
  /** Moves the candle to another open book: at once if it is burning, for next time if it isn't. */
  const moveCandle = (view: BookView) => {
    if (!view.mine) return
    if (mineLit) lightCandle(view.mine)
    else chooseCandle(view.mine)
    toast('Tu vela es ahora para este libro')
  }
  const ribbons = (view: BookView, wanted: (status?: string) => boolean): string[] => [
    ...(wanted(view.theirs?.status) ? ['var(--you)'] : []),
    ...(wanted(view.mine?.status) ? ['var(--me)'] : []),
  ]
  const item = (wanted: (status?: string) => boolean) => (view: BookView): ShelfItem => ({
    book: view.book,
    ribbons: ribbons(view, wanted),
    // The stars each one gave it, mine first; looking at one person's books, only theirs.
    ratings: [
      ...(view.mine?.rating && whose !== 'tu' ? [{ color: 'var(--me)', stars: view.mine.rating }] : []),
      ...(view.theirs?.rating && whose !== 'yo' ? [{ color: 'var(--you)', stars: view.theirs.rating }] : []),
    ],
  })
  const open = (book: Book) => navigate(`/libro/${book.id}`)
  const shelfView = useShelfView()
  /** The book pulled halfway out of the shelf to look at its cover. */
  const [peek, setPeek] = useState<BookView | null>(null)
  // By their spines you first pull a book out to see its cover; facing out, you already see it.
  const take = (book: Book) => {
    const view = views.find((v) => v.book.id === book.id)
    if (shelfView === 'lomos' && view) setPeek(view)
    else open(book)
  }
  const said = (reading: BookView['mine'], second: boolean) =>
    !reading
      ? null
      : reading.status === 'terminado'
        ? second ? 'lo has leído' : 'lo ha leído'
        : reading.status === 'leyendo'
          ? `${second ? 'vas' : 'va'} por la ${fmtPosition(reading)}`
          : reading.status === 'pendiente'
            ? `${second ? 'lo tienes' : 'lo tiene'} por leer`
            : `${second ? 'lo dejaste' : 'lo dejó'} a medias`
  const nightsIn = (year: number) => new Set(sessions.filter((s) => s.day.startsWith(String(year))).map((s) => s.day)).size
  const empty = !stand.length && !allPending.length && !allYears.length

  return (
    <main className="relative mx-auto min-h-dvh max-w-xl overflow-x-clip px-5 pb-28">
      {/* Candlelight on the wall */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[460px]"
        style={{
          background: 'radial-gradient(60% 55% at 50% 38%, color-mix(in oklab, var(--flame) 30%, transparent), transparent 75%)',
          opacity: (Number(mineLit) + Number(theirsLit)) / 2,
          transition: 'opacity 1.6s var(--ease)',
        }}
      />

      <header
        className="relative flex min-h-11 items-center justify-between"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 14px)' }}
      >
        <p className="eyebrow">{capital(fmtToday(new Date(now)))}</p>
      </header>

      {section === 'velas' && (
      <>
      <h1 className="sr-only">Velas</h1>
      {/* ── La repisa ── */}
      <section className="relative mt-1" aria-label="La repisa">
        <div className="flex items-end justify-center gap-9">
          {partner && (
            <button
              type="button"
              className="rise rounded-[20px]"
              disabled={!(mineLit && theirsLit)}
              aria-label={mineLit && theirsLit ? `La vela de ${partner.name}. Mandarle un guiño` : `La vela de ${partner.name}`}
              onClick={wink.send}
            >
              <Candle color={partner.color} lit={theirsLit} wax={theirsLit ? waxLeft(partner.candle_lit_at, now) : 1} lean={mineLit ? 1 : 0} tremble={wink.received} />
            </button>
          )}
          <MyCandle me={me} lit={mineLit} now={now} lean={theirsLit && partner ? -1 : 0} ready={!!chosen} onLight={light} onOpen={() => navigate('/velada')} />
        </div>
        <Plank />
        <div className="mt-3 flex justify-center gap-9 text-center">
          {partner && (
            <div className="w-[120px]">
              <p className="text-[18px]">{partner.name}</p>
              <p className="quiet text-[15px]">{theirsLit ? `lee ${fmtSince(partner.candle_lit_at!, now)}` : 'apagada'}</p>
            </div>
          )}
          <div className="w-[120px]">
            <p className="text-[18px]">Tú</p>
            <p className="quiet text-[15px]">{mineLit ? `lees ${fmtSince(me.candle_lit_at!, now)}` : 'mantén para encender'}</p>
          </div>
        </div>
        <p className="mx-auto mt-6 max-w-[19em] text-center text-[21px] leading-snug" aria-live="polite">
          {line}
        </p>
        {nights && line !== nights && <p className="eyebrow mt-3 text-center">{nights}</p>}
        {mineLit && theirsLit && partner && <p className="quiet mt-2 text-center text-[15px]">Toca su vela para mandarle un guiño.</p>}
      </section>

      {/* ── Notas por leer: solo el aviso; se leen dentro del libro ── */}
      {notices.length > 0 && partner && (
        <section className="mt-8 flex flex-col gap-2" aria-label="Notas por leer">
          {notices.map(({ book, slips: { length: count }, slips }, i) => (
            <Link key={book.id} to={`/libro/${book.id}#papeles`} onClick={() => markNoticed(me.id, slips)} className="card pressable rise flex items-center gap-3 px-4 py-3" style={{ '--i': i + 2 } as CSSProperties}>
              <Wax who="you" size={13} />
              <span className="min-w-0 flex-1 text-[16.5px] leading-snug">
                {partner.name} te ha dejado {count === 1 ? 'una nota' : `${count} notas`} en <em>{book.title}</em>
              </span>
              <span className="quiet flex-none text-[15px] underline decoration-rule underline-offset-4">Leer</span>
            </Link>
          ))}
        </section>
      )}

      {/* ── Lo que vuelve ── */}
      {memory && partner && (
        <Link to={`/libro/${memory.book.id}`} className="rise mt-9 block text-center" style={{ '--i': 3 } as CSSProperties}>
          <span className="eyebrow block">{memoryLine(memory, partner.name)}</span>
          <span className="mt-1 block text-[22px] italic underline decoration-rule underline-offset-[6px]">{memory.book.title}</span>
        </Link>
      )}

      {/* ── Para qué libro es la vela ── */}
      {myBooks.length > 1 ? (
        <div className="mt-8">
          <p className="eyebrow mb-2 text-center">Tu vela es para</p>
          <div role="radiogroup" aria-label="Para qué libro es tu vela" className="flex flex-wrap justify-center gap-2">
            {myBooks.map((view) => (
              <button
                key={view.book.id}
                type="button"
                role="radio"
                aria-checked={view === chosen}
                aria-pressed={view === chosen}
                className="chip max-w-full gap-2"
                onClick={() => view !== chosen && moveCandle(view)}
              >
                {view === chosen && <Flame size={16} className="flex-none" />}
                <span className="truncate">{view.book.title}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        chosen?.mine && (
          <Link to={`/libro/${chosen.book.id}`} className="quiet mt-8 flex min-h-11 items-center justify-center gap-2 text-center text-[16px]">
            <Flame size={17} className="flex-none text-flame-ink" />
            <span className="min-w-0 truncate">
              Tu vela es para <em className="text-ink">{chosen.book.title}</em> · {fmtPosition(chosen.mine)}
            </span>
          </Link>
        )
      )}

      </>
      )}

      {/* ── La mesilla ── */}
      {section === 'mesilla' && (
      <section className="mt-4" aria-labelledby="mesilla">
        <h1 id="mesilla" className="title mb-5">
          La mesilla
        </h1>
        {stand.length ? (
          <div className="flex flex-col gap-7">
            {(
              [
                ['both', 'Los dos', groups.both],
                ['mine', 'Tú', groups.mine],
                ['theirs', partner?.name ?? '', groups.theirs],
              ] as const
            ).map(
              ([kind, label, list]) =>
                list.length > 0 && (
                  <div key={kind} role="group" aria-label={kind === 'both' ? 'Lo leéis los dos' : kind === 'mine' ? 'Lo lees tú' : `Lo lee ${label}`}>
                    {partner && (
                      <p className="mb-2.5 flex items-center gap-2 text-[17px]">
                        <span className="flex items-center -space-x-1">
                          {kind !== 'mine' && <Wax who="you" size={13} />}
                          {kind !== 'theirs' && <Wax who="me" size={13} />}
                        </span>
                        <span className="font-medium">{label}</span>
                        <span className="quiet text-[15px]">
                          {kind === 'both' ? '· lo leéis a la vez' : list.length > 1 ? `· ${list.length} libros` : ''}
                        </span>
                      </p>
                    )}
                    <div className="flex flex-col gap-3">
                      {list.map((view, i) => (
                        <OpenBook
                          key={view.book.id}
                          view={view}
                          partner={partner}
                          kind={kind}
                          candle={view === chosen}
                          onMoveCandle={myOpen > 1 && view !== chosen ? () => moveCandle(view) : undefined}
                          i={i}
                        />
                      ))}
                    </div>
                  </div>
                ),
            )}
          </div>
        ) : (
          <div className="rounded-[22px] border-[1.5px] border-dashed border-rule px-5 py-7 text-center">
            <p className="text-[19px]">{empty ? 'La habitación está recién estrenada.' : 'No hay ningún libro abierto.'}</p>
            <p className="quiet mt-1">Trae el libro que estás leyendo.</p>
            <Link to="/anadir" className="btn btn-primary mt-5">
              <Plus size={20} /> Añadir un libro
            </Link>
          </div>
        )}
      </section>
      )}

      {/* ── La estantería ── */}
      {section === 'estanteria' && (
      <section className="mt-4" aria-labelledby="estanteria">
        <div className="mb-1 flex items-center justify-between gap-3">
          <h1 id="estanteria" className="title">
            La estantería
          </h1>
          {(allPending.length > 0 || allYears.length > 0) && (
            <div role="group" aria-label="Cómo ver la estantería" className="flex rounded-full border-[1.5px] border-rule p-[3px]">
              {(
                [
                  ['lomos', 'Ver los lomos', <Spines key="l" size={20} />],
                  ['portadas', 'Ver las portadas', <Covers key="p" size={20} />],
                ] as const
              ).map(([value, label, icon]) => (
                <button
                  key={value}
                  type="button"
                  aria-label={label}
                  aria-pressed={shelfView === value}
                  className={`grid h-10 w-12 place-items-center rounded-full transition-colors ${shelfView === value ? 'bg-ink text-bg' : 'text-muted'}`}
                  onClick={() => setShelfView(value)}
                >
                  {icon}
                </button>
              ))}
            </div>
          )}
        </div>

        {partner && (allPending.length > 0 || allYears.length > 0) && (
          <div role="group" aria-label="De quién son las cintas. Toca para ver solo esos libros" className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 py-1">
            {(
              [
                ['todos', 'Todos', []],
                ['dos', 'Los dos', ['you', 'me']],
                ['yo', 'Tú', ['me']],
                ['tu', partner.name, ['you']],
              ] as Array<[Whose, string, Person[]]>
            ).map(([value, label, wax]) => (
              <button key={value} type="button" className="chip shrink-0 gap-2 whitespace-nowrap" aria-pressed={whose === value} onClick={() => setWhose(value)}>
                {wax.length > 0 && (
                  <span className="flex items-center -space-x-1">
                    {wax.map((who) => (
                      <Wax key={who} who={who} size={12} />
                    ))}
                  </span>
                )}
                {label}
              </button>
            ))}
          </div>
        )}

        {(allPending.length > 0 || allYears.length > 0) && (
          <div className="mt-2 flex flex-wrap gap-2">
            <label className="relative basis-full">
              <span className="sr-only">Buscar por título o autor</span>
              <Search className="quiet absolute top-1/2 left-3.5 -translate-y-1/2" size={18} />
              <input
                className="field !min-h-11 !py-1.5 !pl-10 text-[16px]"
                type="search"
                enterKeyHint="search"
                placeholder="Título o autor"
                value={text}
                onChange={(event) => setText(event.currentTarget.value)}
              />
            </label>
            <select aria-label="Ordenar los leídos" className="field !min-h-11 !w-auto min-w-0 flex-1 !py-1.5 text-[16px]" value={order} onChange={(event) => setOrder(event.currentTarget.value as ShelfOrder)}>
              <option value="fecha">Por año</option>
              <option value="titulo">Por título</option>
              <option value="autor">Por autor</option>
              <option value="puntuacion">Por puntuación</option>
            </select>
            <select aria-label="Filtrar por puntuación" className="field !min-h-11 !w-auto min-w-0 flex-1 !py-1.5 text-[16px]" value={minStars} onChange={(event) => setMinStars(Number(event.currentTarget.value))}>
              <option value={0}>Cualquier nota</option>
              <option value={5}>5★</option>
              <option value={4}>4★ o más</option>
              <option value={3}>3★ o más</option>
              <option value={-1}>Sin puntuar</option>
            </select>
          </div>
        )}

        {pending.length > 0 && (
          <div className="mt-6">
            <p className="eyebrow">Por leer</p>
            {myNext && (
              <p className="quiet mt-1.5 flex items-center gap-2 text-[15.5px]">
                <Wax who="me" />
                <span>
                  Tu siguiente: <em className="text-ink">{myNext.book.title}</em>
                </span>
              </p>
            )}
            {theirNext && partner && (
              <p className="quiet mt-1 flex items-center gap-2 text-[15.5px]">
                <Wax who="you" />
                <span>
                  El siguiente de {partner.name}: <em className="text-ink">{theirNext.book.title}</em>
                </span>
              </p>
            )}
            <Shelf items={pending.map(item((s) => s === 'pendiente'))} onOpen={take} view={shelfView} />
          </div>
        )}

        {together && together.length > 0 && (
          <div className="mt-8">
            <p className="flex items-baseline gap-3">
              <span className="text-[26px]">Leídos</span>
              <span className="quiet text-[15px]">
                {together.length === 1 ? 'un libro' : `${together.length} libros`} · {order === 'titulo' ? 'por título' : order === 'autor' ? 'por autor' : 'de más a menos estrellas'}
              </span>
            </p>
            <Shelf items={together.map(item((s) => s === 'terminado'))} onOpen={take} view={shelfView} />
          </div>
        )}

        {!together && years.map(({ year, books }) => (
          <div key={year} className="mt-8">
            <p className="flex items-baseline gap-3">
              <span className="text-[26px]">{year}</span>
              <span className="quiet text-[15px]">
                {books.length === 1 ? 'un libro' : `${books.length} libros`}
                {whose === 'todos' && nightsIn(year) > 0 && ` · ${nightsIn(year) === 1 ? 'una noche' : `${nightsIn(year)} noches`}`}
              </span>
            </p>
            <Shelf items={books.map(item((s) => s === 'terminado'))} onOpen={take} view={shelfView} />
          </div>
        ))}

        {!years.length && !pending.length && !left.length && (
          <p className="quiet mt-5">
            {searching
              ? 'No hay ningún libro que encaje con eso.'
              : allYears.length || allPending.length
              ? 'Todavía no hay ningún libro así en la estantería.'
              : 'Aquí irán quedando los lomos de lo que leáis. Cada uno con su cinta.'}
          </p>
        )}

        {left.length > 0 && (
          <div className="mt-10">
            <p className="eyebrow">{left.length === 1 ? 'Dejado a medias' : 'Dejados a medias'}</p>
            {shelfView === 'portadas' ? (
              <Shelf items={left.map((view) => ({ book: view.book, ribbons: [] }))} onOpen={take} view="portadas" />
            ) : (
              <>
                <div className="mt-3 flex flex-col-reverse items-center gap-[2px] px-3">
                  {left.map((view, i) => (
                    <Lying key={view.book.id} book={view.book} onClick={() => take(view.book)} style={{ marginLeft: ((i % 3) - 1) * 16 }} />
                  ))}
                </div>
                <Plank />
              </>
            )}
          </div>
        )}
      </section>
      )}

      <Sheet open={!!peek} onClose={() => setPeek(null)} label={peek?.book.title}>
        {peek && (
          <div className="flex flex-col items-center gap-5 pb-1 text-center">
            <div className="rise">
              <Cover book={peek.book} width={168} />
            </div>
            <div>
              <h2 className="text-[25px] leading-tight">{peek.book.title}</h2>
              {peek.book.author && <p className="quiet mt-1 text-[17px] italic">{peek.book.author}</p>}
            </div>
            <div className="flex flex-col items-center gap-1 text-[16px]">
              {peek.mine && (
                <p className="flex items-center gap-2">
                  <Wax who="me" /> <span><span className="font-medium">Tú</span> <span className="quiet">{said(peek.mine, true)}</span></span>
                </p>
              )}
              {peek.theirs && partner && (
                <p className="flex items-center gap-2">
                  <Wax who="you" /> <span><span className="font-medium">{partner.name}</span> <span className="quiet">{said(peek.theirs, false)}</span></span>
                </p>
              )}
            </div>
            {(peek.mine?.rating || peek.theirs?.rating) && (
              <p className="flex items-center gap-4 text-[16px]">
                {peek.mine?.rating ? <span className="flex items-center gap-1.5"><Wax who="me" /> {peek.mine.rating}★</span> : null}
                {peek.theirs?.rating ? <span className="flex items-center gap-1.5"><Wax who="you" /> {peek.theirs.rating}★</span> : null}
              </p>
            )}
            <button className="btn btn-primary w-full" onClick={() => open(peek.book)}>
              Abrir el libro
            </button>
          </div>
        )}
      </Sheet>

      {(remote.ensayo || status.pending > 0 || status.offline) && (
        <p className="quiet mt-12 text-center text-[15px]">
          {remote.ensayo
            ? 'Modo ensayo: todo vive en este navegador.'
            : status.offline
              ? status.pending
                ? `Sin conexión: ${status.pending === 1 ? 'un cambio espera' : `${status.pending} cambios esperan`} en este móvil.`
                : 'Sin conexión. Todo sigue funcionando.'
              : 'Guardando…'}
        </p>
      )}
    </main>
  )
}

interface MyCandleProps {
  me: Profile
  lit: boolean
  now: number
  lean: -1 | 0 | 1
  /** There is a book to light it for. */
  ready: boolean
  onLight: () => void
  onOpen: () => void
}

/** Your candle: hold a finger on it to light it; once lit, a tap takes you back to your evening. */
function MyCandle({ me, lit, now, lean, ready, onLight, onOpen }: MyCandleProps) {
  const hold = useHold(onLight)
  const [hint, setHint] = useState(false)
  const release = () => {
    if (!hold.cancel()) return
    // Without a book there is nothing to light for: `onLight` says so.
    if (ready) setHint(true)
    else onLight()
  }
  return (
    <button
      type="button"
      className="rise relative rounded-[20px] outline-offset-0"
      style={{ '--i': 1, touchAction: 'manipulation', WebkitTouchCallout: 'none' } as CSSProperties}
      aria-label={lit ? 'Tu vela está encendida. Volver a tu velada' : 'Tu vela. Mantén pulsado para encenderla'}
      onPointerDown={(event) => {
        if (lit || event.button !== 0) return
        setHint(false)
        event.currentTarget.setPointerCapture(event.pointerId)
        hold.start()
      }}
      onPointerUp={release}
      onPointerCancel={() => hold.cancel()}
      onContextMenu={(event) => event.preventDefault()}
      onClick={(event) => {
        if (lit) onOpen()
        // A click with no pointer behind it comes from a keyboard or a screen reader: light it outright.
        else if (event.detail === 0) onLight()
      }}
    >
      <Candle color={me.color} lit={lit} wax={lit ? waxLeft(me.candle_lit_at, now) : 1} lean={lean} igniting={hold.progress} />
      {hint && !lit && <span role="status" className="pointer-events-none absolute inset-x-[-34px] bottom-2 rounded-xl bg-surface px-3 py-2 text-center text-[15px] leading-snug text-ink shadow-sm">Mantén el dedo sobre la mecha hasta que prenda.</span>}
    </button>
  )
}

interface OpenBookProps {
  view: BookView
  partner: Profile | null
  /** Who has it open. */
  kind: 'both' | 'mine' | 'theirs'
  /** My candle is for this one. */
  candle: boolean
  /** Offered when I have more than one book open and the candle is for another. */
  onMoveCandle?: () => void
  i: number
}

/** A book open on the nightstand: its edge is the wax of whoever is in it, and each has their own line. */
function OpenBook({ view, partner, kind, candle, onMoveCandle, i }: OpenBookProps) {
  const { book, mine, theirs } = view
  const present = (r?: typeof mine) => (r && r.status !== 'pendiente' && r.status !== 'dejado' ? r : undefined)
  const place = (r: NonNullable<typeof mine>) => (r.status === 'terminado' ? 'terminado' : fmtPosition(r))
  const edge =
    kind === 'both' ? 'linear-gradient(to bottom, var(--me) 50%, var(--you) 50%)' : kind === 'mine' ? 'var(--me)' : 'var(--you)'
  const me = present(mine)
  const them = partner ? present(theirs) : undefined
  const join = kind === 'theirs' && !mine
  return (
    <div
      className={`rise relative overflow-hidden rounded-[22px] ${kind === 'theirs' ? 'border-[1.5px] border-rule' : 'card'}`}
      style={{ '--i': i + 2 } as CSSProperties}
    >
      <span aria-hidden className="absolute inset-y-0 left-0 w-[7px]" style={{ background: edge }} />
      <Link to={`/libro/${book.id}`} className="pressable flex gap-4 py-4 pr-4 pl-[22px]">
        <Cover book={book} width={62} />
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 py-0.5">
          <div>
            <h3 className="line-clamp-2 text-[20px] leading-tight">{book.title}</h3>
            <p className="quiet truncate text-[15.5px] italic">{book.author}</p>
          </div>
          <div className="flex flex-col gap-2">
            {me && <PersonRow who="me" name="Tú" text={place(me)} at={progressOf(me)} />}
            {them && <PersonRow who="you" name={partner!.name} text={place(them)} at={progressOf(them)} />}
          </div>
        </div>
      </Link>
      {(candle || onMoveCandle || join) && mine?.status !== 'terminado' && (
        <div className="flex min-h-11 items-center border-t border-rule pr-3 pl-[22px] text-[15.5px]">
          {candle && kind !== 'theirs' && (
            <span className="flex items-center gap-2 text-flame-ink">
              <Flame size={17} /> Tu vela es para este
            </span>
          )}
          {!candle && onMoveCandle && kind !== 'theirs' && (
            <button type="button" className="quiet -ml-1 flex min-h-11 items-center gap-2 px-1 underline decoration-rule underline-offset-4" onClick={onMoveCandle}>
              <Flame size={17} /> Poner aquí mi vela
            </button>
          )}
          {join && (
            <Link to={`/libro/${book.id}?unirme=1`} className="quiet -ml-1 flex min-h-11 items-center px-1 underline decoration-rule underline-offset-4">
              Yo también quiero leerlo
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
