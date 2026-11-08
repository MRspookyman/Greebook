import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { Plus, Search, Star } from 'lucide-react'
import { CLOTH_INK, clothFor, Cover } from '@/components/Cover'
import { EmptyState } from '@/components/EmptyState'
import { ProgressBar } from '@/components/ProgressBar'
import { Segmented } from '@/components/Segmented'
import { toast } from '@/components/toast'
import { useMe } from '@/features/auth/me'
import { useReadings, useTogether } from '@/lib/data'
import type { Accent, ReadingWithBook, TogetherItemWithBook } from '@/lib/types'
import { formatPosition, progressFraction } from '@/lib/units'
import { useRooms } from '@/features/us/rooms'
import { answerTogether, startTogether } from '@/features/us/together'
import { fmt, todayISO } from '@/lib/dates'

type Who = 'both' | 'mine' | 'theirs'

/** One book on the year's shelf and who read it. */
interface ShelfBook {
  reading: ReadingWithBook
  readers: Accent[]
}

/** The library of both of you: who is reading what, what you share, and the year's shelf. */
export function LibraryPage() {
  const { userId, profile, partner } = useMe()
  const mineQuery = useReadings(userId)
  const theirsQuery = useReadings(partner?.id)
  const together = useTogether()
  const rooms = useRooms()
  const [who, setWho] = useState<Who>('both')
  const [search, setSearch] = useState('')
  const normalized = search.trim().toLocaleLowerCase('es')
  const matches = (reading: ReadingWithBook) =>
    !normalized ||
    [reading.book.title, ...reading.book.authors].some((text) => text.toLocaleLowerCase('es').includes(normalized))
  const mine = (mineQuery.data ?? []).filter(matches)
  const theirs = (theirsQuery.data ?? []).filter(matches)
  const people: { readings: ReadingWithBook[]; accent: Accent; own: boolean }[] = [
    ...(who !== 'theirs' ? [{ readings: mine, accent: profile.accent, own: true }] : []),
    ...(who !== 'mine' && partner ? [{ readings: theirs, accent: partner.accent, own: false }] : []),
  ]
  const roomBooks = new Set(rooms.map((room) => room.book.id))
  const year = todayISO().slice(0, 4)

  // Reading now: shared books first (both ribbons), then each person's own.
  const sharedNow = rooms.filter((room) => matches(room.mine))
  const ownNow = people.flatMap((person) =>
    person.readings
      .filter((r) => r.status === 'reading' && !roomBooks.has(r.book_id))
      .map((reading) => ({ reading, accent: person.accent, own: person.own })),
  )
  const wanted = people.flatMap((person) =>
    person.readings.filter((r) => r.status === 'want').map((reading) => ({ reading, accent: person.accent })),
  )
  // Finished this year, one spine per book with every reader's dot.
  const shelf = new Map<string, ShelfBook>()
  for (const person of people)
    for (const reading of person.readings)
      if (reading.status === 'finished' && reading.finished_on?.startsWith(year)) {
        const entry = shelf.get(reading.book_id)
        if (entry) entry.readers.push(person.accent)
        else shelf.set(reading.book_id, { reading, readers: [person.accent] })
      }
  const shelfBooks = [...shelf.values()].sort((a, b) =>
    (a.reading.finished_on ?? '').localeCompare(b.reading.finished_on ?? ''),
  )
  const earlier = people.flatMap((person) =>
    person.readings
      .filter((r) => r.status === 'finished' && !r.finished_on?.startsWith(year))
      .map((reading) => ({ reading, accent: person.accent })),
  )
  const abandoned = people.flatMap((person) => person.readings.filter((r) => r.status === 'abandoned'))
  const finishedByBoth =
    partner && who === 'both'
      ? (mineQuery.data ?? []).filter(
          (r) =>
            r.status === 'finished' &&
            matches(r) &&
            (theirsQuery.data ?? []).some((t) => t.book_id === r.book_id && t.status === 'finished'),
        )
      : []
  const togetherList = (together.data ?? []).filter((item) => !roomBooks.has(item.book_id))
  const loading = mineQuery.isPending || (!!partner && theirsQuery.isPending)

  return (
    <section className="space-y-7">
      <header className="enter flex min-h-11 items-center justify-between gap-3">
        <h1 className="display">Biblioteca</h1>
        <Link to="/biblioteca/buscar" className="icon-btn" aria-label="Buscar y añadir un libro">
          <Plus size={22} aria-hidden />
        </Link>
      </header>
      {partner && (
        <Segmented<Who>
          options={[
            { value: 'both', label: 'Los dos' },
            { value: 'mine', label: 'Míos' },
            { value: 'theirs', label: `De ${partner.display_name}` },
          ]}
          value={who}
          onChange={setWho}
          aria-label="De quién son los libros"
        />
      )}
      <label className="relative block">
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted"
          size={18}
          aria-hidden
        />
        <input
          className="input pl-10"
          type="search"
          name="library-search"
          autoComplete="off"
          spellCheck={false}
          aria-label="Buscar por título o autor"
          placeholder="Buscar en vuestra biblioteca"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>

      {loading ? (
        <div className="flex gap-4" role="status" aria-label="Cargando biblioteca">
          {[0, 1, 2].map((index) => (
            <div key={index} className="aspect-[2/3] w-28 animate-pulse rounded-md bg-sunk" />
          ))}
        </div>
      ) : mineQuery.isError ? (
        <EmptyState title="No se pudo cargar la biblioteca">
          <button className="btn btn-outline" onClick={() => void mineQuery.refetch()}>
            Reintentar
          </button>
        </EmptyState>
      ) : (
        <>
          <Shelf
            title="Leyendo ahora"
            empty={normalized ? 'Nada en curso con ese título.' : 'Nadie está leyendo nada ahora mismo.'}
          >
            {who !== 'theirs' || partner
              ? sharedNow.map((room) => (
                  <Tile
                    key={room.book.id}
                    to={`/libro/${room.mine.id}`}
                    reading={room.mine}
                    ribbons={partner ? [partner.accent, profile.accent] : [profile.accent]}
                    caption={`A dúo · tú p. ${room.mine.current_position}, ${partner?.display_name ?? ''} p. ${room.theirs.current_position}`}
                    bars={
                      partner
                        ? [
                            { value: progressFraction(room.theirs), accent: partner.accent },
                            { value: progressFraction(room.mine), accent: profile.accent },
                          ]
                        : []
                    }
                  />
                ))
              : null}
            {ownNow.map(({ reading, accent, own }) => (
              <Tile
                key={reading.id}
                to={`/libro/${reading.id}`}
                reading={reading}
                ribbons={[accent]}
                caption={`${own ? 'Tú' : partner?.display_name} · ${formatPosition(reading)}`}
                bars={[{ value: progressFraction(reading), accent }]}
              />
            ))}
          </Shelf>

          {who === 'both' && partner && (sharedNow.length > 0 || finishedByBoth.length > 0) && (
            <section className="space-y-1" aria-labelledby="duo">
              <h2 id="duo" className="mb-2">
                A dúo
              </h2>
              {sharedNow.map((room) => (
                <Link
                  key={room.book.id}
                  to={`/libro/${room.mine.id}`}
                  className="flex min-h-[72px] items-center gap-3.5 border-t border-rule py-2.5 first-of-type:border-0"
                >
                  <Cover book={room.book} width={48} ribbons={[partner.accent, profile.accent]} />
                  <span className="grid min-w-0 flex-1 gap-0.5">
                    <span className="truncate font-serif text-[17px]">{room.book.title}</span>
                    <span className="text-[13px] text-muted">
                      En curso{room.mine.started_on ? ` desde el ${fmt(room.mine.started_on, "d 'de' MMMM")}` : ''}
                    </span>
                  </span>
                </Link>
              ))}
              {finishedByBoth.map((reading) => (
                <Link
                  key={reading.id}
                  to={`/libro/${reading.id}`}
                  className="flex min-h-[72px] items-center gap-3.5 border-t border-rule py-2.5 first-of-type:border-0"
                >
                  <Cover book={reading.book} width={48} ribbons={[partner.accent, profile.accent]} />
                  <span className="grid min-w-0 flex-1 gap-0.5">
                    <span className="truncate font-serif text-[17px]">{reading.book.title}</span>
                    <span className="text-[13px] text-muted">Terminado por los dos</span>
                  </span>
                </Link>
              ))}
            </section>
          )}

          {who === 'both' && partner && (
            <section className="space-y-3" aria-labelledby="juntos">
              <h2 id="juntos">Queremos leer juntos</h2>
              {together.isPending && <p className="text-sm text-muted">Cargando vuestros libros…</p>}
              {together.isSuccess && !togetherList.length && (
                <p className="text-sm text-muted">Añadid vuestro próximo libro desde su ficha con «Leerlo juntos».</p>
              )}
              {togetherList.map((item) => (
                <TogetherBook key={item.id} item={item} />
              ))}
            </section>
          )}

          {wanted.length > 0 && (
            <section className="space-y-3" aria-labelledby="pendientes">
              <h2 id="pendientes">Pendientes</h2>
              <div className="grid grid-cols-3 gap-x-4 gap-y-5">
                {wanted.map(({ reading, accent }) => (
                  <Link key={reading.id} to={`/libro/${reading.id}`} className="pressable grid min-w-0 gap-2">
                    <Cover book={reading.book} ribbons={who === 'both' ? [accent] : undefined} />
                    <span className="line-clamp-2 text-[13px] font-extrabold leading-snug">{reading.book.title}</span>
                    {who === 'both' && (
                      <span className="sr-only">
                        {accent === profile.accent ? 'Tuyo' : `De ${partner?.display_name}`}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-3" aria-labelledby="leidos">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="leidos">Leídos en {year}</h2>
              <span className="text-sm text-muted">
                {shelfBooks.length} {shelfBooks.length === 1 ? 'libro' : 'libros'}
              </span>
            </div>
            {shelfBooks.length === 0 ? (
              <p className="text-sm text-muted">Aquí irá vuestra estantería del año.</p>
            ) : (
              <>
                <div className="shelf" role="list" aria-label={`Estantería de ${year}`}>
                  {shelfBooks.map(({ reading, readers }) => (
                    <Spine key={reading.book_id} reading={reading} readers={readers} />
                  ))}
                </div>
                {who === 'both' && partner && (
                  <p className="flex flex-wrap gap-x-4 text-[13px] font-bold text-muted">
                    <span className="flex items-center gap-1.5">
                      <i className="h-2.5 w-2.5 rounded-full" style={{ background: `var(--${partner.accent})` }} />
                      {partner.display_name}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <i className="h-2.5 w-2.5 rounded-full" style={{ background: `var(--${profile.accent})` }} />
                      Tú
                    </span>
                  </p>
                )}
              </>
            )}
          </section>

          {(earlier.length > 0 || abandoned.length > 0) && (
            <details className="rule pt-3">
              <summary className="min-h-11 cursor-pointer py-2 font-extrabold">
                Más libros ({earlier.length + abandoned.length})
              </summary>
              <div className="grid grid-cols-3 gap-x-4 gap-y-5 pt-3">
                {[...earlier.map((item) => item.reading), ...abandoned].map((reading) => (
                  <Link key={reading.id} to={`/libro/${reading.id}`} className="pressable grid min-w-0 gap-2">
                    <Cover book={reading.book} />
                    <span className="line-clamp-2 text-[13px] font-extrabold leading-snug">{reading.book.title}</span>
                    <span className="flex items-center gap-1 text-xs text-muted">
                      {reading.status === 'abandoned' ? (
                        'Dejado'
                      ) : reading.rating !== null ? (
                        <>
                          <Star size={12} aria-hidden /> {reading.rating.toLocaleString('es')}
                        </>
                      ) : (
                        reading.finished_on?.slice(0, 4)
                      )}
                    </span>
                  </Link>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </section>
  )
}

function Shelf({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const items = (Array.isArray(children) ? children.flat() : [children]).filter(Boolean)
  return (
    <section className="space-y-3" aria-label={title}>
      <h2>{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <div className="no-scrollbar -mx-5 flex gap-4 overflow-x-auto px-5 pt-1 pb-2">{children}</div>
      )}
    </section>
  )
}

function Tile({
  to,
  reading,
  ribbons,
  caption,
  bars,
}: {
  to: string
  reading: ReadingWithBook
  ribbons: Accent[]
  caption: string
  bars: { value: number; accent: Accent }[]
}) {
  return (
    <Link to={to} className="pressable grid w-28 flex-none content-start gap-2 text-left">
      <Cover book={reading.book} width={112} ribbons={ribbons} />
      <span className="line-clamp-2 text-[13.5px] font-extrabold leading-tight">{reading.book.title}</span>
      <span className="grid gap-[3px]" aria-hidden>
        {bars.map((bar, index) => (
          <ProgressBar key={index} value={bar.value} color={`var(--${bar.accent})`} className="h-1" />
        ))}
      </span>
      <span className="text-[12.5px] leading-snug text-muted">{caption}</span>
    </Link>
  )
}

function Spine({ reading, readers }: { reading: ReadingWithBook; readers: Accent[] }) {
  const pages = reading.book.page_count ?? reading.total_units
  const width = Math.min(44, Math.max(26, 22 + Math.round(pages / 45)))
  const height = 120 + ((reading.book.title.length * 7) % 38)
  return (
    <Link
      role="listitem"
      to={`/libro/${reading.id}`}
      className="spine"
      style={{ width, height, background: clothFor(reading.book.title), color: CLOTH_INK } as CSSProperties}
      aria-label={`${reading.book.title}${reading.finished_on ? `, terminado el ${fmt(reading.finished_on, "d 'de' MMMM")}` : ''}`}
    >
      <span className="absolute top-1.5 left-1/2 flex -translate-x-1/2 gap-0.5" aria-hidden>
        {readers.map((accent, index) => (
          <i
            key={index}
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: `var(--${accent})`, boxShadow: `0 0 0 1.5px ${CLOTH_INK}` }}
          />
        ))}
      </span>
      <span className="spine-title">{reading.book.title}</span>
    </Link>
  )
}

function TogetherBook({ item }: { item: TogetherItemWithBook }) {
  const { userId } = useMe()
  const [busy, setBusy] = useState(false)
  const [date, setDate] = useState(todayISO())
  async function act(action: () => Promise<unknown>) {
    if (busy) return
    setBusy(true)
    try {
      await action()
    } catch {
      toast('No se pudo actualizar el libro')
    } finally {
      setBusy(false)
    }
  }
  return (
    <article className="space-y-3 border-b border-rule py-4">
      <div className="flex gap-3">
        <Cover book={item.book} width={52} />
        <div className="min-w-0">
          <p className="font-serif">{item.book.title}</p>
          {item.reason && <p className="mt-1 text-sm text-muted [overflow-wrap:anywhere]">{item.reason}</p>}
        </div>
      </div>
      {item.start_on ? (
        <p className="text-sm text-muted">Para empezar el {fmt(item.start_on, "d 'de' MMM")}</p>
      ) : item.partner_answer === 'yes' ? (
        <div className="space-y-2">
          <p className="text-sm">¿Empezamos?</p>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn btn-outline"
              disabled={busy}
              onClick={() => void act(() => startTogether(item.id, todayISO()))}
            >
              Hoy
            </button>
            <input
              className="input min-w-0 flex-1"
              type="date"
              aria-label="Fecha para empezar juntos"
              min={todayISO()}
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
            <button
              className="btn btn-soft"
              disabled={busy || !date}
              onClick={() => void act(() => startTogether(item.id, date))}
            >
              Elegir fecha
            </button>
          </div>
        </div>
      ) : item.added_by !== userId ? (
        <div className="flex flex-wrap gap-2">
          <button
            className="btn btn-primary"
            disabled={busy}
            onClick={() => void act(() => answerTogether(item.id, 'yes'))}
          >
            Me apetece
          </button>
          <button
            className="btn btn-ghost"
            disabled={busy || item.partner_answer === 'later'}
            onClick={() => void act(() => answerTogether(item.id, 'later'))}
          >
            {item.partner_answer === 'later' ? 'Para otro día' : 'Otro día'}
          </button>
        </div>
      ) : (
        <p className="text-xs text-muted">
          {item.partner_answer === 'later' ? 'Lo guardáis para otro día' : 'Esperando su respuesta'}
        </p>
      )}
    </article>
  )
}
