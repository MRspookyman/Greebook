import { useState } from 'react'
import type { Book } from '@/lib/types'

interface Props {
  book: Pick<Book, 'title' | 'cover_url'>
  /** Width in px; height follows a 2:3 ratio. */
  width: number
  className?: string
}

export function Cover({ book, width, className = '' }: Props) {
  const [failed, setFailed] = useState(false)
  const height = Math.round(width * 1.5)
  const style = { width, height, borderRadius: 'var(--radius-cover)', boxShadow: 'var(--shadow-cover)' }

  if (!book.cover_url || failed) {
    return (
      <div
        className={`bg-border text-ink font-serif font-semibold flex items-center justify-center text-center overflow-hidden shrink-0 ${className}`}
        style={{ ...style, fontSize: Math.max(8, width / 8), padding: width / 12 }}
        aria-label={book.title}
      >
        <span className="line-clamp-4 leading-tight">{book.title}</span>
      </div>
    )
  }
  return (
    <img
      src={book.cover_url}
      alt={book.title}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-cover shrink-0 bg-border ${className}`}
      style={style}
    />
  )
}
