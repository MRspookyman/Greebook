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
  /** The stars it was given, stamped at the foot of the spine. */
  stars?: number | null
  onClick?: () => void
  style?: CSSProperties
}

/** A book seen from the shelf: cloth, stamped title, and a ribbon for each of you who read it. */
export function Spine({ book, ribbons = [], stars, onClick, style }: SpineProps) {
  const spine = spineOf(book)
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${book.title}${book.author ? `, de ${book.author}` : ''}${stars ? `, ${stars} de 5 estrellas` : ''}`}
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
          className="absolute -top-[9px] h-[19px] w-[8px] rounded-t-[1.5px]"
          style={{
            left: 4 + i * 9,
            background: color,
            boxShadow: '0 1px 2px rgb(0 0 0 / 0.4)',
            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)',
          }}
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
        className={`absolute inset-x-0 top-6 ${stars ? 'bottom-[30px]' : 'bottom-6'} flex items-center justify-center overflow-hidden`}
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
      {stars ? (
        <span aria-hidden className="absolute inset-x-0 bottom-[5px] text-center text-[11px] leading-none font-semibold">
          {stars}★
        </span>
      ) : null}
    </button>
  )
}

/** A book lying on its side, for the ones left halfway: the title reads along the spine. */
export function Lying({ book, onClick, style }: Pick<SpineProps, 'book' | 'onClick' | 'style'>) {
  const spine = spineOf(book)
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${book.title}${book.author ? `, de ${book.author}` : ''}`}
      className="pressable relative block max-w-full flex-none truncate rounded-l-[3px] rounded-r-[1px] px-7 text-center text-[14px] font-medium"
      style={{
        width: spine.height + 96,
        height: Math.round(spine.width * 0.78),
        lineHeight: `${Math.round(spine.width * 0.78)}px`,
        background: spine.cloth.bg,
        color: spine.cloth.ink,
        boxShadow: 'inset 0 3px 4px -2px rgb(255 255 255 / 0.22), inset 0 -4px 6px -3px rgb(0 0 0 / 0.5)',
        ...style,
      }}
    >
      <span aria-hidden className="absolute inset-y-0 left-2.5 w-px bg-current opacity-45" />
      <span aria-hidden className="absolute inset-y-0 right-2.5 w-px bg-current opacity-45" />
      {book.title}
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
    boxShadow:
      '0 12px 22px -12px rgb(0 0 0 / 0.65), 0 2px 4px rgb(0 0 0 / 0.2), inset 4px 0 5px -3px rgb(255 255 255 / 0.25)',
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
      className={`book-cloth ${width < 54 ? 'book-cloth--mini' : ''} relative flex flex-none flex-col justify-between overflow-hidden ${className}`}
      data-binding={spine.band}
      style={{ ...frame, background: spine.cloth.bg, color: spine.cloth.ink, padding: width * 0.11 }}
    >
      <span className="book-cloth-rule absolute inset-y-0 left-[7%] w-px bg-current opacity-25" />
      {width >= 54 && (
        <svg
          className="book-cloth-emblem"
          viewBox="0 0 64 64"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          aria-hidden
        >
          <circle cx="32" cy="32" r="23" />
          <path d="M32 11v42M18 19c16 0 28 13 28 26-16 0-28-13-28-26ZM46 19c-16 0-28 13-28 26 16 0 28-13 28-26Z" />
          <path d="M5 32h5m44 0h5M32 5v5m0 44v5" />
        </svg>
      )}
      <span
        className="book-cloth-title pl-[8%] leading-[1.08] font-medium"
        style={{
          fontSize: Math.max(8, width * 0.145),
          display: '-webkit-box',
          WebkitLineClamp: 5,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {width < 54 ? book.title.charAt(0) : book.title}
      </span>
      <span className="truncate pl-[8%] italic opacity-80" style={{ fontSize: Math.max(6, width * 0.085) }}>
        {book.author}
      </span>
    </div>
  )
}
