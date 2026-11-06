import { useState } from 'react'
import { Link } from 'react-router'
import { Plus, Search, Star } from 'lucide-react'
import { Cover } from '@/components/Cover'
import { EmptyState } from '@/components/EmptyState'
import { Segmented } from '@/components/Segmented'
import { toast } from '@/components/toast'
import { useMe } from '@/features/auth/me'
import { useReadings, useTogether } from '@/lib/data'
import type { ReadingStatus, TogetherItemWithBook } from '@/lib/types'
import { progressFraction } from '@/lib/units'
import { useRooms } from '@/features/us/rooms'
import { answerTogether, startTogether } from '@/features/us/together'
import { todayISO } from '@/lib/dates'

const segments = [
  { value: 'reading', label: 'Leyendo' },
  { value: 'want', label: 'Pendientes' },
  { value: 'finished', label: 'Leídos' },
  { value: 'together', label: 'Juntos' },
] as const

type View = ReadingStatus | 'together'

export function LibraryPage() {
  const { userId } = useMe()
  const readings = useReadings(userId)
  const together = useTogether()
  const rooms = useRooms()
  const [view, setView] = useState<View>('reading')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'recent' | 'title' | 'rating'>('recent')
  const normalized = search.trim().toLocaleLowerCase('es')
  const matches = (book: { title: string; authors: string[] }) =>
    [book.title, ...book.authors].some((text) => text.toLocaleLowerCase('es').includes(normalized))
  const visible = (readings.data ?? [])
    .filter((reading) => reading.status === view && matches(reading.book))
    .sort((a, b) => {
      if (sort === 'title') return a.book.title.localeCompare(b.book.title, 'es')
      if (sort === 'rating' && view === 'finished') return (b.rating ?? -1) - (a.rating ?? -1)
      return b.updated_at.localeCompare(a.updated_at)
    })
  const list = (together.data ?? []).filter(
    (item) => !rooms.some((room) => room.book.id === item.book_id) && matches(item.book),
  )
  const sharedRooms = rooms.filter((room) => matches(room.book))
  return (
    <section className="space-y-4">
      <header className="flex min-h-11 items-center justify-between">
        <h1>Biblioteca</h1>
        <Link to="/biblioteca/buscar" className="icon-btn" aria-label="Buscar y añadir un libro">
          <Plus size={23} />
        </Link>
      </header>
      <label className="relative block">
        <Search className="pointer-events-none absolute top-3 left-3 text-muted" size={19} />
        <input
          className="input pl-10"
          type="search"
          aria-label="Buscar por título o autor"
          placeholder="Título o autor"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <Segmented
        options={(view === 'abandoned'
          ? [...segments, { value: 'abandoned' as const, label: 'Dejados' }]
          : [...segments]
        ).map((segment) => ({
          ...segment,
          count:
            segment.value === 'together'
              ? rooms.length +
                (together.data ?? []).filter((item) => !rooms.some((room) => room.book.id === item.book_id)).length
              : (readings.data ?? []).filter((reading) => reading.status === segment.value).length,
        }))}
        value={view}
        onChange={setView}
        aria-label="Vista de biblioteca"
      />
      <div className="flex flex-wrap items-center gap-2">
        {view !== 'together' &&
          (['recent', 'title', ...(view === 'finished' ? (['rating'] as const) : [])] as const).map((value) => (
            <button key={value} className="chip min-h-11" aria-pressed={sort === value} onClick={() => setSort(value)}>
              {value === 'recent' ? 'Recientes' : value === 'title' ? 'Título' : 'Nota'}
            </button>
          ))}
        <button
          className="btn btn-ghost ml-auto text-xs"
          aria-pressed={view === 'abandoned'}
          onClick={() => setView(view === 'abandoned' ? 'reading' : 'abandoned')}
        >
          Ver dejados
        </button>
      </div>
      {view === 'together' ? (
        <div className="space-y-4">
          {sharedRooms.length > 0 && (
            <section className="space-y-3">
              <h2>Salas abiertas</h2>
              {sharedRooms.map((room) => (
                <Link
                  key={room.book.id}
                  className="card pressable flex items-center gap-3"
                  to={`/sala/${room.book.id}`}
                >
                  <Cover book={room.book} width={48} />
                  <div className="min-w-0">
                    <p className="font-serif">{room.book.title}</p>
                    <p className="text-xs text-muted">Abrir la sala</p>
                  </div>
                </Link>
              ))}
            </section>
          )}
          <section className="space-y-3">
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
        <div className="grid animate-pulse grid-cols-3 gap-3" role="status" aria-label="Cargando biblioteca">
          {[0, 1, 2].map((index) => (
            <div key={index} className="aspect-[2/3] rounded-lg bg-border" />
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
          title={normalized ? 'No hay libros con ese título o autor' : 'Tu próxima lectura está por descubrir'}
        >
          <Link className="btn btn-primary" to="/biblioteca/buscar">
            Buscar un libro
          </Link>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-3 gap-x-3 gap-y-5">
          {visible.map((reading) => (
            <Link key={reading.id} to={`/libro/${reading.id}`} className="pressable flex min-w-0 flex-col gap-2">
              <Cover book={reading.book}>
                {reading.status === 'reading' && (
                  <span className="absolute right-1 bottom-1 rounded-full bg-surface px-2 py-1 text-xs">
                    {Math.round(progressFraction(reading) * 100)} %
                  </span>
                )}
                {reading.status === 'finished' && reading.rating !== null && (
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-surface py-1 text-xs">
                    <Star size={13} />
                    {reading.rating.toLocaleString('es')}
                  </span>
                )}
              </Cover>
              <span className="line-clamp-2 text-[13px] leading-snug">{reading.book.title}</span>
            </Link>
          ))}
        </div>
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
    <article className="card space-y-3">
      <div className="flex gap-3">
        <Cover book={item.book} width={52} />
        <div className="min-w-0">
          <p className="font-serif">{item.book.title}</p>
          {item.reason && <p className="mt-1 text-sm text-muted">{item.reason}</p>}
        </div>
      </div>
      {item.start_on ? (
        <p className="text-sm text-muted">Para empezar el {item.start_on}</p>
      ) : item.partner_answer === 'yes' ? (
        <div className="space-y-2">
          <p className="text-sm">¿Empezamos?</p>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn btn-primary"
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
