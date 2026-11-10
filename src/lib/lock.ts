import type { Reading, Slip } from './types'

/**
 * When a note is hidden from the person looking at it: only if its author chose to hide it until its page,
 * and the reader hasn't got there yet. The server applies the same rule (`slip_locked()` in
 * supabase/migrations/0004_notas_ocultas.sql) and is the one that withholds the text; this copy lets the app
 * say what will open, and runs the «ensayo» server.
 */

type Mark = Pick<Reading, 'status' | 'position' | 'total'> | null | undefined

export const round5 = (n: number) => Math.round(n * 1e5) / 1e5

/** Where a bookmark is in its book, 0–1, with the precision slips are stored at. */
export function fractionOf(position: number, total: number): number {
  return total > 0 ? round5(Math.min(1, Math.max(0, position / total))) : 0
}

export function isLocked(
  slip: Pick<Slip, 'user_id' | 'at' | 'hidden'>,
  viewer: string,
  /** The viewer's bookmark in that book, if any. */
  mine: Mark,
): boolean {
  if (slip.user_id === viewer || !slip.hidden || slip.at == null) return false
  // Still ahead of them: on the pile or being read, and short of that page.
  return !!mine && (mine.status === 'pendiente' || mine.status === 'leyendo') && fractionOf(mine.position, mine.total) < slip.at
}

/**
 * The first position in a book of `total` units from which a slip at `at` can be read: the same point
 * of the book, said in the reader's own edition (or in their Kindle's %).
 */
export function positionFor(at: number, total: number): number {
  return Math.max(0, Math.min(total, Math.ceil((at - 0.000005) * total)))
}
