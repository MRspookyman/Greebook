import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Plus, Search } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { Cover } from '@/components/Cover'
import { EmptyState } from '@/components/EmptyState'
import { ProgressBar } from '@/components/ProgressBar'
import { Segmented } from '@/components/Segmented'
import { FilterChips } from '@/components/FilterChips'
import { Stars } from '@/components/Stars'
import { useMe } from '@/features/auth/me'
import { useBookTags, useReadings } from '@/lib/data'
import type { Format, ReadingStatus, ReadingWithBook } from '@/lib/types'
import { formatFinished, formatLabel, formatPosition, progressFraction } from '@/lib/units'
import { cardFinish, cardReading, cardTarget, finishedGroups, libraryCards, type FinishedSort } from './libraryModel'
import { Recommendations } from './Recommendations'
import { ReadingPicker } from './ReadingPicker'

const tabs = [
  { value: 'reading', label: 'Leyendo' },
  { value: 'want', label: 'Pendientes' },
  { value: 'finished', label: 'Leídos' },
  { value: 'abandoned', label: 'Dejados' },
] as const
const emptyTitles: Record<ReadingStatus, string> = {
  reading: 'Nadie está leyendo nada ahora mismo.',
  want: 'No hay pendientes.',
  finished: 'Aún no hay leídos con estos filtros.',
  abandoned: 'Nada dejado a medias.',
}

function readingState(reading: ReadingWithBook): string {
  switch (reading.status) {
    case 'reading': return formatPosition(reading)
    case 'finished': return reading.finished_on
      ? `lo terminó en ${formatFinished(reading.finished_on, reading.finished_precision)}`
      : 'lo terminó'
    case 'want': return 'pendiente'
    case 'abandoned': return 'lo dejó'
  }
}

