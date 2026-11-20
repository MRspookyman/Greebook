/** A book already under way, as it is being typed: where the bookmark is, and since when. */
export interface AlreadyDraft {
  /** As typed: empty while nothing is written. */
  position: string
  /** 'yyyy-mm-dd', or empty when it is not remembered. */
  startedOn: string
}

/** Whether what was typed is a place in the book, and returns it as a number. */
export function alreadyPosition(draft: AlreadyDraft, total: number): number | null {
  const position = Number(draft.position)
  return draft.position !== '' && Number.isInteger(position) && position >= 0 && position < total ? position : null
}

