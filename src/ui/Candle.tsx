import { useId, type CSSProperties } from 'react'
import type { Color } from '@/lib/types'

interface Props {
  color: Color
  lit: boolean
  /** How much wax is left, 1 → 0. */
  wax?: number
  /** Rendered width in px; the candle keeps its proportions. */
  size?: number
  /** Leans the flame towards the other candle: -1 left, 1 right. */
  lean?: -1 | 0 | 1
  /** 0–1 while the finger is held on the wick. */
  igniting?: number
  /** An unlit wick that can be lit breathes a faint ember, so the gesture is seen before it is read. */
  inviting?: boolean
  /** Changes whenever the flame should shiver (a «guiño»). */
  tremble?: number
  /** Shows the wisp of smoke of a candle just blown out. */
  smoke?: boolean
}

/** A candle on its brass dish. Purely a drawing: whoever places it decides what touching it does. */
export function Candle({ color, lit, wax = 1, size = 120, lean = 0, igniting = 0, inviting = false, tremble = 0, smoke = false }: Props) {
  const id = useId()
  const height = 62 + 86 * Math.max(0, Math.min(1, wax))
  const top = 212 - height
  const wick = top - 10

  return (
    <svg
      className="candle"
      style={{ '--candle-wax': `var(--${color})` } as CSSProperties}
      viewBox="0 0 120 240"
      width={size}
      height={size * 2}
      aria-hidden
    >
      <defs>
        <radialGradient id={`${id}g`}>
          <stop offset="0" stopColor="#ffc86c" stopOpacity="0.38" />
          <stop offset="0.35" stopColor="#f6b653" stopOpacity="0.12" />
          <stop offset="1" stopColor="#f6b653" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}f`} x1="0" y1="1" x2="0.2" y2="0">
          <stop offset="0" stopColor="#d75b25" stopOpacity="0.7" />
          <stop offset="0.22" stopColor="#ffab35" />
          <stop offset="0.6" stopColor="#ffdc78" />
          <stop offset="1" stopColor="#fff1bb" />
        </linearGradient>
        <linearGradient id={`${id}core`} x2="0" y2="1">
          <stop stopColor="#fff9df" stopOpacity="0.35" />
          <stop offset="0.4" stopColor="#fff9df" />
          <stop offset="1" stopColor="#ffe8a4" />
        </linearGradient>
        <linearGradient id={`${id}w`}>
          <stop offset="0" stopColor="color-mix(in srgb, var(--candle-wax), #26342b 22%)" />
          <stop offset="0.17" stopColor="color-mix(in srgb, var(--candle-wax), #fff7df 28%)" />
          <stop offset="0.37" stopColor="color-mix(in srgb, var(--candle-wax), #fff7df 12%)" />
          <stop offset="0.7" stopColor="var(--candle-wax)" />
          <stop offset="1" stopColor="color-mix(in srgb, var(--candle-wax), #26342b 45%)" />
        </linearGradient>
        <linearGradient id={`${id}rim`} x2="0" y2="1">
          <stop stopColor="color-mix(in srgb, var(--candle-wax), #fff7df 48%)" />
          <stop offset="1" stopColor="color-mix(in srgb, var(--candle-wax), #fff7df 12%)" />
        </linearGradient>
        <radialGradient id={`${id}pool`}>
          <stop stopColor={lit ? '#ffe6a6' : 'var(--candle-wax)'} />
          <stop offset="1" stopColor="color-mix(in srgb, var(--candle-wax), #554431 23%)" />
        </radialGradient>
        <radialGradient id={`${id}warm`}>
          <stop stopColor="#ffe3a1" stopOpacity="0.7" />
          <stop offset="1" stopColor="#ffbf65" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}falloff`} gradientUnits="userSpaceOnUse" x1="60" y1={top} x2="60" y2="217">
          <stop stopColor="#fff2be" stopOpacity="0.55" />
          <stop offset="0.12" stopColor="#ffd384" stopOpacity="0.32" />
          <stop offset="0.42" stopColor="#ffc16c" stopOpacity="0" />
          <stop offset="0.68" stopColor="#35291d" stopOpacity="0.06" />
          <stop offset="1" stopColor="#35291d" stopOpacity="0.24" />
        </linearGradient>
        <radialGradient id={`${id}translucent`} cx="0.5" cy="0.37" r="0.8">
          <stop stopColor="#fff4cc" stopOpacity="0.94" />
          <stop offset="0.26" stopColor="#ffe7a2" stopOpacity="0.68" />
          <stop offset="0.6" stopColor="#ffc46a" stopOpacity="0.17" />
          <stop offset="1" stopColor="#ffc46a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}bloom`}>
          <stop stopColor="#fff0af" stopOpacity="0.54" />
          <stop offset="0.28" stopColor="#ffd278" stopOpacity="0.24" />
          <stop offset="0.65" stopColor="#ffb44e" stopOpacity="0.06" />
          <stop offset="1" stopColor="#ffb44e" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}brass`} x1="0" y1="0.2" x2="0.9" y2="0.8">
          <stop stopColor="color-mix(in srgb, var(--brass), #fff1c1 48%)" />
          <stop offset="0.28" stopColor="var(--brass)" />
          <stop offset="0.62" stopColor="color-mix(in srgb, var(--brass), #54401e 32%)" />
          <stop offset="0.85" stopColor="color-mix(in srgb, var(--brass), #fff1c1 38%)" />
          <stop offset="1" stopColor="var(--brass)" />
        </linearGradient>
        <radialGradient id={`${id}shadow`}>
          <stop stopColor="#1b2019" stopOpacity="0.3" />
          <stop offset="1" stopColor="#1b2019" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}wax`}>
          <path d={`M38 ${top + 1}Q60 ${top - 5} 82 ${top + 1}V209Q81 217 60 217Q39 217 38 209Z`} />
        </clipPath>
      </defs>

      {lit && <ellipse className="glow" cx="60" cy={wick - 18} rx="77" ry="86" fill={`url(#${id}g)`} />}

      {/* The rolled brass edge catches the light above a soft contact shadow. */}
      <ellipse cx="60" cy="221" rx="48" ry="9" fill={`url(#${id}shadow)`} />
      {lit && <ellipse className="candle-reflection" cx="60" cy="222" rx="49" ry="7" fill={`url(#${id}g)`} />}
      <path d="M18 213.5C18 224 102 224 102 213.5Z" fill={`url(#${id}brass)`} />
      <ellipse cx="60" cy="213.5" rx="42" ry="7.5" fill={`url(#${id}brass)`} />
      <ellipse cx="60" cy="213" rx="35.5" ry="5" fill="color-mix(in srgb, var(--brass), #46371e 28%)" />
      <path d="M19 214C28 222 92 222 101 214" stroke="#fff0b8" strokeOpacity="0.35" strokeWidth="0.8" fill="none" />
      {lit && <ellipse className="candle-reflection" cx="59" cy="215" rx="29" ry="3.8" fill={`url(#${id}warm)`} />}
      <ellipse cx="60" cy="212" rx="24" ry="4.8" fill="#241e12" opacity="0.22" />

      {/* The wax stays cylindrical even as its height is consumed. */}
      <path d={`M38 ${top + 1}Q60 ${top - 5} 82 ${top + 1}V209Q81 217 60 217Q39 217 38 209Z`} fill={`url(#${id}w)`} />
      <path d={`M42 ${top + 17}C41 ${top + 40} 42 190 43 207`} stroke="#fff7df" strokeOpacity="0.1" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      {lit && <path d={`M38 ${top + 1}Q60 ${top - 5} 82 ${top + 1}V209Q81 217 60 217Q39 217 38 209Z`} fill={`url(#${id}falloff)`} />}
      <path
        d={`M38 ${top + 1}C43 ${top + 6} 47 ${top + 2} 49 ${top + 7}L49 ${top + 25}C49 ${top + 31} 54 ${top + 31} 54 ${top + 25}L54 ${top + 10}C55 ${top + 5} 63 ${top + 8} 68 ${top + 7}C73 ${top + 6} 73 ${top + 10} 74 ${top + 14}C75 ${top + 18} 79 ${top + 17} 79 ${top + 12}L80 ${top + 5}L82 ${top + 1}Q60 ${top - 6} 38 ${top + 1}Z`}
        fill={`url(#${id}rim)`}
      />
      <path d={`M50 ${top + 12}V${top + 25}Q50 ${top + 28} 51 ${top + 28}`} stroke="#fff7df" strokeOpacity="0.28" strokeWidth="0.9" fill="none" strokeLinecap="round" />
      <path d={`M45 ${top + height * 0.24}Q44 ${top + height * 0.32} 45 ${top + height * 0.4}M72 ${top + height * 0.16}Q73 ${top + height * 0.28} 72 ${top + height * 0.37}M77 ${top + height * 0.45}L77 ${top + height * 0.67}`} stroke="var(--candle-wax)" strokeOpacity="0.2" strokeWidth="0.65" fill="none" strokeLinecap="round" />
      {lit && <ellipse className="candle-reflection" clipPath={`url(#${id}wax)`} cx="60" cy={top + height * 0.15} rx="25" ry={height * 0.38} fill={`url(#${id}translucent)`} />}
      <path d={`M38 ${top + 1}C43 ${top - 5} 51 ${top - 3} 57 ${top - 4}C65 ${top - 6} 77 ${top - 3} 82 ${top + 1}C79 ${top + 7} 68 ${top + 8} 60 ${top + 7}C49 ${top + 8} 41 ${top + 6} 38 ${top + 1}Z`} fill={`url(#${id}rim)`} />
      <ellipse cx="60" cy={top + 1} rx="15.8" ry="3.8" fill={`url(#${id}pool)`} />
      {lit && (
        <g className="candle-reflection">
          <ellipse cx="60" cy={top + 1.5} rx="10" ry="2.4" fill={`url(#${id}warm)`} />
          <path d={`M59 ${top}Q57 ${top + 1} 60 ${top + 3}Q63 ${top + 1} 61 ${top}`} fill="#fff7d8" opacity="0.88" />
          <path d={`M46 ${top + 1}Q50 ${top - 2} 55 ${top - 1}M64 ${top + 4}Q70 ${top + 4} 74 ${top + 2}`} stroke="#fff6d5" strokeOpacity="0.85" strokeWidth="0.85" strokeLinecap="round" fill="none" />
        </g>
      )}
      <path d={`M46 ${top + 2}Q59 ${top + 7} 74 ${top + 2}`} stroke="#fff8db" strokeOpacity={lit ? 0.65 : 0.28} strokeWidth="0.8" fill="none" />
      <path d={`M60 ${top + 2}Q63 ${top - 3} 60 ${wick}`} stroke="#32271f" strokeWidth="2.3" strokeLinecap="round" fill="none" />
      <path d={`M60 ${top - 3}Q61 ${top - 6} 60 ${wick}`} stroke="#171b1b" strokeWidth="1.5" strokeLinecap="round" fill="none" />

      {!lit && inviting && igniting === 0 && (
        <g className="candle-invite">
          <circle cx="60" cy={wick} r="15" fill={`url(#${id}warm)`} />
          <circle cx="60" cy={wick} r="1.5" fill="#ffc86c" />
        </g>
      )}

      {/* The ember grows from the charred tip, not from the whole candle. */}
      {!lit && igniting > 0 && (
        <g opacity={0.4 + igniting * 0.6}>
          {/* A ring closes around the wick: how long is left to hold. */}
          <circle cx="60" cy={wick - 3} r="25" stroke="#ffc86c" strokeOpacity="0.16" strokeWidth="2.2" fill="none" />
          <circle
            cx="60"
            cy={wick - 3}
            r="25"
            stroke="#ffc86c"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset={1 - igniting}
            transform={`rotate(-90 60 ${wick - 3})`}
          />
          <circle cx="60" cy={wick} r={4 + igniting * 15} fill={`url(#${id}warm)`} />
          <ellipse cx="60" cy={wick - igniting * 3} rx={1 + igniting * 2.4} ry={1.4 + igniting * 5} fill="#ffc86c" />
          <circle cx="60" cy={wick} r="1.2" fill="#fff1c2" />
        </g>
      )}

      {lit && (
        <g transform={`translate(60 ${wick + 3})`}>
          {/* Separate origins keep both the lean and the shiver rooted at the wick. */}
          <g className="flame-lean" style={{ transform: `rotate(${lean * 9}deg)` }}>
            <g key={tremble} className={`flame-wrap${tremble ? ' tremble' : ''}`}>
              <ellipse className="candle-flame-halo" cx="0" cy="-25" rx="24" ry="39" fill={`url(#${id}bloom)`} />
              <path className="flame" d="M0 1C-12 -3 -12 -19 -5 -33C-2 -39 2 -45 1 -52C10 -40 13 -27 10 -15C9 -7 4 -1 0 1Z" fill={`url(#${id}f)`} />
              <path className="flame-core" d="M0 -4C-4 -7 -5 -16 -2 -25C0 -29 2 -33 1 -37C6 -28 7 -20 4 -13C3 -8 2 -5 0 -4Z" fill={`url(#${id}core)`} />
              <path d="M-4 0Q-6 -5 -2 -9Q0 -5 1 -3Q3 -7 4 -8Q7 -2 3 1Z" fill="#8faecb" opacity="0.65" />
              <path d="M-1 1Q-3 -3 0 -6Q3 -3 2 1Z" fill="#453124" opacity="0.8" />
            </g>
          </g>
          <circle cx="0" cy="-3" r="1.1" fill="#ffb361" />
        </g>
      )}

      {smoke && !lit && (
        <g className="smoke" stroke="var(--muted)" strokeLinecap="round" fill="none">
          <path d={`M60 ${wick}C54 ${wick - 9} 67 ${wick - 15} 63 ${wick - 24}S49 ${wick - 35} 59 ${wick - 47}S74 ${wick - 60} 66 ${wick - 70}`} strokeWidth="1.6" opacity="0.6" />
          <path d={`M60 ${wick - 10}C67 ${wick - 20} 53 ${wick - 27} 56 ${wick - 36}S69 ${wick - 49} 65 ${wick - 57}`} strokeWidth="3.4" opacity="0.12" />
        </g>
      )}
    </svg>
  )
}
