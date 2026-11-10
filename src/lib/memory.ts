import type { BookView } from './model'
import type { Book } from './types'

export interface Memory {
  book: Book
  /** How many years ago, today. */
  years: number
  who: 'mine' | 'theirs' | 'both'
}

/**
 * «Hoy hace un año terminabais Patria»: a book one of you finished on this same day in an earlier year.
 * `withEvenings` holds the readings that have evenings: a book added as «ya lo leí» has no real day.
 */
export function memoryFor(views: BookView[], today: string, withEvenings: ReadonlySet<string>): Memory | null {
  const monthDay = today.slice(4)
  const found: Memory[] = []
  for (const view of views) {
    const hit = (r: BookView['mine']) =>
      !!r && r.status === 'terminado' && !!r.finished_on && r.finished_on.slice(4) === monthDay &&
      r.finished_on < today && withEvenings.has(r.id)
    const mine = hit(view.mine)
    const theirs = hit(view.theirs)
    if (!mine && !theirs) continue
    const day = (mine ? view.mine : view.theirs)!.finished_on!
    found.push({
      book: view.book,
      years: Number(today.slice(0, 4)) - Number(day.slice(0, 4)),
      who: mine && theirs ? 'both' : mine ? 'mine' : 'theirs',
    })
  }
  // The most recent one, and one read by both before one read alone.
  return found.sort((a, b) => a.years - b.years || Number(b.who === 'both') - Number(a.who === 'both'))[0] ?? null
}

export function memoryLine(memory: Memory, partner: string): string {
  const ago = memory.years === 1 ? 'Hoy hace un año' : `Hoy hace ${memory.years} años`
  const verb = memory.who === 'both' ? 'terminabais' : memory.who === 'mine' ? 'terminabas' : `${partner} terminaba`
  return `${ago} ${verb}`
}
