import { useId } from 'react'
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
  /** Changes whenever the flame should shiver (a «guiño»). */
  tremble?: number
  /** Shows the wisp of smoke of a candle just blown out. */
  smoke?: boolean
}

/** A candle on its brass dish. Purely a drawing: whoever places it decides what touching it does. */
export function Candle({ color, lit, wax = 1, size = 120, lean = 0, igniting = 0, tremble = 0, smoke = false }: Props) {
  const id = useId()
  const height = 62 + 86 * Math.max(0, Math.min(1, wax))
  const top = 212 - height
  const wick = top - 10

  return (
    <svg className="candle" viewBox="0 0 120 240" width={size} height={size * 2} aria-hidden>
      <defs>
        <radialGradient id={`${id}g`}>
          <stop offset="0" stopColor="var(--flame)" stopOpacity="0.6" />
          <stop offset="0.45" stopColor="var(--flame)" stopOpacity="0.18" />
          <stop offset="1" stopColor="var(--flame)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}f`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#f2793a" />
          <stop offset="0.35" stopColor="var(--flame)" />
          <stop offset="1" stopColor="#ffe9a8" />
        </linearGradient>
        <linearGradient id={`${id}w`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="0.4" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.22" />
        </linearGradient>
      </defs>

      {lit && <circle className="glow" cx="60" cy={wick - 18} r="92" fill={`url(#${id}g)`} />}

      {/* Dish */}
      <ellipse cx="60" cy="219" rx="46" ry="8" fill="#000" opacity="0.22" />
      <ellipse cx="60" cy="214" rx="42" ry="7.5" fill="var(--brass)" />
      <ellipse cx="60" cy="212.5" rx="34" ry="5" fill="#000" opacity="0.18" />

      {/* Wax */}
      <g style={{ transition: 'all 1.2s var(--ease)' }}>
        <rect x="38" y={top} width="44" height={height} rx="5" fill={`var(--${color})`} />
        <rect x="38" y={top} width="44" height={height} rx="5" fill={`url(#${id}w)`} />
        <rect x="43" y={top + 2} width="7" height={Math.min(30, height * 0.3)} rx="3.5" fill="#fff" opacity="0.2" />
        <ellipse cx="60" cy={top + 1} rx="22" ry="5" fill={`var(--${color})`} />
        <ellipse cx="60" cy={top + 1} rx="22" ry="5" fill="#fff" opacity={lit ? 0.42 : 0.2} />
        {lit && <ellipse cx="60" cy={top + 1.5} rx="12" ry="2.6" fill="var(--flame)" opacity="0.5" />}
        <path d={`M60 ${top + 1} q1.5 -5 0 -10`} stroke="#2b2118" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      </g>

      {/* The ember that grows while the finger stays on the wick */}
      {!lit && igniting > 0 && (
        <circle cx="60" cy={wick} r={2 + igniting * 9} fill="var(--flame)" opacity={0.35 + igniting * 0.6} />
      )}

      {lit && (
        // The lean sits outside the animated group: an animation would otherwise replace its transform.
        <g className="flame-lean" style={{ transform: `rotate(${lean * 9}deg)` }}>
          <g key={tremble} className={`flame-wrap${tremble ? ' tremble' : ''}`}>
            <g transform={`translate(60 ${wick + 3})`}>
              <path className="flame" d="M0 0C-14 -9 -10 -27 0 -46C10 -27 14 -9 0 0Z" fill={`url(#${id}f)`} />
              <path className="flame-core" d="M0 -2C-6 -7 -4.5 -17 0 -27C4.5 -17 6 -7 0 -2Z" fill="var(--flame-core)" />
            </g>
          </g>
        </g>
      )}

      {smoke && !lit && (
        <path
          className="smoke"
          d={`M60 ${wick} c-6 -8 6 -14 0 -22 c-6 -8 6 -14 0 -22`}
          stroke="var(--muted)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
      )}
    </svg>
  )
}
