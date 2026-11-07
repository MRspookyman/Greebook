import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { ArrowDownUp, Plus, Search } from 'lucide-react'
import { Cover } from '@/components/Cover'
import { EmptyState } from '@/components/EmptyState'
import { ProgressBar } from '@/components/ProgressBar'
import { toast } from '@/components/toast'
import { useMe } from '@/features/auth/me'
import { useReadings, useTogether } from '@/lib/data'
import type { ReadingStatus, ReadingWithBook, TogetherItemWithBook } from '@/lib/types'
import { coverBadge, progressFraction } from '@/lib/units'
import { useRooms } from '@/features/us/rooms'
import { answerTogether, startTogether } from '@/features/us/together'
import { fmt, todayISO } from '@/lib/dates'

const shelves = [
  { value: 'reading', label: 'Leyendo' },
  { value: 'want', label: 'Pendientes' },
  { value: 'finished', label: 'Leídos' },
  { value: 'abandoned', label: 'Dejados' },
  { value: 'together', label: 'Juntos' },
] as const

type View = ReadingStatus | 'together'
type Sort = 'recent' | 'title' | 'progress' | 'rating'

/** What a cover's badge says, in words, for screen readers. */
function spokenState(reading: ReadingWithBook): string {
  switch (reading.status) {
    case 'reading':
      return `${Math.round(progressFraction(reading) * 100)} % leído`
    case 'finished':
      return reading.rating !== null ? `${reading.rating.toLocaleString('es')} estrellas` : 'leído'
    case 'abandoned':
      return reading.unit === 'pages' ? `dejado en la página ${reading.current_position}` : 'dejado'
    default:
      return 'pendiente'
  }
}

