export function excerpt(text: unknown): string {
  const value = String(text ?? '').trim()
  return value.length > 80 ? `${value.slice(0, 79)}…` : value
}

/** Group summaries never include excerpts: earlier quotes in the burst may still be locked. */
export function quoteNotification(input: {
  name: string
  book: string
  kind: unknown
  count: number
  locked: boolean
  page: unknown
  body: unknown
  actorId: string
  bookId: string
}): { title: string; body: string; tag: string; renotify: false } {
  const { name, book, kind, count, locked, page, body, actorId, bookId } = input
  const what = kind === 'nota' ? 'una nota' : 'una cita'
  return {
    title: count > 1 ? `✍️ ${name} ha guardado citas` : `✍️ ${name} te ha dejado ${what}`,
    body: count > 1
      ? `Ha guardado ${count} citas de «${book}»`
      : locked
        ? `«${book}» · p. ${page}. Se abre cuando llegues.`
        : `«${book}»: «${excerpt(body)}»`,
    tag: `quotes:${actorId}:${bookId}`,
    renotify: false,
  }
}
