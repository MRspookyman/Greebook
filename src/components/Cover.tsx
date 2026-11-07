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
}

export function Cover({ book, width, className = '', children, priority = false, ribbon }: Props) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const fallback = !book.cover_url || failedUrl === book.cover_url
  const size = width ? { width, height: Math.round(width * 1.5) } : { width: '100%', aspectRatio: '2 / 3' }
  const author = book.authors?.[0]?.split(' ').at(-1)
  return (
    <div className={`book-cover bg-border ${className}`} style={size} aria-label={fallback ? book.title : undefined}>
      {fallback ? (
        <div
          className="flex h-full flex-col justify-between bg-soft font-serif leading-[1.1] text-ink"
          style={{
            fontSize: width ? Math.max(12, width * 0.15) : 16,
            padding: width ? `${Math.max(4, width * 0.12)}px ${Math.max(5, width * 0.1)}px` : '12% 10%',
          }}
        >
          <span className="block overflow-hidden break-words" style={{ maxHeight: '5.5em' }}>
            {book.title}
          </span>
          {author && (width === undefined || width >= 80) && (
            <small className="overflow-hidden font-sans text-xs text-muted">{author}</small>
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
      {children}
    </div>
  )
}
