import { useState, type CSSProperties, type ReactNode } from 'react'
import type { Accent, Book } from '@/lib/types'

interface Props {
  book: Pick<Book, 'title' | 'cover_url'> & Partial<Pick<Book, 'authors'>>
  /** Width in px; height follows a 2:3 ratio. Omit to fill the parent width. */
  width?: number
  className?: string
  children?: ReactNode
  priority?: boolean
  /** Bookmark of whoever is reading it; leave other books unmarked. */
  ribbon?: Accent
  /** One bookmark per reader when both of you have it open (partner first, then you). */
  ribbons?: Accent[]
}

/** Book-cloth colours for books without a cover image; paper text stays ≥ 5:1 on every one. */
const CLOTH = ['#2e4a3e', '#1d2949', '#8f3a33', '#6b4a1f', '#5b2b4c', '#3f4c55', '#2f5c5a', '#682b2e']
export const CLOTH_INK = '#f8ecdf'
const INK = CLOTH_INK

export function clothFor(title: string): string {
  let hash = 0
  for (const char of title) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return CLOTH[hash % CLOTH.length]
}

export function Cover({ book, width, className = '', children, priority = false, ribbon, ribbons }: Props) {
  const marks = ribbons ?? (ribbon ? [ribbon] : [])
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const fallback = !book.cover_url || failedUrl === book.cover_url
  const size = width ? { width, height: Math.round(width * 1.5) } : { width: '100%', aspectRatio: '2 / 3' }
  const author = book.authors?.[0]?.split(' ').at(-1)
  // Thumbnails can't hold a legible title: they show the initial, like a spine label.
  const tiny = width !== undefined && width < 64
  const inset = width ? Math.max(6, width * 0.11) : 0
  const ribbonWidth = Math.max(5, Math.round((width ?? 100) * 0.075))
  // With bookmarks the title starts just below them and keeps the full width, so words aren't split to fit a gap.
  const top = width ? Math.max(6, width * 0.13, marks.length ? width * 0.39 + 3 : 0) : 0
  return (
    <div className={`book-cover bg-border ${className}`} style={size} aria-label={fallback ? book.title : undefined}>
      {fallback ? (
        <div
          className="flex h-full flex-col font-serif leading-[1.1]"
          style={{
            background: clothFor(book.title),
            color: INK,
            fontSize: tiny ? Math.max(12, (width ?? 0) * 0.46) : width ? Math.max(12, width * 0.15) : 16,
            padding: tiny
              ? 0
              : width
                ? `${top}px ${inset}px ${Math.max(6, width * 0.13)}px ${inset}px`
                : `${marks.length ? '42%' : '13%'} 11% 13% 11%`,
            justifyContent: tiny ? 'center' : 'space-between',
            alignItems: tiny ? 'center' : 'stretch',
          }}
        >
          {tiny ? (
            <span aria-hidden>{book.title.trim().charAt(0).toUpperCase()}</span>
          ) : (
            <>
              <span className="block">
                <span
                  className="block overflow-hidden break-words hyphens-auto"
                  // Only words of 7+ letters split at a syllable («Proyec-to»); «sombra» moves to the next line whole.
                  style={{ maxHeight: '5.5em', hyphenateLimitChars: '7 3 2' }}
                >
                  {book.title}
                </span>
                <span className="mt-[0.5em] block h-px w-1/3" style={{ background: INK, opacity: 0.45 }} aria-hidden />
              </span>
              {author && (width === undefined || width >= 80) && (
                <small className="overflow-hidden font-sans text-xs" style={{ color: INK }}>
                  {author}
                </small>
              )}
            </>
          )}
        </div>
      ) : (
        <img
          src={book.cover_url!}
          alt={book.title}
          width={width ?? 200}
          height={Math.round((width ?? 200) * 1.5)}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          onError={() => setFailedUrl(book.cover_url)}
          className="h-full w-full object-cover"
        />
      )}
      {marks.length > 0 && (
        <span
          aria-hidden
          className={`book-ribbons ${fallback ? '' : 'book-ribbons-photo'}`}
          style={{ '--ribbon-w': `${ribbonWidth}px` } as CSSProperties}
        >
          {marks.map((accent, index) => (
            <span key={`${accent}-${index}`} className="book-ribbon" style={{ '--ribbon': `var(--${accent})` } as CSSProperties} />
          ))}
        </span>
      )}
      {children}
    </div>
  )
}
