import { useState, type ReactNode } from 'react'
import type { Book } from '@/lib/types'

interface Props {
  book: Pick<Book, 'title' | 'cover_url'> & Partial<Pick<Book, 'authors'>>
  /** Width in px; height follows a 2:3 ratio. Omit to fill the parent width. */
  width?: number
  className?: string
  /** Overlay (progress badge, stars…) positioned inside the cover. */
  children?: ReactNode
  /** Eagerly fetch an above-the-fold cover. */
  priority?: boolean
}

export function Cover({ book, width, className = '', children, priority = false }: Props) {
  const [failed, setFailed] = useState(false)
  const size = width ? { width, height: Math.round(width * 1.5) } : { width: '100%', aspectRatio: '2 / 3' }
  const base = `relative flex-none overflow-hidden rounded-[5px_7px_7px_5px] shadow-[0_3px_10px_-2px_rgb(0_0_0/0.25),inset_3px_0_0_rgb(0_0_0/0.12)] ${className}`

  if (!book.cover_url || failed) {
    // Generated covers share the diary palette rather than introducing arbitrary hues.
    const fontSize = width ? Math.max(8, width * 0.15) : 13
    const author = book.authors?.[0]?.split(' ').at(-1)
    return (
      <div
        className={`${base} flex flex-col justify-between bg-green font-serif leading-[1.05] text-bg`}
        style={{
          ...size,
          fontSize,
          // Percent padding resolves against the parent's width, so use px when the width is known.
          padding: width ? `${width * 0.12}px ${width * 0.1}px` : '12% 10%',
        }}
        aria-label={book.title}
      >
        <span className="block overflow-hidden break-words" style={{ maxHeight: '5.3em' }}>
          {book.title}
        </span>
        {author && width !== undefined && width >= 48 && (
          <small className="font-sans text-[0.62em] tracking-[0.04em] uppercase opacity-80">{author}</small>
        )}
        {children}
      </div>
    )
  }
  return (
    <div className={`${base} bg-border`} style={size}>
      <img
        src={book.cover_url}
        alt={book.title}
        width={width ?? 200}
        height={Math.round((width ?? 200) * 1.5)}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
      {children}
    </div>
  )
}
