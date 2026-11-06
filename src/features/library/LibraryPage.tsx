import { useState } from 'react'
import { Link } from 'react-router'
import { Plus, Search } from 'lucide-react'
import { Cover } from '@/components/Cover'
import { EmptyState } from '@/components/EmptyState'
import { useMe } from '@/features/auth/me'
import { useReadings } from '@/lib/data'
import type { ReadingStatus } from '@/lib/types'

const segments: { status: ReadingStatus; label: string; empty: string }[] = [
  { status: 'reading', label: 'Leyendo', empty: 'Aún no estás leyendo nada' },
  { status: 'want', label: 'Quiero leer', empty: 'Tu próxima lectura está por descubrir' },
  { status: 'finished', label: 'Leídos', empty: 'Aquí guardarás los libros que termines' },
  { status: 'abandoned', label: 'Abandonados', empty: 'No tienes libros abandonados' },
]

export function LibraryPage() {
  const { userId } = useMe()
  const readings = useReadings(userId)
  const [status, setStatus] = useState<ReadingStatus>('reading')
  const [filter, setFilter] = useState('')
  const normalized = filter.trim().toLocaleLowerCase('es')
  const visible = (readings.data ?? []).filter(
    (reading) => reading.status === status && reading.book.title.toLocaleLowerCase('es').includes(normalized),
  )
  return (
    <section className="space-y-5">
      <header className="flex items-center justify-between">
        <h1>Biblioteca</h1>
        <Link to="/biblioteca/buscar" className="btn btn-primary" aria-label="Buscar y añadir un libro">
          <Plus size={22} />
        </Link>
      </header>
      <div className="grid grid-cols-4 gap-1" role="group" aria-label="Estado de lectura">
        {segments.map((segment) => (
          <button
            key={segment.status}
            onClick={() => setStatus(segment.status)}
            aria-pressed={status === segment.status}
            className={`min-h-11 rounded-xl px-1 py-2 text-xs font-medium ${status === segment.status ? 'bg-accent text-surface' : 'bg-surface text-muted'}`}
          >
            {segment.label}
            <span className="block mt-1">
              {(readings.data ?? []).filter((reading) => reading.status === segment.status).length}
            </span>
          </button>
        ))}
      </div>
      <label className="relative block">
        <Search size={20} className="absolute left-3 top-3 text-muted" />
        <span className="sr-only">Buscar en tu biblioteca</span>
        <input
          className="input pl-10"
          type="search"
          placeholder="Buscar por título"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </label>
      {readings.isPending ? (
        <div className="grid grid-cols-3 gap-4 animate-pulse" role="status">
          <span className="sr-only">Cargando tu biblioteca…</span>
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="bg-border rounded-lg aspect-[2/3]" />
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
          title={
            normalized ? 'No hay libros con ese título' : segments.find((segment) => segment.status === status)!.empty
          }
        >
          <Link className="btn btn-primary" to="/biblioteca/buscar">
            Buscar un libro
          </Link>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-3 gap-x-3 gap-y-6">
          {visible.map((reading) => (
            <Link key={reading.id} to={`/libro/${reading.id}`} className="min-w-0 flex flex-col items-center gap-2">
              <div className="w-full flex justify-center overflow-hidden">
                <Cover book={reading.book} width={96} />
              </div>
              <span className="font-serif text-sm text-center line-clamp-2">{reading.book.title}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
