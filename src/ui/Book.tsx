import { useState, type CSSProperties } from 'react'
import { spineOf } from '@/lib/shelf'
import type { Book } from '@/lib/types'

/** The stamped decoration on a spine: three bindings, so a shelf never looks printed. */
const BANDS = [
  'linear-gradient(to bottom, transparent 9px, currentColor 9px, currentColor 10px, transparent 10px, transparent 13px, currentColor 13px, currentColor 14px, transparent 14px)',
  'linear-gradient(to bottom, transparent 10px, currentColor 10px, currentColor 13px, transparent 13px)',
  'linear-gradient(to bottom, transparent 8px, currentColor 8px, currentColor 9px, transparent 9px)',
]

interface SpineProps {
  book: Book
  /** Wax colours of who has read it: a ribbon each. */
  ribbons?: string[]
  onClick?: () => void
  style?: CSSProperties
}

/** A book seen from the shelf: cloth, stamped title, and a ribbon for each of you who read it. */
export function Spine({ book, ribbons = [], onClick, style }: SpineProps) {
  const spine = spineOf(book)
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${book.title}${book.author ? `, de ${book.author}` : ''}`}
      className="group relative flex-none origin-bottom rounded-t-[3px] rounded-b-[1px] transition-transform duration-200 ease-out hover:-translate-y-1.5 active:-translate-y-2"
      style={{
        width: spine.width,
        height: spine.height,
        background: spine.cloth.bg,
        color: spine.cloth.ink,
        boxShadow: 'inset 3px 0 4px -2px rgb(255 255 255 / 0.22), inset -4px 0 6px -3px rgb(0 0 0 / 0.5)',
        ...style,
      }}
    >
      {ribbons.map((color, i) => (
        <span
          key={color + i}
          aria-hidden
          className="absolute -top-[7px] h-[15px] w-[6px] rounded-t-[1px]"
          style={{ left: 5 + i * 8, background: color, boxShadow: '0 1px 2px rgb(0 0 0 / 0.35)' }}
        />
      ))}
      <span aria-hidden className="absolute inset-x-0 top-0 h-5 opacity-60" style={{ backgroundImage: BANDS[spine.band] }} />
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-5 rotate-180 opacity-60"
        style={{ backgroundImage: BANDS[spine.band] }}
      />
      <span
        aria-hidden
        className="absolute inset-x-0 top-6 bottom-6 flex items-center justify-center overflow-hidden"
        style={{ writingMode: 'vertical-rl' }}
      >
        <span
          className="max-h-full overflow-hidden px-0.5 text-center leading-[1.05] font-medium"
          style={{
            fontSize: spine.width > 40 ? 13.5 : spine.width > 32 ? 12.5 : 11.5,
            display: '-webkit-box',
            WebkitLineClamp: spine.width > 38 ? 2 : 1,
            WebkitBoxOrient: 'vertical',
            textOverflow: 'ellipsis',
          }}
        >
          {book.title}
        </span>
      </span>
    </button>
  )
}

interface CoverProps {
  book: Book
  /** Rendered width in px; height follows a 2:3 book. */
  width: number
  className?: string
}

/** The front of a book: its real cover when there is one, otherwise a cloth cover set in type. */
export function Cover({ book, width, className = '' }: CoverProps) {
  const [broken, setBroken] = useState(false)
  const spine = spineOf(book)
  const height = Math.round(width * 1.5)
  const frame: CSSProperties = {
    width,
    height,
    borderRadius: '2px 5px 5px 2px',
    boxShadow: '0 12px 22px -12px rgb(0 0 0 / 0.65), 0 2px 4px rgb(0 0 0 / 0.2), inset 4px 0 5px -3px rgb(255 255 255 / 0.25)',
  }
  if (book.cover_url && !broken) {
    return (
      <img
        src={book.cover_url}
        alt=""
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        onError={() => setBroken(true)}
        className={`flex-none object-cover ${className}`}
        style={{ ...frame, background: spine.cloth.bg }}
      />
    )
  }
  return (
    <div
      aria-hidden
      className={`relative flex flex-none flex-col justify-between overflow-hidden ${className}`}
      style={{ ...frame, background: spine.cloth.bg, color: spine.cloth.ink, padding: width * 0.11 }}
    >
      <span className="absolute inset-y-0 left-[7%] w-px bg-current opacity-25" />
      <span
        className="pl-[8%] leading-[1.08] font-medium"
        style={{
          fontSize: Math.max(11, width * 0.135),
          display: '-webkit-box',
          WebkitLineClamp: 5,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {book.title}
      </span>
      <span className="truncate pl-[8%] italic opacity-80" style={{ fontSize: Math.max(9, width * 0.085) }}>
        {book.author}
      </span>
    </div>
  )
}
