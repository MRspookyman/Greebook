import { useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { ListFilter, Plus, Search, Star, X } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { BottomSheet } from '@/components/BottomSheet'
import { Cover } from '@/components/Cover'
import { EmptyState } from '@/components/EmptyState'
import { Segmented } from '@/components/Segmented'
import { useMe } from '@/features/auth/me'
import { useReadings } from '@/lib/data'
import type { ReadingStatus, ReadingWithBook } from '@/lib/types'
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

type Owner = 'all' | 'mine' | 'theirs' | 'both'
const OWNERS: Owner[] = ['all', 'mine', 'theirs', 'both']
const OWNER_KEY = 'gb.library.owner'

interface Entry {
  reading: ReadingWithBook
  mine: boolean
  theirs: boolean
}

/**
 * Cards for one status. A book we both have in that status shows once (my reading, both
 * avatars). «De los dos» keeps only books we both have, in any status.
 */
function libraryEntries(
  mine: ReadingWithBook[],
  theirs: ReadingWithBook[],
  status: ReadingStatus,
  owner: Owner,
): Entry[] {
  const myBooks = new Set(mine.map((r) => r.book_id))
  const theirBooks = new Set(theirs.map((r) => r.book_id))
  const myHere = mine.filter((r) => r.status === status)
  const theirHere = theirs.filter((r) => r.status === status)
  const myHereBooks = new Set(myHere.map((r) => r.book_id))
  const theirHereBooks = new Set(theirHere.map((r) => r.book_id))
  const list: Entry[] =
    owner === 'mine'
      ? myHere.map((r) => ({ reading: r, mine: true, theirs: theirHereBooks.has(r.book_id) }))
      : owner === 'theirs'
        ? theirHere.map((r) => ({ reading: r, mine: myHereBooks.has(r.book_id), theirs: true }))
        : [
            ...myHere.map((r) => ({ reading: r, mine: true, theirs: theirHereBooks.has(r.book_id) })),
            ...theirHere
              .filter((r) => !myHereBooks.has(r.book_id))
              .map((r) => ({ reading: r, mine: false, theirs: true })),
          ]
  const seen = new Set<string>()
  return list.filter((entry) => {
    const key = `${entry.reading.user_id}:${entry.reading.book_id}`
    if (seen.has(key)) return false
    seen.add(key)
    return owner !== 'both' || (myBooks.has(entry.reading.book_id) && theirBooks.has(entry.reading.book_id))
  })
}

function loadOwner(): Owner {
  try {
    const saved = localStorage.getItem(OWNER_KEY) as Owner | null
    return saved && OWNERS.includes(saved) ? saved : 'all'
  } catch {
    return 'all'
  }
}

export function LibraryPage() {
  const { userId, profile, partner } = useMe()
  const readings = useReadings(userId)
  const partnerReadings = useReadings(partner?.id)
  const [owner, setOwnerState] = useState<Owner>(loadOwner)
  const [status, setStatus] = useState<ReadingStatus>('reading')
  const [filter, setFilter] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sort, setSort] = useState<(typeof sorts)[number]['value']>('recent')
  const searchRef = useRef<HTMLInputElement>(null)
  const effectiveOwner: Owner = partner ? owner : 'mine'
  const normalized = filter.trim().toLocaleLowerCase('es')
  const mineList = readings.data ?? []
  const theirList = partner ? (partnerReadings.data ?? []) : []
  const visible = libraryEntries(mineList, theirList, status, effectiveOwner)
    .filter(({ reading }) =>
      [reading.book.title, ...reading.book.authors].some((text) => text.toLocaleLowerCase('es').includes(normalized)),
    )
    .sort(({ reading: a }, { reading: b }) => {
      if (sort === 'title') return a.book.title.localeCompare(b.book.title, 'es')
      if (sort === 'rating' && a.rating !== b.rating) return (b.rating ?? -1) - (a.rating ?? -1)
      return b.updated_at.localeCompare(a.updated_at)
    })
  const loading = readings.isPending || (!!partner && effectiveOwner !== 'mine' && partnerReadings.isPending)
  const emptyLibrary =
    readings.isSuccess && (!partner || partnerReadings.isSuccess) && mineList.length === 0 && theirList.length === 0
  const filtersActive = (partner && owner !== 'all') || status === 'abandoned'

  function selectStatus(value: ReadingStatus) {
    setStatus(value)
    if (value !== 'finished' && sort === 'rating') setSort('recent')
  }

  function setOwner(value: Owner) {
    setOwnerState(value)
    try {
      localStorage.setItem(OWNER_KEY, value)
    } catch {
      /* Remembering the filter is optional. */
    }
  }

  function toggleSearch() {
    if (searchOpen) setFilter('')
    else window.requestAnimationFrame(() => searchRef.current?.focus())
    setSearchOpen(!searchOpen)
  }

  const emptyTitle = normalized
    ? 'No hay libros con ese título o autor'
    : effectiveOwner === 'mine'
      ? segments.find((s) => s.value === status)!.empty
      : effectiveOwner === 'theirs'
        ? `${partner?.display_name} no tiene libros aquí`
        : effectiveOwner === 'both'
          ? 'Aún no compartís ningún libro aquí'
          : 'No hay libros aquí'

  if (emptyLibrary) {
    return (
      <section className="space-y-4">
        <header className="flex min-h-11 items-center justify-between gap-2">
          <h1>Biblioteca</h1>
          <Link to="/biblioteca/buscar" className="icon-btn shrink-0" aria-label="Buscar y añadir un libro">
            <Plus size={23} />
          </Link>
        </header>
        <EmptyState title="Tu próxima lectura está por descubrir">
          <Link className="btn btn-primary" to="/biblioteca/buscar">
            Buscar un libro
          </Link>
        </EmptyState>
      </section>
    )
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
          .filter((segment) => status === 'abandoned' || segment.value !== 'abandoned')
          .map(({ value, label }) => ({
            value,
            label,
            count: libraryEntries(mineList, theirList, value, effectiveOwner).length,
          }))}
        value={status}
        onChange={selectStatus}
        aria-label="Estado de lectura"
      />
      <div className="flex items-center gap-2">
        {sorts
          .filter((option) => status === 'finished' || option.value !== 'rating')
          .map((option) => (
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
          className="icon-btn relative ml-auto shrink-0"
          aria-label="Filtros"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen(true)}
        >
          <ListFilter size={21} className={filtersActive ? 'text-accent' : ''} />
          {filtersActive && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-accent" aria-hidden />}
        </button>
      </div>
      {loading ? (
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
        <EmptyState title={emptyTitle}>
          {effectiveOwner !== 'theirs' && effectiveOwner !== 'both' && (
            <Link className="btn btn-primary" to="/biblioteca/buscar">
              Buscar un libro
            </Link>
          )}
        </EmptyState>
      ) : (
        <div key={`${status}-${effectiveOwner}`} className="grid grid-cols-3 gap-x-3 gap-y-5">
          {visible.map(({ reading, mine, theirs }, index) => (
            <Link
              key={reading.id}
              to={`/libro/${reading.id}`}
              className="rise pressable flex min-w-0 flex-col gap-2"
              style={{ '--k': index } as CSSProperties}
            >
              <Cover book={reading.book}>
                {partner && (
                  <span
                    className="absolute top-1.5 left-1.5 flex -space-x-1.5"
                    aria-label={mine && theirs ? 'De los dos' : mine ? 'Tuyo' : `De ${partner.display_name}`}
                  >
                    {mine && (
                      <span className="rounded-full ring-2 ring-surface">
                        <Avatar person={profile} size={18} />
                      </span>
                    )}
                    {theirs && (
                      <span className="rounded-full ring-2 ring-surface">
                        <Avatar person={partner} size={18} />
                      </span>
                    )}
                  </span>
                )}
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
      <BottomSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filtros">
        <div className="space-y-4">
          {partner && (
            <Segmented
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'mine', label: 'Míos' },
                { value: 'theirs', label: <span className="truncate">De {partner.display_name}</span> },
                { value: 'both', label: 'De los dos' },
              ]}
              value={owner}
              onChange={setOwner}
              aria-label="De quién son los libros"
              className="[&_button]:text-xs"
            />
          )}
          <button
            className="btn btn-secondary w-full"
            aria-pressed={status === 'abandoned'}
            onClick={() => {
              selectStatus('abandoned')
              setFiltersOpen(false)
            }}
          >
            Ver dejados
          </button>
        </div>
      </BottomSheet>
    </section>
  )
}
