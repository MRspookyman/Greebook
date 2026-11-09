import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { formatFinished } from '@/lib/units'
import type { Accent, ReadingWithBook } from '@/lib/types'
import { CLOTH_INK, clothFor } from './Cover'

/** A book on a shelf: its spine in book cloth, with a dot for each person who read it. */
export function Spine({ reading, readers }: { reading: ReadingWithBook; readers: Accent[] }) {
  const pages = reading.book.page_count ?? reading.total_units
  const width = Math.min(44, Math.max(26, 22 + Math.round(pages / 45)))
  const height = 120 + ((reading.book.title.length * 7) % 38)
  return (
    <Link
      className="flex min-w-11 flex-none items-end justify-center rounded-sm"
      to={`/libro/${reading.id}`}
      aria-label={`${reading.book.title}${reading.finished_on ? `, terminado: ${formatFinished(reading.finished_on, reading.finished_precision)}` : ''}`}
    >
      {/* Keep the cloth narrow inside a separate, non-overlapping touch target. */}
      <span
        className="spine"
        style={{ width, height, background: clothFor(reading.book.title), color: CLOTH_INK } as CSSProperties}
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
      </span>
    </Link>
  )
}
