import { useState, type CSSProperties, type ReactNode } from 'react'
import type { Accent, Book } from '@/lib/types'

interface Props {
  book: Pick<Book, 'title' | 'cover_url'> & Partial<Pick<Book, 'authors'>>
  /** Width in px; height follows a 2:3 ratio. Omit to fill the parent width. */
  width?: number
  className?: string
  children?: ReactNode
  priority?: boolean
  /** Small bookmark on a current reading; leave other books unmarked. */
  ribbon?: Accent
  /** Short label printed in the lower-right corner (progress, rating, page). */
  badge?: string
  /** Shared-element name so the cover morphs between screens (View Transitions). Must be unique on a page. */
  transitionName?: string
}

/** Book-cloth colours for books without a cover image; paper text stays ≥ 5:1 on every one. */
const CLOTH = ['#3f5f4a', '#3d5677', '#7b4038', '#7d5f28', '#5b4762', '#4b5b5f', '#3e6a67', '#6b5a3e']
const INK = '#f6efe1'

function clothFor(title: string): string {
  let hash = 0
  for (const char of title) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return CLOTH[hash % CLOTH.length]
}

export function Cover({
  book,
  width,
  className = '',
  children,
  priority = false,
  ribbon,
  badge,
  transitionName,
}: Props) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const fallback = !book.cover_url || failedUrl === book.cover_url
  const size = width ? { width, height: Math.round(width * 1.5) } : { width: '100%', aspectRatio: '2 / 3' }
  const author = book.authors?.[0]?.split(' ').at(-1)
  // Thumbnails can't hold a legible title: they show the initial, like a spine label.
  const tiny = width !== undefined && width < 56
  // Leave the bookmark its own strip so it never sits on the title.
  const inset = width ? Math.max(6, width * 0.11) : 0
  return (
    <div
      className={`book-cover bg-border ${className}`}
      style={{ ...size, viewTransitionName: transitionName }}
      aria-label={fallback ? book.title : undefined}
    >
      {fallback ? (
        <div
          className="flex h-full flex-col font-serif leading-[1.1]"
          style={{
            background: clothFor(book.title),
            color: INK,
            fontSize: tiny ? Math.max(12, (width ?? 0) * 0.46) : width ? Math.max(12, width * 0.15) : 16,
            // A corner badge needs its own strip at the bottom so it never covers the author.
            padding: tiny
              ? 0
              : width
                ? `${Math.max(6, width * 0.13)}px ${ribbon ? width * 0.3 : inset}px ${Math.max(6, width * 0.13) + (badge ? 24 : 0)}px ${inset}px`
                : `13% ${ribbon ? '30%' : '11%'} ${badge ? 'calc(13% + 24px)' : '13%'} 11%`,
            justifyContent: tiny ? 'center' : 'space-between',
            alignItems: tiny ? 'center' : 'stretch',
          }}
        >
          {tiny ? (
            <span aria-hidden>{book.title.trim().charAt(0).toUpperCase()}</span>
          ) : (
            <>
              <span className="block">
                <span className="block overflow-hidden break-words" style={{ maxHeight: '5.5em' }}>
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
      {ribbon && (
        <span aria-hidden className="book-ribbon" style={{ '--ribbon': `var(--${ribbon})` } as CSSProperties} />
      )}
      {badge && <span className="cover-badge">{badge}</span>}
      {children}
    </div>
  )
}
