import { useState } from 'react'
import { Link } from 'react-router'
import { Plus, Search } from 'lucide-react'
import { Cover } from '@/components/Cover'
import { Spine } from '@/components/Spine'
import { EmptyState } from '@/components/EmptyState'
import { ProgressBar } from '@/components/ProgressBar'
import { Segmented } from '@/components/Segmented'
import { FilterChips } from '@/components/FilterChips'
import { toast } from '@/components/toast'
import { useMe } from '@/features/auth/me'
import { useReadings, useTogether } from '@/lib/data'
import type { Accent, Format, ReadingStatus, ReadingWithBook, TogetherItemWithBook } from '@/lib/types'
import { formatFinished, formatLabel, formatPosition, progressFraction } from '@/lib/units'
import { useRooms } from '@/features/us/rooms'
import { answerTogether, startTogether } from '@/features/us/together'
import { fmt, todayISO } from '@/lib/dates'

type Who = 'both' | 'mine' | 'theirs'
type View = ReadingStatus | 'together' | 'all'
const views = [
  { value: 'all', label: 'Todo' },
  { value: 'reading', label: 'Leyendo' },
  { value: 'want', label: 'Pendientes' },
  { value: 'finished', label: 'Leídos' },
  { value: 'together', label: 'Juntos' },
  { value: 'abandoned', label: 'Dejados' },
] as const

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
  const [view, setView] = useState<View>('all')
  const [year, setYear] = useState('all')
  const [format, setFormat] = useState<Format | 'all'>('all')
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
  const finished = people.flatMap((person) => person.readings.filter((reading) => reading.status === 'finished'))
  const years = [...new Set(finished.flatMap((reading) => reading.finished_on ? [reading.finished_on.slice(0, 4)] : []))]
    .sort((a, b) => b.localeCompare(a))

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
  // One spine per book with every reader's dot, across the selected year and format.
  const shelf = new Map<string, ShelfBook>()
  for (const person of people)
    for (const reading of person.readings)
      if (reading.status === 'finished' &&
        (year === 'all' || reading.finished_on?.startsWith(year)) &&
        (format === 'all' || reading.format === format)) {
        const entry = shelf.get(reading.book_id)
        if (entry) entry.readers.push(person.accent)
        else shelf.set(reading.book_id, { reading, readers: [person.accent] })
      }
  const shelfBooks = [...shelf.values()].sort((a, b) =>
    (a.reading.finished_on ?? '').localeCompare(b.reading.finished_on ?? ''),
  )
  const abandoned = people.flatMap((person) => person.readings.filter((r) => r.status === 'abandoned'))
  const finishedByBoth =
    partner && (who === 'both' || view === 'together')
      ? (mineQuery.data ?? []).filter(
          (r) =>
            r.status === 'finished' &&
            matches(r) &&
            (theirsQuery.data ?? []).some((t) => t.book_id === r.book_id && t.status === 'finished'),
        )
      : []
  const togetherList = (together.data ?? []).filter((item) =>
    !roomBooks.has(item.book_id) &&
    (!normalized || [item.book.title, ...item.book.authors].some((text) => text.toLocaleLowerCase('es').includes(normalized))),
  )
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
      <div role="group" aria-label="Vista de biblioteca" className="no-scrollbar flex gap-3 overflow-x-auto py-1">
        {views.map((option) => {
          const books = option.value === 'together'
            ? [...sharedNow.map((room) => room.book), ...togetherList.map((item) => item.book)]
            : people.flatMap((person) => person.readings)
              .filter((reading) => option.value === 'all' || reading.status === option.value)
              .map((reading) => reading.book)
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={view === option.value}
              onClick={() => setView(option.value)}
              className={`pressable w-32 flex-none rounded-card border p-3 text-left ${view === option.value ? 'border-accent bg-soft text-accent' : 'border-rule bg-surface'}`}
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="font-serif">{option.label}</span>
                <span className="folio text-sm">{books.length}</span>
              </span>
              <span className="mt-3 flex min-h-12 -space-x-3" aria-hidden>
                {books.slice(0, 3).map((book, index) => (
                  <span key={`${book.id}:${index}`} className="relative" style={{ zIndex: 3 - index }}>
                    <Cover book={book} width={30} />
                  </span>
                ))}
              </span>
            </button>
          )
        })}
      </div>

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
          {(view === 'all' || view === 'reading') && (
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
                    caption={`A dúo · tú ${formatPosition(room.mine)}, ${partner?.display_name ?? ''} ${formatPosition(room.theirs)}`}
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
          )}

          {(view === 'all' || view === 'together') && (who === 'both' || view === 'together') && partner && (sharedNow.length > 0 || finishedByBoth.length > 0) && (
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

          {(view === 'all' || view === 'together') && (who === 'both' || view === 'together') && partner && (
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
          {view === 'together' && !partner && <p className="text-sm text-muted">Vuestra biblioteca conjunta aparecerá al vincular la pareja.</p>}

          {(view === 'all' || view === 'want') && (
            <section className="space-y-3" aria-labelledby="pendientes">
              <h2 id="pendientes">Pendientes</h2>
              {wanted.length === 0 && <p className="text-sm text-muted">No hay libros pendientes.</p>}
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

          {(view === 'all' || view === 'finished') && (
          <section className="space-y-3" aria-labelledby="leidos">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="leidos">{year === 'all' ? 'Leídos' : `Leídos en ${year}`}</h2>
              <span className="text-sm text-muted">
                {shelfBooks.length} {shelfBooks.length === 1 ? 'libro' : 'libros'}
              </span>
            </div>
            <FilterChips
              aria-label="Año de finalización"
              options={[{ value: 'all', label: 'Todos' }, ...years.map((value) => ({ value, label: value }))]}
              value={year}
              onChange={setYear}
            />
            <FilterChips
              aria-label="Formato de los libros leídos"
              options={[{ value: 'all', label: 'Todos' }, ...(['paper', 'ebook'] as const).map((value) => ({ value, label: formatLabel(value) }))]}
              value={format}
              onChange={setFormat}
            />
            {shelfBooks.length === 0 ? (
              <p className="text-sm text-muted">No hay libros leídos con estos filtros.</p>
            ) : (
              <>
                <div className="shelf" role="list" aria-label={year === 'all' ? 'Estantería de leídos' : `Estantería de ${year}`}>
                  {shelfBooks.map(({ reading, readers }) => (
                    <div key={reading.book_id} role="listitem">
                      <Spine reading={reading} readers={readers} />
                      {reading.finished_on && <p className="mt-1 text-xs text-muted">{formatFinished(reading.finished_on, reading.finished_precision)}</p>}
                    </div>
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
          )}

          {(view === 'all' || view === 'abandoned') && (
            <section className="space-y-3" aria-labelledby="dejados">
              <h2 id="dejados">Dejados</h2>
              {abandoned.length === 0 && <p className="text-sm text-muted">No hay libros dejados.</p>}
              <div className="grid grid-cols-3 gap-x-4 gap-y-5">
                {abandoned.map((reading) => (
                  <Link key={reading.id} to={`/libro/${reading.id}`} className="pressable grid min-w-0 gap-2">
                    <Cover book={reading.book} />
                    <span className="line-clamp-2 text-[13px] font-extrabold leading-snug">{reading.book.title}</span>
                    <span className="text-xs text-muted">Dejado · {formatLabel(reading.format)}</span>
                  </Link>
                ))}
              </div>
            </section>
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
