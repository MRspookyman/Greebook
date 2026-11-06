import { useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { ListFilter, Plus, Search, Star, X } from 'lucide-react'
import { Cover } from '@/components/Cover'
import { EmptyState } from '@/components/EmptyState'
import { Segmented } from '@/components/Segmented'
import { useMe } from '@/features/auth/me'
import { useReadings } from '@/lib/data'
import type { ReadingStatus } from '@/lib/types'
import { progressFraction } from '@/lib/units'

const segments: { value: ReadingStatus; label: string; empty: string }[] = [
  { value: 'reading', label: 'Leyendo', empty: 'Aún no estás leyendo nada' },
  { value: 'want', label: 'Pendientes', empty: 'Tu próxima lectura está por descubrir' },
  { value: 'finished', label: 'Leídos', empty: 'Aquí guardarás los libros que termines' },
  { value: 'abandoned', label: 'Dejados', empty: 'No tienes libros dejados' },
]
const sorts = [
  { value: 'recent', label: 'Recientes' },
  { value: 'title', label: 'Título' },
  { value: 'rating', label: 'Nota' },
] as const

export function LibraryPage() {
  const { userId } = useMe()
  const readings = useReadings(userId)
  const [status, setStatus] = useState<ReadingStatus>('reading')
  const [filter, setFilter] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [showAbandoned, setShowAbandoned] = useState(false)
  const [sort, setSort] = useState<(typeof sorts)[number]['value']>('recent')
  const searchRef = useRef<HTMLInputElement>(null)
  const normalized = filter.trim().toLocaleLowerCase('es')
  const all = readings.data ?? []
  const visible = all
    .filter(
      (reading) =>
        reading.status === status &&
        [reading.book.title, ...reading.book.authors].some((text) => text.toLocaleLowerCase('es').includes(normalized)),
    )
    .sort((a, b) => {
      if (sort === 'title') return a.book.title.localeCompare(b.book.title, 'es')
      if (sort === 'rating' && a.rating !== b.rating) return (b.rating ?? -1) - (a.rating ?? -1)
      return b.updated_at.localeCompare(a.updated_at)
    })

  function toggleSearch() {
    if (searchOpen) setFilter('')
    else window.requestAnimationFrame(() => searchRef.current?.focus())
    setSearchOpen(!searchOpen)
  }

  return (
    <section className="space-y-4">
      <header className="flex min-h-11 items-center justify-between gap-2">
        <h1 className={searchOpen ? 'sr-only' : 'min-w-0 flex-1'}>Biblioteca</h1>
        <div
          className="relative flex shrink-0 items-center overflow-hidden rounded-2xl transition-[width] duration-500 [transition-timing-function:var(--spring)]"
          style={{ width: searchOpen ? 'calc(100% - 52px)' : 44 }}
        >
          <input
            ref={searchRef}
            className={`input pr-12 ${searchOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
            type="search"
            aria-label="Buscar por título o autor"
            placeholder="Título o autor"
            value={filter}
            disabled={!searchOpen}
            onChange={(event) => setFilter(event.target.value)}
          />
          <button
            className="icon-btn absolute right-0"
            onClick={toggleSearch}
            aria-label={searchOpen ? 'Cerrar búsqueda' : 'Buscar en tu biblioteca'}
            aria-expanded={searchOpen}
          >
            {searchOpen ? <X size={20} /> : <Search size={20} />}
          </button>
        </div>
        <Link to="/biblioteca/buscar" className="icon-btn shrink-0" aria-label="Buscar y añadir un libro">
          <Plus size={23} />
        </Link>
      </header>
      <Segmented
        options={segments
          .filter((segment) => showAbandoned || segment.value !== 'abandoned')
          .map(({ value, label }) => ({
            value,
            label,
            count: all.filter((reading) => reading.status === value).length,
          }))}
        value={status}
        onChange={setStatus}
        aria-label="Estado de lectura"
      />
      <div className="flex items-center gap-2">
        {sorts.map((option) => (
          <button
            key={option.value}
            className="chip min-h-11"
            aria-pressed={sort === option.value}
            onClick={() => setSort(option.value)}
          >
            {option.label}
          </button>
        ))}
        <button
          className="icon-btn ml-auto shrink-0"
          aria-label="Mostrar libros dejados"
          aria-pressed={showAbandoned}
          onClick={() => {
            if (showAbandoned && status === 'abandoned') setStatus('reading')
            setShowAbandoned(!showAbandoned)
          }}
        >
          <ListFilter size={21} className={showAbandoned ? 'text-accent' : ''} />
        </button>
      </div>
      {readings.isPending ? (
        <div className="grid animate-pulse grid-cols-3 gap-3" role="status">
          <span className="sr-only">Cargando tu biblioteca…</span>
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="aspect-[2/3] rounded-lg bg-border" />
          ))}
        </div>
      ) : readings.isError ? (
        <EmptyState title="No se pudo cargar tu biblioteca">
          <button className="btn btn-secondary" onClick={() => void readings.refetch()}>
            Reintentar
          </button>
        </EmptyState>
      ) : visible.length === 0 ? (
        <EmptyState
          title={normalized ? 'No hay libros con ese título o autor' : segments.find((s) => s.value === status)!.empty}
        >
          <Link className="btn btn-primary" to="/biblioteca/buscar">
            Buscar un libro
          </Link>
        </EmptyState>
      ) : (
        <div key={status} className="grid grid-cols-3 gap-x-3 gap-y-5">
          {visible.map((reading, index) => (
            <Link
              key={reading.id}
              to={`/libro/${reading.id}`}
              className="rise pressable flex min-w-0 flex-col gap-2"
              style={{ '--k': index } as CSSProperties}
            >
              <Cover book={reading.book}>
                {reading.status === 'reading' && (
                  <span className="num absolute right-1.5 bottom-1.5 grid h-9 w-9 place-items-center rounded-full bg-surface font-sans text-[11px] font-semibold text-ink">
                    {Math.round(progressFraction(reading) * 100)} %
                  </span>
                )}
                {reading.status === 'finished' && reading.rating !== null && (
                  <span className="num absolute right-0 bottom-0 left-0 flex items-center justify-center gap-1 bg-surface/95 py-1.5 font-sans text-xs font-semibold text-ink">
                    <Star size={13} className="fill-amber text-amber" />
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
