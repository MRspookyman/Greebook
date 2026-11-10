import type { ReactNode } from 'react'

/** One of the two of you: me, or the other. */
export type Person = 'me' | 'you'

const waxOf = (who: Person) => (who === 'me' ? 'var(--me)' : 'var(--you)')

/** A drop of someone's wax: the one mark that says whose a thing is, everywhere in the app. */
export function Wax({ who, size = 11 }: { who: Person; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block flex-none rounded-full"
      style={{
        width: size,
        height: size,
        background: waxOf(who),
        boxShadow: 'inset 0 -2px 3px -1px rgb(0 0 0 / 0.3), 0 0 0 1px rgb(0 0 0 / 0.12)',
      }}
    />
  )
}

/** The seal: the drop of wax and the name next to it. */
export function Who({ who, name, className = '' }: { who: Person; name: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Wax who={who} />
      <span className="font-medium">{name}</span>
    </span>
  )
}

interface RowProps {
  who: Person
  name: string
  /** Where they are, said after the name: «p. 142». */
  text: ReactNode
  /** How far into the book, 0–1. Without it there is no line: the book hasn't been opened. */
  at?: number | null
}

/** One person's place in a book: their seal, where they are, and their own line of progress. */
export function PersonRow({ who, name, text, at }: RowProps) {
  return (
    <div>
      <p className="flex items-baseline justify-between gap-3 text-[15.5px] leading-snug">
        <Who who={who} name={name} className="translate-y-px" />
        <span className="quiet min-w-0 text-right">{text}</span>
      </p>
      {at != null && (
        <div className="mt-1.5 h-[5px] overflow-hidden rounded-full bg-rule" aria-hidden>
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.max(2, Math.min(100, at * 100))}%`, background: waxOf(who), transition: 'width 900ms var(--ease)' }}
          />
        </div>
      )}
    </div>
  )
}