/** A shelf for books, with each person's place kept on the same card. */
export function LibraryPage() {
  const { userId, profile, partner } = useMe()
  const mineQuery = useReadings(userId)
  const theirsQuery = useReadings(partner?.id)
  const [active, setActive] = useState({ mine: true, theirs: true })
  const [search, setSearch] = useState('')
  const [params, setParams] = useSearchParams()
  const tabParam = params.get('tab')
  const view: ReadingStatus = tabs.some((tab) => tab.value === tabParam) ? tabParam as ReadingStatus : 'reading'
  const tagsQuery = useBookTags()
  const [tag, setTag] = useState('all')
  const [year, setYear] = useState('all')
  const [format, setFormat] = useState<Format | 'all'>('all')
  const [finishedView, setFinishedView] = useState<'covers' | 'list'>(() => {
    try { return localStorage.getItem('gb.library.finishedView') === 'list' ? 'list' : 'covers' } catch { return 'covers' }
  })
  const [sort, setSort] = useState<FinishedSort>('average')
  const all = [...(mineQuery.data ?? []), ...(partner ? theirsQuery.data ?? [] : [])]
  const people = [
    { person: profile, label: 'Tú', active: !partner || active.mine, key: 'mine' as const },
    ...(partner ? [{ person: partner, label: partner.display_name, active: active.theirs, key: 'theirs' as const }] : []),
  ]
  const tagOptions = [...new Set((tagsQuery.data ?? []).map((row) => row.tag))]
  const selectedTag = tagOptions.includes(tag) ? tag : 'all'
  const selected = all.filter((reading) => people.some(({ person, active }) => active && person.id === reading.user_id)
    && (selectedTag === 'all' || tagsQuery.data?.some((row) => row.book_id === reading.book_id && row.tag === selectedTag)))
  const shelves = {
    reading: libraryCards(selected, 'reading', search),
    want: libraryCards(selected, 'want', search),
    finished: libraryCards(selected, 'finished', search),
    abandoned: libraryCards(selected, 'abandoned', search),
  }
  const years = [...new Set(shelves.finished.flatMap((card) => card.year && card.year !== 'unknown' ? [card.year] : []))]
    .sort((a, b) => b.localeCompare(a))
  // A stale year selection must not hide every book when who/search changes.
  const selectedYear = years.includes(year) ? year : 'all'
  const cards = view === 'finished'
    ? libraryCards(selected, 'finished', search, format).filter((card) => selectedYear === 'all' || card.year === selectedYear)
    : shelves[view]
  const loading = mineQuery.isPending || (!!partner && theirsQuery.isPending)
  const error = mineQuery.isError || (!!partner && theirsQuery.isError)
  const sortOptions: { value: FinishedSort; label: string }[] = [
    { value: 'average', label: 'Mejor valorados' },
    ...(!partner || active.mine ? [{ value: 'mine' as const, label: 'Tu nota' }] : []),
    ...(partner && active.theirs ? [{ value: 'partner' as const, label: `Nota de ${partner.display_name}` }] : []),
    { value: 'recent', label: 'Más recientes' },
    { value: 'title', label: 'Título' },
  ]
  const selectedSort = sortOptions.some((option) => option.value === sort) ? sort : 'average'
  const groups = finishedGroups(cards, selectedSort, userId, partner?.id)

  return (
    <section className="min-w-0 space-y-6">
      <header className="enter flex min-h-11 items-center justify-between gap-3">
        <h1 className="display">Biblioteca</h1>
        <Link to="/biblioteca/buscar" className="icon-btn" aria-label="Buscar y añadir un libro">
          <Plus size={22} aria-hidden />
        </Link>
      </header>
      <label className="relative block">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" size={18} aria-hidden />
        <input
          className="input pl-10"
          type="search"
          name="library-search"
          autoComplete="off"
          spellCheck={false}
          aria-label="Buscar por título o autor"
          placeholder="Buscar por título o autor"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      {partner && (
        <div role="group" aria-label="De quién son los libros" className="flex flex-wrap gap-3">
          {people.map(({ person, label, active: on, key }) => (
            <button
              key={person.id}
              type="button"
              aria-pressed={on}
              onClick={() => {
                const other = key === 'mine' ? 'theirs' : 'mine'
                if (active[key] && !active[other]) return
                if (active[key] && sort === (key === 'mine' ? 'mine' : 'partner')) setSort('average')
                setActive((previous) => ({ ...previous, [key]: !previous[key] }))
              }}
              className={`pressable flex min-h-11 min-w-11 max-w-full items-center gap-2 rounded-full border py-1 pr-3 pl-1 ${on ? 'bg-surface' : 'border-rule opacity-60'}`}
              style={{ color: `var(--${person.accent})`, borderColor: on ? `var(--${person.accent})` : undefined }}
            >
              <Avatar person={person} size={34} filled={on} />
              <span className="truncate text-sm font-bold">{label}</span>
            </button>
          ))}
        </div>
      )}
      {tagOptions.length > 0 && <FilterChips options={[{ value: 'all', label: 'Todas las etiquetas' }, ...tagOptions.map((value) => ({ value, label: value }))]} value={selectedTag} onChange={setTag} aria-label="Etiqueta" />}
      {tagsQuery.isError && <button className="btn btn-outline" onClick={() => void tagsQuery.refetch()}>Reintentar cargar etiquetas</button>}
      <Segmented<ReadingStatus>
        options={tabs.map((tab) => ({ ...tab, count: shelves[tab.value].length }))}
        value={view}
        onChange={(value) => setParams((previous) => { previous.set('tab', value); return previous }, { replace: true })}
        aria-label="Estado de los libros"
      />
      {loading ? (
        <div className="space-y-4" role="status" aria-label="Cargando biblioteca">
          {[0, 1, 2].map((index) => (
            <div key={index} className="flex animate-pulse gap-4">
              <div className="h-[84px] w-14 shrink-0 rounded-cover bg-sunk" />
              <div className="flex-1 space-y-3 py-2"><div className="h-4 w-3/4 rounded bg-sunk" /><div className="h-3 w-1/2 rounded bg-sunk" /></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <EmptyState title="No se pudo cargar la biblioteca">
          <button className="btn btn-outline" onClick={() => { void mineQuery.refetch(); if (partner) void theirsQuery.refetch() }}>
            Reintentar
          </button>
        </EmptyState>
      ) : (
        <>
          {view === 'want' && <><Recommendations /><ReadingPicker readings={all} /></>}
          {view === 'finished' && (
            <div className="min-w-0 space-y-2">
              <FilterChips options={[{ value: 'all', label: 'Todos' }, ...years.map((value) => ({ value, label: value }))]} value={selectedYear} onChange={setYear} aria-label="Año de finalización" />
              <FilterChips<Format | 'all'> options={[{ value: 'all', label: 'Todos' }, ...(['paper', 'ebook'] as const).map((value) => ({ value, label: formatLabel(value) }))]} value={format} onChange={setFormat} aria-label="Formato del libro" />
              <Segmented options={[{ value: 'covers', label: 'Portadas' }, { value: 'list', label: 'Lista' }]} value={finishedView} onChange={(value) => {
                setFinishedView(value)
                try { localStorage.setItem('gb.library.finishedView', value) } catch { /* Storage may be unavailable in private browsing. */ }
              }} aria-label="Vista de los leídos" />
              <label className="flex min-w-0 items-center gap-3 text-sm text-muted">
                <span>Ordenar</span>
                <select className="input min-h-11 min-w-0 flex-1" aria-label="Ordenar leídos" value={selectedSort} onChange={(event) => setSort(event.target.value as FinishedSort)}>
                  {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <p className="lbl">{cards.length} {cards.length === 1 ? 'libro' : 'libros'}</p>
            </div>
          )}
          {cards.length === 0 ? (
            <EmptyState title={all.length === 0 ? 'Vuestra biblioteca empieza aquí.' : emptyTitles[view]}>
              {all.length === 0 && <Link className="btn btn-primary" to="/biblioteca/buscar">Buscar un libro</Link>}
            </EmptyState>
          ) : view === 'finished' ? (
            <div className="space-y-6">
              {groups.map((group) => (
                <section key={group.year} className="min-w-0 space-y-3" aria-label={group.year === 'unknown' ? 'Sin fecha' : group.year}>
                  <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <h2 className="font-serif text-xl">{group.year === 'unknown' ? 'Sin fecha' : group.year}</h2>
                    <p className="text-xs text-muted">{group.cards.length} {group.cards.length === 1 ? 'libro' : 'libros'}{group.average !== null && ` · media ${group.average.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ★`}</p>
                  </header>
                  <ul className={finishedView === 'list' ? 'space-y-3' : 'grid grid-cols-3 gap-x-4 gap-y-6'}>
                    {group.cards.map((card) => {
                      const book = card.reading.book
                      const readers = people.filter(({ active, person }) => active && cardFinish(card, person.id))
                      const formats = [...new Set(card.matches.map((reading) => formatLabel(reading.format)))].join(' y ')
                      const date = card.reading.finished_on ? formatFinished(card.reading.finished_on, card.reading.finished_precision) : 'Sin fecha'
                      return (
                        <li key={card.key} className="min-w-0">
                          <Link to={`/libro/${cardTarget(card, all, userId).id}`} className={finishedView === 'list' ? 'pressable flex min-h-11 gap-3 rounded-card border border-rule bg-surface p-3' : 'pressable block min-h-11 min-w-0'}>
                            <div className="shrink-0"><Cover book={book} width={finishedView === 'list' ? 44 : undefined} /></div>
                            <div className="min-w-0 flex-1">
                              <h3 className={`font-serif leading-snug break-words ${finishedView === 'list' ? 'text-base' : 'mt-2 line-clamp-2 text-[13px]'}`}>{book.title}</h3>
                              {finishedView === 'list' && <p className="mt-1 text-xs text-muted break-words">{book.authors.join(', ')}</p>}
                              <p className="mt-1 text-xs text-muted">{date}{finishedView === 'list' && ` · ${formats}`}</p>
                              {finishedView === 'list' ? (
                                <div className="mt-2 space-y-1">
                                  {readers.map(({ person, label }) => {
                                    const rating = cardFinish(card, person.id)!.rating
                                    return (
                                      <div key={person.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                                        <span className="font-bold break-words" style={{ color: `var(--${person.accent})` }}>{label}</span>
                                        {rating === null ? <span className="text-muted">Sin nota</span> : <Stars value={rating} size={16} color={`var(--${person.accent})`} />}
                                      </div>
                                    )
                                  })}
                                </div>
                              ) : <span className="mt-2 flex gap-1.5">{readers.map(({ person, label }) => <span key={person.id} className="h-2 w-2 rounded-full" style={{ background: `var(--${person.accent})` }}><span className="sr-only">{label}</span></span>)}</span>}
                            </div>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <ul aria-label={tabs.find((tab) => tab.value === view)?.label} className={view === 'reading' ? 'space-y-3' : 'grid grid-cols-3 gap-x-4 gap-y-6'}>
              {cards.map((card) => {
                const book = card.reading.book
                const owners = people.filter(({ active, person }) => active && card.readings.some((reading) => reading.user_id === person.id))
                const readers = people.filter(({ active, person }) => active && card.matches.some((reading) => reading.user_id === person.id))
                return (
                  <li key={card.key} className="min-w-0">
                    <Link to={`/libro/${cardTarget(card, all, userId).id}`} className={view === 'reading' ? 'pressable flex min-h-11 gap-4 rounded-card border border-rule bg-surface p-4' : 'pressable block min-h-11 min-w-0'}>
                      {view === 'reading' ? (
                        <>
                          <div className="shrink-0"><Cover book={book} width={56} ribbons={owners.map(({ person }) => person.accent)} /></div>
                          <div className="min-w-0 flex-1 space-y-3">
                            <div>
                              <h2 className="font-serif text-[17px] leading-snug break-words">{book.title}</h2>
                              <p className="mt-1 text-xs text-muted break-words">{book.authors.join(', ')}</p>
                            </div>
                            {owners.map(({ person, label }) => {
                              const reading = cardReading(card, person.id)!
                              return reading.status === 'reading' ? (
                                <div key={person.id} className="space-y-1.5">
                                  <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-xs">
                                    <span className="font-bold" style={{ color: `var(--${person.accent})` }}>{label}</span>
                                    <span className="text-muted">{formatPosition(reading)}</span>
                                  </div>
                                  <ProgressBar value={progressFraction(reading)} color={`var(--${person.accent})`} label={`Progreso de ${label}`} />
                                </div>
                              ) : <p key={person.id} className="text-xs text-muted">{label} · {readingState(reading)}</p>
                            })}
                          </div>
                        </>
                      ) : (
                        <>
                          <Cover book={book} className={view === 'abandoned' ? 'opacity-60' : ''} />
                          <h2 className="mt-2 line-clamp-2 font-serif text-[13px] leading-snug break-words">{book.title}</h2>
                          <span className="mt-2 flex gap-1.5">
                            {readers.map(({ person, label }) => (
                              <span key={person.id} className="h-2 w-2 shrink-0 rounded-full" style={{ background: `var(--${person.accent})` }}>
                                <span className="sr-only">{label} · {readingState(cardReading(card, person.id)!)}</span>
                              </span>
                            ))}
                          </span>
                          {view === 'abandoned' && card.matches.map((reading) => {
                            const reason = reading.abandon_reason
                            return reason ? <p key={reading.id} className="mt-2 text-xs text-muted break-words">{people.find(({ person }) => person.id === reading.user_id)?.label}: {reason}</p> : null
                          })}
                        </>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
