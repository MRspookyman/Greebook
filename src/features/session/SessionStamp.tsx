import { useId } from 'react'
import { fmt } from '@/lib/dates'

/**
 * Library date stamp that lands when a session is saved: the one celebratory moment of the
 * reading flow. Decorative ring text; the date is announced through the label.
 */
export function SessionStamp({ date, detail }: { date: string; detail: string }) {
  const id = useId().replace(/:/g, '')
  return (
    <div
      className="relative grid h-[148px] w-[148px] place-items-center text-accent"
      role="img"
      aria-label={`Sesión del ${fmt(date, "d 'de' MMMM")}: ${detail}`}
    >
      <span
        aria-hidden
        className="absolute inset-3 rounded-full border-2 border-current"
        style={{ animation: 'gb-ink 700ms var(--ease) 260ms both' }}
      />
      <svg
        viewBox="0 0 140 140"
        width="148"
        height="148"
        aria-hidden
        style={{ animation: 'gb-stamp 560ms cubic-bezier(0.2, 0.8, 0.2, 1) both', opacity: 0.9 }}
      >
        <defs>
          <path id={`ring-${id}`} d="M70,70 m-50,0 a50,50 0 1,1 100,0 a50,50 0 1,1 -100,0" />
          <filter id={`ink-${id}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="7" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.6" />
          </filter>
        </defs>
        <g filter={`url(#ink-${id})`} fill="currentColor" stroke="currentColor">
          <circle cx="70" cy="70" r="64" fill="none" strokeWidth="2.4" />
          <circle cx="70" cy="70" r="40" fill="none" strokeWidth="1" />
          <text fontFamily="Schibsted Grotesk Variable, sans-serif" fontSize="10.5" fontWeight="600" letterSpacing="2.6" stroke="none">
            <textPath href={`#ring-${id}`} startOffset="2%">
              GREENBOOK · DIARIO DE LECTURA ·
            </textPath>
          </text>
          <text
            x="70"
            y="76"
            textAnchor="middle"
            fontFamily="var(--font-serif)"
            fontSize="34"
            stroke="none"
            style={{ fontVariantNumeric: 'lining-nums' }}
          >
            {fmt(date, 'd')}
          </text>
          <text
            x="70"
            y="94"
            textAnchor="middle"
            fontFamily="Schibsted Grotesk Variable, sans-serif"
            fontSize="10.5"
            fontWeight="600"
            letterSpacing="2"
            stroke="none"
          >
            {fmt(date, 'MMM').replace('.', '').toUpperCase()}
          </text>
        </g>
      </svg>
    </div>
  )
}
