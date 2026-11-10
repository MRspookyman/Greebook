import { useMemo, type CSSProperties, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { lightCandle } from '@/lib/actions'
import {
  bookViews, candleReading, dropped, fmtPosition, isLit, live, nightstand, pile, shelves, waxLeft, type BookView,
} from '@/lib/model'
import { nightsLine, nightsOf, sharedNights } from '@/lib/nights'
import { waitingFor, slipPlace, type Waiting } from '@/lib/slips'
import { useSyncStatus } from '@/lib/sync/store'
import { fmtSince, fmtToday, nightOf } from '@/lib/time'
import type { Book, Profile } from '@/lib/types'
import { memoryFor, memoryLine } from '@/lib/memory'
import { usePeople, useNow, useSession, useWink } from '@/session'
import { Cover } from '@/ui/Book'
import { Candle } from '@/ui/Candle'
import { Envelope, Flame, Plus } from '@/ui/icons'
import { Rail } from '@/ui/Rail'
import { Plank, Shelf, type ShelfItem } from '@/ui/Shelf'
import { toast } from '@/ui/toast'
import { useHold } from '@/ui/useHold'

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/** The whole app is this room: the sill with your two candles, the nightstand, and the shelf below. */
export function Room() {
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
  const pending = pile(views)
  const years = shelves(views)
  const left = dropped(views)
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
  const empty = !stand.length && !pending.length && !years.length

  return (
    <main className="relative mx-auto min-h-dvh max-w-xl overflow-x-clip px-5 pb-20">
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
        className="relative flex items-center justify-between"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 14px)' }}
      >
        <p className="eyebrow">{capital(fmtToday(new Date(now)))}</p>
        <Link
          to="/ajustes"
          aria-label="Tu vela y tu cuenta"
          className="grid h-11 w-11 place-items-center rounded-full text-[17px] font-medium text-[#22201a]"
          style={{ background: 'var(--me)' }}
        >
          {me.name.charAt(0).toUpperCase()}
        </Link>
      </header>

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
              <p className="quiet text-[14px]">{theirsLit ? `lee ${fmtSince(partner.candle_lit_at!, now)}` : 'apagada'}</p>
            </div>
          )}
          <div className="w-[120px]">
            <p className="text-[18px]">Tú</p>
            <p className="quiet text-[14px]">{mineLit ? `lees ${fmtSince(me.candle_lit_at!, now)}` : 'mantén para encender'}</p>
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

      {/* ── La mesilla ── */}
      <section className="mt-12" aria-labelledby="mesilla">
        <h2 id="mesilla" className="eyebrow mb-3">
          En la mesilla
        </h2>
        {stand.length ? (
          <div className="flex flex-col gap-3">
            {stand.map((view, i) => (
              <OpenBook
                key={view.book.id}
                view={view}
                me={me}
                partner={partner}
                mineLit={mineLit}
                theirsLit={theirsLit}
                forCandle={view === chosen && stand.filter((v) => v.mine?.status === 'leyendo').length > 1}
                i={i}
              />
            ))}
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

      {/* ── La estantería ── */}
      <section className="mt-14" aria-labelledby="estanteria">
        <div className="mb-1 flex items-center justify-between">
          <h2 id="estanteria" className="title">
            La estantería
          </h2>
          <Link to="/anadir" className="icon-btn -mr-2 bg-ink/10" aria-label="Añadir un libro">
            <Plus />
          </Link>
        </div>

        {pending.length > 0 && (
          <div className="mt-5">
            <p className="eyebrow">Por leer</p>
            <Shelf items={pending.map(item((s) => s === 'pendiente'))} onOpen={open} />
          </div>
        )}

        {years.map(({ year, books }) => (
          <div key={year} className="mt-8">
            <p className="flex items-baseline gap-3">
              <span className="text-[26px]">{year}</span>
              <span className="quiet text-[15px]">
                {books.length === 1 ? 'un libro' : `${books.length} libros`}
                {nightsIn(year) > 0 && ` · ${nightsIn(year) === 1 ? 'una noche' : `${nightsIn(year)} noches`}`}
              </span>
            </p>
            <Shelf items={books.map(item((s) => s === 'terminado'))} onOpen={open} />
          </div>
        ))}

        {!years.length && !pending.length && (
          <p className="quiet mt-4">Aquí irán quedando los lomos de lo que leáis. Cada uno con su cinta.</p>
        )}

        {left.length > 0 && (
          <details className="mt-10">
            <summary className="quiet min-h-11 cursor-pointer text-[16px]">
              {left.length === 1 ? 'Un libro dejado a medias' : `${left.length} libros dejados a medias`}
            </summary>
            <ul className="mt-1">
              {left.map((view) => (
                <li key={view.book.id}>
                  <Link to={`/libro/${view.book.id}`} className="flex min-h-11 items-center underline decoration-rule underline-offset-4">
                    {view.book.title}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {(remote.ensayo || status.pending > 0 || status.offline) && (
        <p className="quiet mt-12 text-center text-[13.5px]">
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
  const release = () => {
    if (!hold.cancel()) return
    // Without a book there is nothing to light for: `onLight` says so.
    if (ready) toast('Mantén el dedo un momento sobre la vela')
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
        {thing.kind === 'sobre' ? <>El sobre de {title} ya se puede abrir.</> : <>{name} ya ha puesto su valoración de {title}. Pon la tuya y se abre el sobre.</>}
      </span>
    </Link>
  )
}

interface OpenBookProps {
  view: BookView
  me: Profile
  partner: Profile | null
  /** Whose candle is burning for this book right now. */
  mineLit: boolean
  theirsLit: boolean
  /** With several books of mine open: this is the one the candle would be lit for. */
  forCandle: boolean
  i: number
}

/** A book open on the nightstand: whose it is (yours, theirs or both) and who is reading it this minute. */
function OpenBook({ view, me, partner, mineLit, theirsLit, forCandle, i }: OpenBookProps) {
  const { book, mine, theirs } = view
  const open = (r?: typeof mine) => (r?.status === 'leyendo' ? r : undefined)
  const rows = [
    open(mine) && { who: 'Tú', color: 'var(--me)', reading: mine!, lit: mineLit && me.candle_reading_id === mine!.id, verb: 'leyendo ahora' },
    open(theirs) && partner && {
      who: partner.name, color: 'var(--you)', reading: theirs!, lit: theirsLit && partner.candle_reading_id === theirs!.id, verb: 'leyendo ahora',
    },
  ].filter((row): row is { who: string; color: string; reading: NonNullable<typeof mine>; lit: boolean; verb: string } => !!row)
  const both = rows.length === 2
  return (
    <Link to={`/libro/${book.id}`} className="card pressable rise flex gap-4 p-4" style={{ '--i': i + 2 } as CSSProperties}>
      <Cover book={book} width={66} />
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 py-0.5">
        <div>
          <p className="eyebrow !text-[10.5px]">{both ? 'Lo leéis los dos' : rows[0]?.who === 'Tú' ? 'Lo lees tú' : `Lo lee ${rows[0]?.who}`}</p>
          <h3 className="mt-0.5 line-clamp-2 text-[20px] leading-tight">{book.title}</h3>
          <p className="quiet truncate text-[15.5px] italic">{book.author}</p>
        </div>
        <div>
          <Rail mine={open(mine)} theirs={open(theirs)} />
          <ul className="mt-1.5 flex flex-col gap-0.5 text-[14.5px]">
            {rows.map((row) => (
              <li key={row.who} className="flex items-center gap-2">
                <span aria-hidden className="h-3 w-[7px] flex-none rounded-[1px]" style={{ background: row.color }} />
                <span className="font-medium">{row.who}</span>
                <span className="quiet">{fmtPosition(row.reading)}</span>
                {row.lit ? (
                  <span className="flex items-center gap-1 text-flame-ink">
                    <Flame size={14} /> {row.verb}
                  </span>
                ) : (
                  row.who === 'Tú' && forCandle && <span className="quiet">· tu vela es para este</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Link>
  )
}
