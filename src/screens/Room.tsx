import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { chooseCandle, lightCandle } from '@/lib/actions'
import {
  bookViews, candleReading, dropped, fmtPosition, heldBy, isLit, isNext, matchesText, sortViews, live, nightstand, pile, progressOf, shelves, standGroups,
  waxLeft, type BookView, type ShelfOrder, type Whose,
} from '@/lib/model'
import { lastNights, nightsLine, nightsOf, sharedNights } from '@/lib/nights'
import { knowsTheGesture, litOnce } from '@/lib/learned'
import { markNoticed, useNoticed } from '@/lib/noticed'
import { askForCandleNotice } from '@/lib/ongoing'
import { reviewsOf, waitingFor } from '@/lib/slips'
import { useSyncStatus } from '@/lib/sync/store'
import { capital, fmtDay, fmtSince, fmtToday, nightOf } from '@/lib/time'
import type { Book, Profile } from '@/lib/types'
import { memoryFor, memoryLine } from '@/lib/memory'
import { usePeople, useNow, useSession, useWink } from '@/session'
import { Cover, Lying } from '@/ui/Book'
import { Candle } from '@/ui/Candle'
import { ReadingStillLife, RoomScene } from '@/ui/RoomArt'
import { BookOpen, Covers, Flame, Paper, Plus, Spines, Search, More } from '@/ui/icons'
import { setShelfView, useShelfView } from '@/lib/shelfView'
import { Plank, Shelf, type ShelfItem } from '@/ui/Shelf'
import { Fold } from '@/ui/Fold'
import { Sheet } from '@/ui/Sheet'
import { StatusSheet } from '@/ui/StatusSheet'
import { toast } from '@/ui/toast'
import { useHold } from '@/ui/useHold'
import { Wax, type Person } from '@/ui/Who'

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
  const tonight = nightOf(new Date(now))
  const theirNights = useMemo(() => (partner ? nightsOf(sessions, partner.id) : new Set<string>()), [sessions, partner])
  const shared = useMemo(() => sharedNights(nightsOf(sessions, me.id), theirNights), [sessions, me.id, theirNights])
  const nights = partner ? nightsLine(shared, tonight) : null
  /** The week under the candles appears once there is a night to show in it. */
  const week = partner && shared.length ? lastNights(shared, tonight) : null

  const bookOf = (person: Profile | null): Book | undefined => {
    const reading = person?.candle_reading_id ? db.readings[person.candle_reading_id] : undefined
    return reading ? db.books[reading.book_id] : undefined
  }
  const theirBook = bookOf(partner)

  const light = () => {
    if (!chosen?.mine) {
      toast('Primero pon un libro en la mesita', { label: 'Añadir', run: () => navigate('/anadir') })
      return
    }
    navigator.vibrate?.(18)
    askForCandleNotice()
    litOnce()
    lightCandle(chosen.mine)
    navigate('/velada')
  }
  /** The line under «Tú» that fills while the finger is held: the finger itself hides the wick. */
  const meter = useRef<HTMLSpanElement>(null)
  const showHold = useCallback((progress: number) => {
    const bar = meter.current
    if (!bar) return
    bar.style.transform = `scaleX(${progress})`
    bar.parentElement?.style.setProperty('--holding', progress > 0 ? '1' : '0')
  }, [])
  const myNights = useMemo(() => nightsOf(sessions, me.id), [sessions, me.id])

  let line: ReactNode
  if (mineLit && theirsLit) line = 'Estáis leyendo los dos.'
  else if (theirsLit && partner) {
    line = (
      <>
        {partner.name} está leyendo{theirBook ? <> <em>{theirBook.title}</em></> : ''}. ¿Enciendes la tuya?
      </>
    )
  } else if (mineLit) line = partner ? `Tu vela está encendida. ${partner.name} la ve.` : 'Tu vela está encendida.'
  else if (!chosen) line = 'Pon un libro en la mesita y enciende tu vela.'
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
  /** The last seven nights, shown on asking. */
  const [showWeek, setShowWeek] = useState(false)
  /** Choosing which open book the candle is for. */
  const [choosing, setChoosing] = useState(false)
  const groups = standGroups(stand)
  const myBooks = [...groups.both, ...groups.mine]
  // One line per book with notes of theirs I can read now. What they say is read inside the book.
  const notices = [...new Set(waiting.map((thing) => thing.book))].map((book) => ({
    book,
    slips: waiting.filter((thing) => thing.book === book).map((thing) => thing.slip.id),
  }))
  const allPending = pile(views)
  const allYears = shelves(views)
  const [text, setText] = useState('')
  const [order, setOrder] = useState<ShelfOrder>('fecha')
  const searching = text.trim() !== ''
  const pending = allPending.filter((view) => heldBy(view, whose, 'pendiente') && matchesText(view, text))
  const finished = (view: BookView) => heldBy(view, whose, 'terminado') && matchesText(view, text)
  const years = allYears.map(({ year, books }) => ({ year, books: books.filter(finished) })).filter(({ books }) => books.length > 0)
  /** Ordered by anything but the year, the finished books stand all together. */
  const together = order === 'fecha' ? null : sortViews(years.flatMap(({ books }) => books), order, whose)
  const myNext = pending.find((view) => isNext(view.mine))
  const theirNext = pending.find((view) => isNext(view.theirs))
  const left = dropped(views).filter((view) => matchesText(view, text))
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
  const peekReview = peek ? reviewsOf(db, peek.book.id).findLast((slip) => slip.user_id === me.id)?.body : null
  /** The book whose state is being changed. */
  const [statusFor, setStatusFor] = useState<BookView | null>(null)
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
    <main className={`room room--${section} relative mx-auto min-h-dvh max-w-xl overflow-x-clip px-5 pb-28 ${section === 'velas' ? 'flex flex-col' : ''}`}>
      {/* Candlelight on the wall; on the sill it hangs over the candles themselves. */}
      {section !== 'velas' && (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[460px]"
        style={{
          background: 'radial-gradient(60% 55% at 50% 38%, color-mix(in oklab, var(--flame) 30%, transparent), transparent 75%)',
          opacity: (Number(mineLit) + Number(theirsLit)) / 2,
          transition: 'opacity 1.6s var(--ease)',
        }}
      />
      )}

      <header
        className="room-header relative flex min-h-11 items-center justify-between"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 14px)' }}
      >
        <p className="eyebrow room-date">{capital(fmtToday(new Date(now)))}</p>
        <BookOpen size={19} className="room-mark" />
      </header>

      {section === 'velas' && (
      <div className="flex flex-1 flex-col">
      <div className="room-intro">
        <h1 className="display">{partner ? <>Un ratito para<br /><em>nosotros.</em></> : <>Un ratito<br /><em>para ti.</em></>}</h1>

      </div>
      {/* The sill sits low, where the thumb is: the room above it is wall. */}
      <div aria-hidden className="room-wall" />
      {/* ── La repisa ── */}
      <section className="sill relative" aria-label="La repisa" data-lit={mineLit || theirsLit ? 'true' : 'false'}>
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-5 -top-28 h-[520px]"
          style={{
            background: 'radial-gradient(62% 50% at 50% 40%, color-mix(in oklab, var(--flame) 30%, transparent), transparent 75%)',
            opacity: (Number(mineLit) + Number(theirsLit)) / 2,
            transition: 'opacity 1.6s var(--ease)',
          }}
        />
        <div className="room-candle-stage">
        <RoomScene />
        <div className="room-candles relative flex items-end justify-center">
          {partner && (
            <div className="flex w-[calc(var(--candle)+36px)] justify-center">
              <button
                type="button"
                className="rise rounded-[20px]"
                disabled={!(mineLit && theirsLit)}
                aria-label={mineLit && theirsLit ? `La vela de ${partner.name}. Mandarle un guiño` : `La vela de ${partner.name}`}
                onClick={wink.send}
              >
                <span className={`theirs block ${theirsLit ? '' : 'unlit'}`}>
                  <Candle color={partner.color} lit={theirsLit} wax={theirsLit ? waxLeft(partner.candle_lit_at, now) : 1} lean={mineLit ? 1 : 0} tremble={wink.received} />
                </span>
              </button>
            </div>
          )}
          <div className="flex w-[calc(var(--candle)+36px)] justify-center">
            <MyCandle me={me} lit={mineLit} now={now} lean={theirsLit && partner ? -1 : 0} ready={!!chosen} onHold={showHold} onLight={light} onOpen={() => navigate('/velada')} />
          </div>
        </div>
        <Plank />
        </div>
        <div className="room-candle-names relative mt-3 flex justify-center text-center">
          {partner && (
            <div className="w-[calc(var(--candle)+36px)]">
              <p className="text-[18px]">{partner.name}</p>
              <p className="quiet text-[15px] whitespace-nowrap">
                {theirsLit ? `lee ${fmtSince(partner.candle_lit_at!, now)}` : theirNights.has(tonight) ? 'ya ha leído hoy' : 'aún no ha leído hoy'}
              </p>
            </div>
          )}
          <div className="w-[calc(var(--candle)+36px)]">
            <p className="text-[18px] font-medium">Tú</p>
            {mineLit ? (
              <p className="quiet text-[15px] whitespace-nowrap">lees {fmtSince(me.candle_lit_at!, now)}</p>
            ) : knowsTheGesture() ? (
              <p className="quiet text-[15px] whitespace-nowrap">{myNights.has(tonight) ? 'ya has leído hoy' : 'aún no has leído hoy'}</p>
            ) : (
              <p className="text-[15.5px] whitespace-nowrap text-flame-ink">mantén para encender</p>
            )}
            {!mineLit && (
              <span aria-hidden className="mx-auto mt-1.5 block h-[3px] w-[92px] overflow-hidden rounded-full" style={{ background: 'color-mix(in oklab, var(--flame) 20%, transparent)', opacity: 'var(--holding, 0)', transition: 'opacity 160ms' } as CSSProperties}>
                <span ref={meter} className="block h-full origin-left rounded-full bg-flame" style={{ transform: 'scaleX(0)' }} />
              </span>
            )}
          </div>
        </div>
        <p className="room-candle-message relative mx-auto mt-6 max-w-[19em] text-center text-[21px] leading-snug" aria-live="polite">
          {line}
        </p>
        {nights && week && (
          <button type="button" className="eyebrow relative mx-auto mt-3 flex min-h-11 items-center gap-1.5 px-3" aria-expanded={showWeek} onClick={() => setShowWeek(!showWeek)}>
            {line === nights ? 'Esta semana' : nights}
            <span aria-hidden className="text-[11px]" style={{ transform: showWeek ? 'rotate(180deg)' : undefined, transition: 'transform 200ms' }}>▾</span>
          </button>
        )}
        {week && showWeek && (
          <ol aria-label="Las últimas siete noches" className="fade relative mt-1 flex justify-center gap-1.5">
            {week.map((night) => (
              <li key={night.day} className="flex w-9 flex-col items-center gap-1">
                <span
                  aria-hidden
                  className={`grid h-9 w-9 place-items-center rounded-full ${night.tonight ? 'border-[1.5px] border-rule' : ''} ${night.shared ? 'text-flame-ink' : 'text-muted'}`}
                  style={night.shared ? { background: 'color-mix(in oklab, var(--flame) 17%, transparent)' } : undefined}
                >
                  {night.shared ? <Flame size={17} /> : <span className="h-[5px] w-[5px] rounded-full bg-current opacity-45" />}
                </span>
                <span aria-hidden className={`text-[12.5px] leading-none ${night.tonight ? 'font-semibold text-ink' : 'quiet'}`}>
                  {night.letter}
                </span>
                <span className="sr-only">
                  {night.tonight ? 'Hoy' : capital(fmtDay(night.day, tonight))}
                  {night.shared ? ': leísteis los dos' : ''}
                </span>
              </li>
            ))}
          </ol>
        )}
        {mineLit && theirsLit && partner && <p className="quiet relative mt-3 text-center text-[15px]">Toca su vela para mandarle un guiño.</p>}
      </section>


      {chosen?.mine && (
        <div className="room-current-book">
          <Link to={'/libro/' + chosen.book.id} className="room-current-link">
            <Cover book={chosen.book} width={44} />
            <span className="min-w-0 flex-1">
              <span className="room-current-label"><Flame size={12} />Donde lo dejaste</span>
              <span className="room-current-title">{chosen.book.title}</span>
              {chosen.book.author && <span className="room-current-author">{chosen.book.author}</span>}
            </span>
            <span className="room-current-position">{fmtPosition(chosen.mine)}</span>
          </Link>
          {myBooks.length > 1 && (
            <button type="button" className="room-current-change" onClick={() => setChoosing(true)}>Cambiar</button>
          )}
        </div>
      )}

      {!partner && (
        <Link to="/ajustes#pareja" className="card pressable rise mt-8 flex items-center gap-3 px-4 py-3" style={{ '--i': 2 } as CSSProperties}>
          <span className="min-w-0 flex-1 text-[16.5px] leading-snug">
            Lees a solas. <span className="quiet">Invita a quien lee contigo y veréis la vela del otro.</span>
          </span>
          <span className="quiet flex-none text-[15px] underline decoration-rule underline-offset-4">Invitar</span>
        </Link>
      )}

      {/* ── Notas por leer: solo el aviso; se leen dentro del libro ── */}
      {notices.length > 0 && partner && (
        <section className="room-note-notices mt-8 flex flex-col gap-2" aria-label="Notas por leer">
          {notices.map(({ book, slips: { length: count }, slips }, i) => (
            <Link key={book.id} to={`/libro/${book.id}#papeles`} onClick={() => markNoticed(me.id, slips)} className="room-note-notice card pressable rise flex items-center gap-3 px-4 py-3" style={{ '--i': i + 2 } as CSSProperties}>
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

      <div aria-hidden className="room-floor" />
      </div>
      )}

      {/* ── La mesilla ── */}
      {section === 'mesilla' && (
      <section className="mt-4" aria-labelledby="mesilla">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h1 id="mesilla" className="title room-section-title">
            La <em>mesita</em>
          </h1>
          {stand.length > 0 && (
            <Link to="/anadir" className="btn btn-soft room-add !min-h-11 !gap-1.5 !px-4 !text-[16px]">
              <Plus size={18} /> Añadir
            </Link>
          )}
        </div>
        <p className="room-section-caption">{partner ? 'Historias abiertas, compañía cerca.' : 'Tu próxima página te espera.'}</p>
        {stand.length ? (
          <div className="flex flex-col gap-4">
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
                    {(() => {
                      const cards = (
                        <div className="flex flex-col gap-3">
                          {list.map((view, i) => (
                            <OpenBook
                              key={view.book.id}
                              view={view}
                              partner={partner}
                              kind={kind}
                              candle={view === chosen}
                              onMoveCandle={() => (view === chosen ? toast('Tu vela ya es para este libro') : moveCandle(view))}
                              onStatus={() => setStatusFor(view)}
                              i={i}
                            />
                          ))}
                        </div>
                      )
                      // Alone there is one group and nothing to tell apart: no heading, nothing to fold.
                      if (!partner) return cards
                      return (
                        <Fold
                          id={`mesilla:${kind}`}
                          header={
                            <span className="flex items-center gap-2 text-[17px]">
                              <span className="flex items-center -space-x-1">
                                {kind !== 'mine' && <Wax who="you" size={13} />}
                                {kind !== 'theirs' && <Wax who="me" size={13} />}
                              </span>
                              <span className="font-medium">{label}</span>
                              <span className="quiet text-[15px]">· {list.length === 1 ? 'un libro' : `${list.length} libros`}</span>
                            </span>
                          }
                        >
                          <div className="pt-1.5">{cards}</div>
                        </Fold>
                      )
                    })()}
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
      {stand.length > 0 && <ReadingStillLife />}
      </section>
      )}

      {/* ── La estantería ── */}
      {section === 'estanteria' && (
      <section className="mt-4" aria-labelledby="estanteria">
        <div className="mb-1 flex items-center justify-between gap-3">
          <h1 id="estanteria" className="title room-section-title">
            La <em>estantería</em>
          </h1>
          <div className="flex items-center gap-2">
          <Link to="/anadir" className="icon-btn room-add border-[1.5px] border-rule" aria-label="Añadir un libro">
            <Plus size={20} />
          </Link>
          </div>
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
          <div className="room-shelf-tools mt-2 flex flex-wrap gap-2">
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
          {(allPending.length > 0 || allYears.length > 0) && (
            <div role="group" aria-label="Cómo ver la estantería" className="room-view-switch flex rounded-full border-[1.5px] border-rule p-[3px]">
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
        )}

        {pending.length > 0 && (
          <Fold
            id="estanteria:porleer"
            open={searching}
            className="mt-5"
            header={
              <span className="flex items-baseline gap-3">
                <span className="eyebrow">Por leer</span>
                <span className="quiet text-[15px]">{pending.length === 1 ? 'un libro' : `${pending.length} libros`}</span>
              </span>
            }
          >
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
          </Fold>
        )}

        {together && together.length > 0 && (
          <Fold
            id="estanteria:leidos"
            open={searching}
            className="mt-6"
            header={
              <span className="flex items-baseline gap-3">
                <span className="text-[26px]">Leídos</span>
                <span className="quiet text-[15px]">
                  {together.length === 1 ? 'un libro' : `${together.length} libros`} · {order === 'titulo' ? 'por título' : order === 'autor' ? 'por autor' : 'de más a menos estrellas'}
                </span>
              </span>
            }
          >
            <Shelf items={together.map(item((s) => s === 'terminado'))} onOpen={take} view={shelfView} />
          </Fold>
        )}

        {!together && years.map(({ year, books }) => (
          <Fold
            key={year}
            id={`estanteria:${year}`}
            open={searching}
            className="mt-6"
            header={
              <span className="flex items-baseline gap-3">
                <span className="text-[26px]">{year}</span>
                <span className="quiet text-[15px]">
                  {books.length === 1 ? 'un libro' : `${books.length} libros`}
                  {whose === 'todos' && nightsIn(year) > 0 && ` · ${nightsIn(year) === 1 ? 'una noche' : `${nightsIn(year)} noches`}`}
                </span>
              </span>
            }
          >
            <Shelf items={books.map(item((s) => s === 'terminado'))} onOpen={take} view={shelfView} />
            {!searching && whose === 'todos' && (
              <Link to={`/carta/${year}`} className="quiet mt-3 flex min-h-11 items-center gap-2 text-[16px]">
                <Paper size={18} className="flex-none" />
                <span className="underline decoration-rule underline-offset-4">La carta de {year}</span>
              </Link>
            )}
          </Fold>
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
          <Fold
            id="estanteria:dejados"
            open={searching}
            className="mt-8"
            header={
              <span className="flex items-baseline gap-3">
                <span className="eyebrow">{left.length === 1 ? 'Dejado a medias' : 'Dejados a medias'}</span>
                <span className="quiet text-[15px]">{left.length === 1 ? 'un libro' : `${left.length} libros`}</span>
              </span>
            }
          >
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
          </Fold>
        )}
      </section>
      )}

      <Sheet open={choosing} onClose={() => setChoosing(false)} title="Tu vela es para">
        <div role="radiogroup" aria-label="Para qué libro es tu vela" className="flex flex-col gap-2.5">
          {myBooks.map((view) => {
            const on = view === chosen
            return (
              <button
                key={view.book.id}
                type="button"
                role="radio"
                aria-checked={on}
                className={`pressable flex items-center gap-3 rounded-[16px] border-[1.5px] px-3 py-2.5 text-left transition-colors ${on ? 'border-flame bg-surface' : 'border-rule'}`}
                onClick={() => {
                  if (!on) moveCandle(view)
                  setChoosing(false)
                }}
              >
                <Cover book={view.book} width={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[17px] leading-tight">{view.book.title}</span>
                  <span className={`mt-1 flex items-center gap-1 text-[15px] leading-none ${on ? 'text-flame-ink' : 'quiet'}`}>
                    {on && <Flame size={13} className="flex-none" />}
                    <span className="truncate">
                      {fmtPosition(view.mine!)}
                      {view.mine!.unit !== 'porcentaje' && ` · ${Math.round(progressOf(view.mine!) * 100)} %`}
                    </span>
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </Sheet>

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
            {peekReview && <p className="line-clamp-4 text-left text-[16.5px] leading-snug italic">«{peekReview}»</p>}
            <div className="flex w-full flex-col gap-1">
              <button className="btn btn-primary w-full" onClick={() => open(peek.book)}>
                Abrir el libro
              </button>
              {peek.mine && (
                <button
                  className="btn btn-text self-center"
                  onClick={() => {
                    setStatusFor(peek)
                    setPeek(null)
                  }}
                >
                  Cambiar su estado
                </button>
              )}
            </div>
          </div>
        )}
      </Sheet>

      <StatusSheet reading={statusFor?.mine ?? null} book={statusFor?.book} onClose={() => setStatusFor(null)} />

      {(remote.ensayo || status.pending > 0 || status.offline) && (
        <p className="room-sync quiet mt-12 text-center text-[15px]">
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
  /** Filled 0 → 1 while the finger is held, where the finger does not cover it. */
  onHold: (progress: number) => void
  onLight: () => void
  onOpen: () => void
}

/** Your candle: hold a finger on it to light it; once lit, a tap takes you back to your evening. */
function MyCandle({ me, lit, now, lean, ready, onHold, onLight, onOpen }: MyCandleProps) {
  const hold = useHold(onLight)
  useEffect(() => onHold(hold.progress), [hold.progress, onHold])
  const [hint, setHint] = useState(false)
  const release = () => {
    if (!hold.cancel()) return
    // Without a book there is nothing to light for: `onLight` says so.
    if (ready) setHint(true)
    else onLight()
  }
  // A light tick as the wick takes the finger, before the longer one when it catches.
  const began = () => navigator.vibrate?.(6)
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
        if (ready) began()
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
      <Candle color={me.color} lit={lit} wax={lit ? waxLeft(me.candle_lit_at, now) : 1} lean={lean} igniting={hold.progress} inviting={ready} />
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
  onMoveCandle: () => void
  onStatus: () => void
  i: number
}

/**
 * A book open on the nightstand, in a line: its edge is the wax of whoever is in it, and one track carries both
 * bookmarks. The flame says (and chooses) which book the candle is for; «⋯» changes how you have it.
 */
function OpenBook({ view, partner, kind, candle, onMoveCandle, onStatus, i }: OpenBookProps) {
  const { book, mine, theirs } = view
  const present = (r?: typeof mine) => (r && r.status !== 'pendiente' && r.status !== 'dejado' ? r : undefined)
  const place = (r: NonNullable<typeof mine>) => (r.status === 'terminado' ? 'terminado' : fmtPosition(r))
  const edge =
    kind === 'both' ? 'linear-gradient(to bottom, var(--me) 50%, var(--you) 50%)' : kind === 'mine' ? 'var(--me)' : 'var(--you)'
  const me = present(mine)
  const them = partner ? present(theirs) : undefined
  const join = kind === 'theirs' && !mine
  const marks = [them && { who: 'you' as const, at: progressOf(them) }, me && { who: 'me' as const, at: progressOf(me) }].filter(
    (m): m is { who: Person; at: number } => !!m,
  )
  const furthest = Math.max(0, ...marks.map((m) => m.at))
  return (
    <div
      className={`open-book rise relative overflow-hidden rounded-[20px] ${kind === 'theirs' ? 'border-[1.5px] border-rule' : 'card'}`}
      style={{ '--i': i + 2 } as CSSProperties}
    >
      <span aria-hidden className="open-book-edge absolute inset-y-0 left-0 w-[7px]" style={{ background: edge }} />
      <Link to={`/libro/${book.id}`} className={`open-book-link pressable flex items-center gap-3.5 py-3 pl-[20px] ${mine ? 'pr-[52px]' : 'pr-4'}`}>
        <Cover book={book} width={90} />
        <div className="min-w-0 flex-1">
          <h3 className="open-book-title text-[22px] leading-tight">{book.title}</h3>
          <p className="quiet truncate text-[16px] italic">{book.author}</p>
          <div className="relative mt-2 h-[13px]" aria-hidden>
            <div className="absolute inset-x-0 top-[5px] h-[3px] rounded-full bg-rule" />
            <div className="absolute top-[5px] left-0 h-[3px] rounded-full bg-ink/30" style={{ width: `${furthest * 100}%`, transition: 'width 900ms var(--ease)' }} />
            {marks.map((mark) => (
              <span
                key={mark.who}
                className="absolute top-0 h-[13px] w-[13px] -translate-x-1/2 rounded-full"
                style={{
                  left: `clamp(6px, ${mark.at * 100}%, calc(100% - 6px))`,
                  background: mark.who === 'me' ? 'var(--me)' : 'var(--you)',
                  boxShadow: '0 0 0 2px var(--surface), 0 1px 3px rgb(0 0 0 / 0.4)',
                  transition: 'left 900ms var(--ease)',
                }}
              />
            ))}
          </div>
          <p className="quiet mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[15px] leading-snug">
            {me && (
              <span className="flex items-center gap-1.5">
                <Wax who="me" size={9} /> <span><span className="text-ink">Tú</span> {place(me)}</span>
              </span>
            )}
            {them && (
              <span className="flex items-center gap-1.5">
                <Wax who="you" size={9} /> <span><span className="text-ink">{partner!.name}</span> {place(them)}</span>
              </span>
            )}
          </p>
        </div>
      </Link>
      {mine && (
        <div className="open-book-actions absolute inset-y-0 right-1 flex flex-col items-center justify-center">
          {mine.status === 'leyendo' && (
            <button
              type="button"
              className={`grid h-10 w-10 place-items-center rounded-full transition-colors ${candle ? 'text-flame-ink' : 'text-muted opacity-70'}`}
              style={candle ? { background: 'color-mix(in oklab, var(--flame) 18%, transparent)' } : undefined}
              aria-pressed={candle}
              aria-label={candle ? `Tu vela es para ${book.title}` : `Poner mi vela en ${book.title}`}
              onClick={onMoveCandle}
            >
              <Flame size={19} />
            </button>
          )}
          <button type="button" className="grid h-10 w-10 place-items-center rounded-full text-muted" aria-label={`Cambiar el estado de ${book.title}`} onClick={onStatus}>
            <More size={20} />
          </button>
        </div>
      )}
      {!join && <Link to={'/libro/' + book.id} className="open-book-footer"><span>{me ? 'Volver a estas páginas' : 'Descubrir este libro'}</span><span aria-hidden>↗</span></Link>}
      {join && (
        <Link to={`/libro/${book.id}?unirme=1`} className="quiet flex min-h-10 items-center border-t border-rule pl-[20px] text-[15px] underline decoration-rule underline-offset-4">
          Yo también quiero leerlo
        </Link>
      )}
    </div>
  )
}
