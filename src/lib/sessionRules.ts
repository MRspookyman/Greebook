/** A session without new pages still counts from this many minutes: the streak's «5 minutos o una página». */
export const TIME_ONLY_MINUTES = 5

/** Same rule as the `sessions_progress_check` constraint: it moves forward, or stays put with enough minutes. */
export function validSessionProgress(startPos: number, endPos: number, minutes: number | null | undefined): boolean {
  return endPos > startPos || (endPos === startPos && (minutes ?? 0) >= TIME_ONLY_MINUTES)
}

/** A session that only recorded reading time. */
export function timeOnly(session: { start_pos: number; end_pos: number }): boolean {
  return session.end_pos === session.start_pos
}