export function LibraryPage() {
  const { userId, partner, profile } = useMe()
  const readings = useReadings(userId)
  const partnerReadings = useReadings(partner?.id)
  // Books your partner also has (any shelf): a small mark on the cover links both libraries.
  const partnerBooks = new Set((partnerReadings.data ?? []).map((reading) => reading.book_id))
  const together = useTogether()
  const rooms = useRooms()
  const [view, setView] = useState<View>('reading')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<Sort>('recent')
  const normalized = search.trim().toLocaleLowerCase('es')
  const matches = (book: { title: string; authors: string[] }) =>
    [book.title, ...book.authors].some((text) => text.toLocaleLowerCase('es').includes(normalized))
  const sortOptions: { value: Sort; label: string }[] = [
    { value: 'recent', label: 'Recientes' },
    { value: 'title', label: 'Título' },
    ...(view === 'reading' ? [{ value: 'progress' as const, label: 'Progreso' }] : []),
    ...(view === 'finished' ? [{ value: 'rating' as const, label: 'Nota' }] : []),
  ]
  const activeSort = sortOptions.some((option) => option.value === sort) ? sort : 'recent'
  const visible = (readings.data ?? [])
    .filter((reading) => reading.status === view && matches(reading.book))
    .sort((a, b) => {
      if (activeSort === 'title') return a.book.title.localeCompare(b.book.title, 'es')
      if (activeSort === 'rating') return (b.rating ?? -1) - (a.rating ?? -1)
      if (activeSort === 'progress') return progressFraction(b) - progressFraction(a)
      return b.updated_at.localeCompare(a.updated_at)
    })
  const list = (together.data ?? []).filter(
    (item) => !rooms.some((room) => room.book.id === item.book_id) && matches(item.book),
  )
  const sharedRooms = rooms.filter((room) => matches(room.book))
  const year = todayISO().slice(0, 4)
  const finishedThisYear = (readings.data ?? []).filter(
    (reading) => reading.status === 'finished' && reading.finished_on?.startsWith(year),
  ).length
  const count = (value: View) =>
    value === 'together'
      ? rooms.length +
        (together.data ?? []).filter((item) => !rooms.some((room) => room.book.id === item.book_id)).length
      : (readings.data ?? []).filter((reading) => reading.status === value).length

  return (
    <section className="flex flex-col gap-4">
      <header className="enter flex min-h-11 items-center justify-between gap-3">
        <h1 className="display">Biblioteca</h1>
        <Link to="/biblioteca/buscar" className="icon-btn" aria-label="Añadir un libro">
          <Plus size={23} />
        </Link>
      </header>
      <label className="relative block">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" size={18} />
        <input
          className="input pl-10"
          type="search"
          name="library-search"
          autoComplete="off"
          spellCheck={false}
          aria-label="Buscar en tu biblioteca por título o autor"
          placeholder="Buscar en tus libros…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <div
        role="group"
        aria-label="Estanterías"
        className="no-scrollbar -mx-[22px] flex gap-2 overflow-x-auto px-[22px] py-0.5"
      >
        {shelves.map((shelf) => {
          const n = count(shelf.value)
          if (shelf.value === 'abandoned' && n === 0) return null
          return (
            <button
              key={shelf.value}
              type="button"
              className="chip flex-none"
              aria-pressed={view === shelf.value}
              onClick={() => setView(shelf.value)}
            >
              {shelf.label}
              <span className={view === shelf.value ? 'opacity-80' : 'text-muted'}>{n}</span>
            </button>
          )
        })}
      </div>
      {view !== 'together' && (readings.data?.length ?? 0) > 0 && (
        <div className="flex min-h-11 items-center justify-between gap-3">
          {view === 'finished' ? (
            <div className="flex min-w-0 flex-1 items-center gap-3 text-[14px]">
              <span className="flex-none">
                <span className="figure text-[16px]">{finishedThisYear}</span>{' '}
                <span className="text-muted">
                  de {profile.yearly_goal} en {year}
                </span>
              </span>
              <ProgressBar
                value={profile.yearly_goal ? finishedThisYear / profile.yearly_goal : 0}
                className="h-[6px] max-w-32 flex-1"
                label="Objetivo del año"
              />
            </div>
          ) : (
            <p className="text-[14px] text-muted">
              {visible.length} {visible.length === 1 ? 'libro' : 'libros'}
            </p>
          )}
          <label className="flex flex-none items-center gap-1.5 text-[14px] text-muted">
            <ArrowDownUp size={15} aria-hidden />
            <span className="sr-only">Ordenar por</span>
            <select
              className="min-h-11 cursor-pointer appearance-none bg-transparent pr-1 text-[14px] font-medium text-ink"
              value={activeSort}
              onChange={(event) => setSort(event.target.value as Sort)}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {view === 'together' ? (
        <div className="space-y-4">
          {sharedRooms.length > 0 && (
            <section className="space-y-1">
              <h2>Salas abiertas</h2>
              {sharedRooms.map((room) => (
                <Link
                  key={room.book.id}
                  className="pressable flex items-center gap-4 border-b border-rule py-3"
                  to={`/sala/${room.book.id}`}
                >
                  <Cover book={room.book} width={48} />
                  <div className="min-w-0">
                    <p className="font-serif text-[17px]">{room.book.title}</p>
                    <p className="text-[13px] text-muted">Abrir la sala</p>
                  </div>
                </Link>
              ))}
            </section>
          )}
          <section className="space-y-1">
            <h2>Queremos leer juntos</h2>
            {together.isPending && <p className="text-sm text-muted">Cargando vuestros libros…</p>}
            {together.isError && (
              <button className="btn btn-secondary" onClick={() => void together.refetch()}>
                Reintentar
              </button>
            )}
            {together.isSuccess && !list.length && (
              <p className="text-sm text-muted">
                {normalized
                  ? 'No hay libros con ese título o autor.'
                  : 'Añadid vuestro próximo libro desde su ficha con «Leerlo juntos».'}
              </p>
            )}
            {list.map((item) => (
              <TogetherBook key={item.id} item={item} />
            ))}
          </section>
        </div>
      ) : readings.isPending ? (
        <div className="grid animate-pulse grid-cols-3 gap-x-3.5 gap-y-5" role="status" aria-label="Cargando biblioteca">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div key={index} className="aspect-[2/3] rounded-[3px] bg-border" />
          ))}
        </div>
      ) : readings.isError ? (
        <EmptyState title="No se pudo cargar tu biblioteca">
          <button className="btn btn-secondary" onClick={() => void readings.refetch()}>
            Reintentar
          </button>
        </EmptyState>
      ) : !visible.length ? (
        <EmptyState
          title={
            normalized
              ? 'No hay libros con ese título o autor'
              : view === 'reading'
                ? 'Ahora mismo no estás leyendo nada'
                : view === 'finished'
                  ? 'Aquí irán los libros que termines'
                  : 'Tu próxima lectura está por descubrir'
          }
        >
          <Link className="btn btn-primary" to="/biblioteca/buscar">
            Buscar un libro
          </Link>
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-3 gap-x-3.5 gap-y-5">
          {visible.map((reading, index) => {
            const shared = partner && partnerBooks.has(reading.book_id)
            return (
              <li key={reading.id} className="min-w-0">
                <Link
                  to={`/libro/${reading.id}`}
                  viewTransition
                  className="pressable enter flex min-w-0 flex-col gap-2"
                  style={{ '--i': Math.min(index, 11) } as CSSProperties}
                  aria-label={`${reading.book.title}, ${reading.book.authors.join(', ') || 'autor desconocido'}: ${spokenState(reading)}${
                    shared ? `. ${partner.display_name} también lo tiene` : ''
                  }`}
                >
                  <Cover book={reading.book} badge={coverBadge(reading)} transitionName={`cover-${reading.id}`}>
                    {shared && (
                      <span className="cover-mark" style={{ color: `var(--${partner.accent})` }} aria-hidden>
                        {partner.display_name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </Cover>
                  <span className="line-clamp-2 font-serif text-[15px] leading-snug">{reading.book.title}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
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
          {item.partner_answer === 'later' ? 'Lo guardáis para otro día' : 'Esperando a que a tu pareja le apetezca'}
        </p>
      )}
    </article>
  )
}
