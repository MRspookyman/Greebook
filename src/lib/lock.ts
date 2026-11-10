import type { Reading, Slip } from './types'

/**
 * When a slip is folded for the person looking at it. The server applies the same rule
 * (`slip_locked()` in supabase/migrations/0001_greenbook.sql) and is the one that withholds the text;
 * this copy lets the app say what will open, and runs the «ensayo» server.
 */

type Mark = Pick<Reading, 'status' | 'position' | 'total'> | null | undefined

export const round5 = (n: number) => Math.round(n * 1e5) / 1e5

/** Where a bookmark is in its book, 0–1, with the precision slips are stored at. */
export function fractionOf(position: number, total: number): number {
  return total > 0 ? round5(Math.min(1, Math.max(0, position / total))) : 0
}

/** Still ahead of them: on the pile or being read. */
const open = (mark: Mark) => !!mark && (mark.status === 'pendiente' || mark.status === 'leyendo')

export function isLocked(
  slip: Pick<Slip, 'user_id' | 'kind' | 'at'>,
  viewer: string,
  /** The viewer's bookmark in that book, if any. */
  mine: Mark,
  /** The author's bookmark in that book, if any. */
  theirs: Mark,
  /** Whether the viewer has already written their own letter for that book. */
  viewerWroteLetter: boolean,
): boolean {
  if (slip.user_id === viewer) return false
  switch (slip.kind) {
    case 'carta':
      // Blind: you read theirs once you've finished and written yours.
      return open(mine) || (mine?.status === 'terminado' && !viewerWroteLetter)
    case 'prediccion':
      // Opens when both have closed the book.
      return open(mine) || !theirs || open(theirs)
    default:
      return slip.at != null && open(mine) && fractionOf(mine!.position, mine!.total) < slip.at
  }
}
