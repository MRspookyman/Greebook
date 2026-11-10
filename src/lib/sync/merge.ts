import type { Book, Db, Profile, Reading, Session, Slip, Table } from '../types'

/** What a pull brings back. Slips always come whole; the rest, only what changed since the cursor. */
export interface Pulled {
  profiles: Profile[]
  books: Book[]
  readings: Reading[]
  sessions: Session[]
  slips: Slip[]
}

export type Cursors = Partial<Record<'books' | 'readings' | 'sessions', string>>

/** How a row waiting to be uploaded is named in the queue. */
export const keyOf = (table: Table, id: string) => `${table}:${id}`

/**
 * Folds what the server sent into the local copy.
 * A row still waiting to be uploaded is never overwritten: the local change wins until it is sent.
 */
export function mergePull(db: Db, dirty: ReadonlySet<string>, pulled: Pulled): Db {
  const next: Db = {
    profiles: { ...db.profiles },
    books: { ...db.books },
    readings: { ...db.readings },
    sessions: { ...db.sessions },
    slips: {},
  }
  for (const row of pulled.profiles) {
    if (!dirty.has(keyOf('profiles', row.id))) next.profiles[row.id] = row
  }
  for (const table of ['books', 'readings', 'sessions'] as const) {
    const rows = next[table] as Record<string, { id: string; deleted_at: string | null }>
    for (const row of pulled[table]) {
      if (dirty.has(keyOf(table, row.id))) continue
      if (row.deleted_at) delete rows[row.id]
      else rows[row.id] = row
    }
  }
  // Slips are replaced wholesale: whether one is folded changes when *you* move, not when it does.
  for (const row of pulled.slips) next.slips[row.id] = row
  for (const row of Object.values(db.slips)) {
    if (dirty.has(keyOf('slips', row.id))) next.slips[row.id] = row
  }
  return next
}

/** The newest `updated_at` seen per table; the next pull asks from there. */
export function advance(cursors: Cursors, pulled: Pulled): Cursors {
  const next = { ...cursors }
  for (const table of ['books', 'readings', 'sessions'] as const) {
    for (const row of pulled[table]) {
      if (!next[table] || row.updated_at > next[table]) next[table] = row.updated_at
    }
  }
  return next
}

/** Upload order: a row never goes before the one it points to. */
const ORDER: Table[] = ['books', 'readings', 'sessions', 'slips', 'profiles']

export function uploadOrder(dirty: Iterable<string>): Array<{ table: Table; id: string }> {
  return [...dirty]
    .map((key) => {
      const at = key.indexOf(':')
      return { table: key.slice(0, at) as Table, id: key.slice(at + 1) }
    })
    .sort((a, b) => ORDER.indexOf(a.table) - ORDER.indexOf(b.table))
}
