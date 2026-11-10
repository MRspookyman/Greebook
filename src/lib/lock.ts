import type { Reading, Slip } from './types'

/**
 * Notes are never folded any more: both of you always see every note in a book. `isLocked` stays as the one
 * place that says so (the server's `slip_locked()` says the same) and for the «ensayo» server.
 */

type Mark = Pick<Reading, 'status' | 'position' | 'total'> | null | undefined

export const round5 = (n: number) => Math.round(n * 1e5) / 1e5

/** Where a bookmark is in its book, 0–1, with the precision slips are stored at. */
export function fractionOf(position: number, total: number): number {
  return total > 0 ? round5(Math.min(1, Math.max(0, position / total))) : 0
}

export function isLocked(
  _slip: Pick<Slip, 'user_id' | 'kind' | 'at'>,
  _viewer: string,
  _mine?: Mark,
  _theirs?: Mark,
  _viewerWroteLetter?: boolean,
): boolean {
  return false
}

/**
 * The first position in a book of `total` units from which a slip at `at` can be read: the same point
 * of the book, said in the reader's own edition (or in their Kindle's %).
 */
export function positionFor(at: number, total: number): number {
  return Math.max(0, Math.min(total, Math.ceil((at - 0.000005) * total)))
}
