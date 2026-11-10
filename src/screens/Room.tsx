import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { chooseCandle, lightCandle } from '@/lib/actions'
import {
  bookViews, candleReading, dropped, fmtPosition, heldBy, isLit, isNext, live, nightstand, pile, progressOf, shelves, standGroups,
  waxLeft, type BookView, type Whose,
} from '@/lib/model'
import { nightsLine, nightsOf, sharedNights } from '@/lib/nights'
import { waitingFor, slipPlace, type Waiting } from '@/lib/slips'
import { useSyncStatus } from '@/lib/sync/store'
import { capital, fmtSince, fmtToday, nightOf } from '@/lib/time'
import type { Book, Profile } from '@/lib/types'
import { memoryFor, memoryLine } from '@/lib/memory'
import { usePeople, useNow, useSession, useWink } from '@/session'
import { Cover, Lying } from '@/ui/Book'
import { Candle } from '@/ui/Candle'
import { Envelope, Flame, Plus } from '@/ui/icons'
import { Plank, Shelf, type ShelfItem } from '@/ui/Shelf'
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
  const waiting = useMemo(() => waitingFor(db, me.id), [db, me.id])
  const [whose, setWhose] = useState<Whose>('todos')
  const groups = standGroups(stand)
  const myOpen = groups.both.length + groups.mine.length
  const allPending = pile(views)
  const allYears = shelves(views)
  const pending = allPending.filter((view) => heldBy(view, whose, 'pendiente'))
  const years = allYears
    .map(({ year, books }) => ({ year, books: books.filter((view) => heldBy(view, whose, 'terminado')) }))
    .filter(({ books }) => books.length > 0)
  const myNext = pending.find((view) => isNext(view.mine))
  const theirNext = pending.find((view) => isNext(view.theirs))
  const left = dropped(views)
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
  })
  const open = (book: Book) => navigate(`/libro/${book.id}`)
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

      {/* ── Lo que te espera ── */}
      {waiting.length > 0 && partner && (
        <section className="mt-9 flex flex-col gap-3" aria-label="Te espera">
          {waiting.map((thing, i) => (
            <WaitingCard key={thing.kind + thing.book.id + ('slip' in thing ? thing.slip.id : '')} thing={thing} name={partner.name} i={i}
              mine={views.find((v) => v.book.id === thing.book.id)?.mine} />
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

      {chosen?.mine && (
        <Link to="/mesilla" className="quiet mt-9 flex min-h-11 items-center justify-center gap-2 text-center text-[16px]">
          <Flame size={17} className="flex-none text-flame-ink" />
          <span className="min-w-0 truncate">
            Tu vela es para <em className="text-ink">{chosen.book.title}</em> · {fmtPosition(chosen.mine)}
          </span>
        </Link>
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
        <div className="mb-1 flex items-center justify-between">
          <h1 id="estanteria" className="title">
            La estantería
          </h1>
        </div>

        {partner && (allPending.length > 0 || allYears.length > 0) && (
          <div role="group" aria-label="De quién son las cintas. Toca para ver solo esos libros" className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 py-1">
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
            <Shelf items={pending.map(item((s) => s === 'pendiente'))} onOpen={open} />
          </div>
        )}

        {years.map(({ year, books }) => (
          <div key={year} className="mt-8">
            <p className="flex items-baseline gap-3">
              <span className="text-[26px]">{year}</span>
              <span className="quiet text-[15px]">
                {books.length === 1 ? 'un libro' : `${books.length} libros`}
                {whose === 'todos' && nightsIn(year) > 0 && ` · ${nightsIn(year) === 1 ? 'una noche' : `${nightsIn(year)} noches`}`}
              </span>
            </p>
            <Shelf items={books.map(item((s) => s === 'terminado'))} onOpen={open} />
          </div>
        ))}

        {!years.length && !pending.length && (
          <p className="quiet mt-5">
            {allYears.length || allPending.length
              ? 'Todavía no hay ningún libro así en la estantería.'
              : 'Aquí irán quedando los lomos de lo que leáis. Cada uno con su cinta.'}
          </p>
        )}

        {left.length > 0 && (
          <div className="mt-10">
            <p className="eyebrow">{left.length === 1 ? 'Dejado a medias' : 'Dejados a medias'}</p>
            <div className="mt-3 flex flex-col-reverse items-center gap-[2px] px-3">
              {left.map((view, i) => (
                <Lying key={view.book.id} book={view.book} onClick={() => open(view.book)} style={{ marginLeft: ((i % 3) - 1) * 16 }} />
              ))}
            </div>
            <Plank />
          </div>
        )}
      </section>
      )}

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

/** Something of theirs you can open now: a slip that fell out of the book, or an envelope. */
function WaitingCard({ thing, name, i, mine }: { thing: Waiting; name: string; i: number; mine?: BookView['mine'] }) {
  const title = <em>{thing.book.title}</em>
  const tab = <span aria-hidden className="absolute inset-y-0 left-0 w-[5px] rounded-l-[3px]" style={{ background: 'var(--you)' }} />
  if (thing.kind === 'papel') {
    const place = slipPlace(thing.slip, mine)
    return (
      <Link to={`/libro/${thing.book.id}#papeles`} className="slip slip-folded drop pressable block" style={{ '--i': i, rotate: i % 2 ? '0.6deg' : '-0.8deg' } as CSSProperties}>
        {tab}
        <span className="hand block">Entre las páginas había algo de {name}</span>
        <span className="mt-1 block text-[15px] opacity-70">
          {place && `${place} · `}
          {title}
          {thing.opening ? ' · se abrirá en cuanto haya conexión' : ''}
        </span>
      </Link>
    )
  }
  return (
    <Link to={`/libro/${thing.book.id}#sobre`} className="slip drop pressable flex items-center gap-3" style={{ '--i': i, backgroundImage: 'none' } as CSSProperties}>
      {tab}
      <Envelope size={26} className="flex-none opacity-70" />
      <span className="text-[17px] leading-snug">
        {thing.kind === 'sobre' ? <>El sobre de {title} ya se puede abrir.</> : <>{name} ha dejado su carta en {title}. Escribe la tuya y se abre.</>}
      </span>
    </Link>
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
