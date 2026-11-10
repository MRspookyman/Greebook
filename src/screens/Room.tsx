import { useMemo, type CSSProperties, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { lightCandle } from '@/lib/actions'
import {
  bookViews, candleReading, dropped, fmtPosition, isLit, live, nightstand, pile, shelves, waxLeft, type BookView,
} from '@/lib/model'
import { nightsLine, nightsOf, sharedNights } from '@/lib/nights'
import { useSyncStatus } from '@/lib/sync/store'
import { fmtSince, fmtToday, nightOf } from '@/lib/time'
import type { Book, Profile } from '@/lib/types'
import { usePeople, useNow, useSession } from '@/session'
import { Cover } from '@/ui/Book'
import { Candle } from '@/ui/Candle'
import { Plus } from '@/ui/icons'
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
            <div className="rise flex flex-col items-center">
              <Candle color={partner.color} lit={theirsLit} wax={theirsLit ? waxLeft(partner.candle_lit_at, now) : 1} lean={mineLit ? 1 : 0} />
            </div>
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
      </section>

      {/* ── La mesilla ── */}
      <section className="mt-12" aria-labelledby="mesilla">
        <h2 id="mesilla" className="eyebrow mb-3">
          En la mesilla
        </h2>
        {stand.length ? (
          <div className="flex flex-col gap-3">
            {stand.map((view, i) => (
              <OpenBook key={view.book.id} view={view} partner={partner} forCandle={view === chosen} i={i} />
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
            : status.pending
              ? `Sin conexión: ${status.pending === 1 ? 'un cambio espera' : `${status.pending} cambios esperan`} en este móvil.`
              : 'Sin conexión. Todo sigue funcionando.'}
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

/** A book open on the nightstand, with the ribbons of whoever is in it. */
function OpenBook({ view, partner, forCandle, i }: { view: BookView; partner: Profile | null; forCandle: boolean; i: number }) {
  const { book, mine, theirs } = view
  const reading = (r?: typeof mine) => (r && r.status !== 'pendiente' && r.status !== 'dejado' ? r : undefined)
  const where = [
    reading(mine) && `Tú, ${mine!.status === 'terminado' ? 'terminado' : fmtPosition(mine!)}`,
    reading(theirs) && partner && `${partner.name}, ${theirs!.status === 'terminado' ? 'terminado' : fmtPosition(theirs!)}`,
  ].filter(Boolean)
  return (
    <Link
      to={`/libro/${book.id}`}
      className="card pressable rise flex gap-4 p-4"
      style={{ '--i': i + 2 } as CSSProperties}
    >
      <Cover book={book} width={62} />
      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div>
          <h3 className="line-clamp-2 text-[20px] leading-tight">{book.title}</h3>
          <p className="quiet truncate text-[15.5px] italic">{book.author}</p>
        </div>
        <div>
          <Rail mine={reading(mine)} theirs={reading(theirs)} />
          <p className="quiet mt-1 text-[14.5px]">
            {where.join(' · ')}
            {forCandle && mine?.status === 'leyendo' && where.length < 2 && ' · tu vela es para este'}
          </p>
        </div>
      </div>
    </Link>
  )
}
