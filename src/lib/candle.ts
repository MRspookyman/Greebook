/**
 * How a candle wears down in its first hour and a half (after that it stays as it is, lit): the light it loses, and the wax that runs down its side.
 * `wax` is what is left of it, 1 → 0 (see `waxLeft`). Pure sums: the drawing and the wall both read from here.
 */

const clamp = (value: number) => Math.min(1, Math.max(0, value))

/** How far and how strongly a candle lights the room; both are 1 for a new one and fall as it burns. */
export function glowOf(wax: number): { reach: number; strength: number } {
  const spent = 1 - clamp(wax)
  // It loses more than half of both by the end, and most of that in the second half: a stub gutters.
  const loss = 0.34 * spent + 0.26 * spent * spent
  return { reach: 1 - loss, strength: 1 - loss * 0.9 }
}

/** A run of wax down the candle's side, in the drawing's own units. */
export interface Drip {
  /** Where across the candle it runs. */
  x: number
  /** Half its width. */
  width: number
  /** How far it has run from the rim. */
  length: number
  /** It reached the dish: no bead at its end, a pool under it instead. */
  landed: boolean
  /** How wide its pool on the dish has spread (0 until it lands). */
  pool: number
}

/** Each drip starts once that much wax has melted, and takes its time to run. Always the same six. */
const DRIPS = [
  { x: 44.5, width: 2.5, starts: 0.03, takes: 0.3 },
  { x: 72, width: 3, starts: 0.1, takes: 0.34 },
  { x: 57, width: 2.1, starts: 0.22, takes: 0.42 },
  { x: 78, width: 2.3, starts: 0.34, takes: 0.3 },
  { x: 50, width: 2.8, starts: 0.48, takes: 0.36 },
  { x: 65, width: 2.2, starts: 0.6, takes: 0.3 },
]

/**
 * The wax that has run down a candle by now. `room` is how far it is from the rim to the dish: as the candle
 * shortens there is less of it, so late drips land sooner.
 */
export function dripsFor(wax: number, room: number): Drip[] {
  const melted = 1 - clamp(wax)
  const drips: Drip[] = []
  for (const drip of DRIPS) {
    if (melted <= drip.starts) continue
    const since = melted - drip.starts
    // It runs fast at first and slows as it cools.
    const run = Math.sqrt(clamp(since / drip.takes)) * 150
    const landed = run >= room
    drips.push({
      x: drip.x,
      width: drip.width,
      length: Math.min(run, room),
      landed,
      pool: landed ? Math.min(9, 3 + (since - drip.takes * (room / 150) ** 2) * 16) : 0,
    })
  }
  return drips
}
