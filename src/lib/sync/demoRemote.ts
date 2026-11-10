import { isLocked } from '../lock'
import { emptyDb, type Db, type Profile, type Reading, type Row, type Slip, type Table } from '../types'
import { RemoteError, type Remote, type Signal } from './remote'
import { story } from './demoStory'

/**
 * «Modo ensayo»: a pretend server inside this browser, for trying the app without Supabase.
 * It keeps both people's data in localStorage, applies the same folding rule as the real server and
 * talks between tabs, so two tabs can be the two of you. Who you are is per tab (sessionStorage).
 */
const SERVER = 'gb.ensayo.servidor'
const WHO = 'gb.ensayo.yo'
export const LAURA = '00000000-0000-4000-8000-00000000000a'
export const JAVIER = '00000000-0000-4000-8000-00000000000b'

const person = (id: string, name: string, color: Profile['color'], partner_id: string): Profile => ({
  id, name, color, partner_id, timezone: 'Europe/Madrid', welcomed_at: null,
  candle_lit_at: null, candle_reading_id: null, updated_at: new Date(0).toISOString(),
})

function fresh(): Db {
  return {
    ...emptyDb(),
    profiles: { [LAURA]: person(LAURA, 'Laura', 'miel', JAVIER), [JAVIER]: person(JAVIER, 'Javier', 'salvia', LAURA) },
  }
}

function read(): Db {
  try {
    const stored = localStorage.getItem(SERVER)
    if (stored) return JSON.parse(stored) as Db
  } catch {
    // A broken rehearsal starts over.
  }
  return fresh()
}
const write = (db: Db) => localStorage.setItem(SERVER, JSON.stringify(db))

let last = 0
/** Server time: always moves forward, like `updated_at` stamped by Postgres. */
function stamp(): string {
  last = Math.max(Date.now(), last + 1)
  return new Date(last).toISOString()
}

const mark = (db: Db, user: string, book: string): Reading | undefined =>
  Object.values(db.readings)
    .filter((r) => r.user_id === user && r.book_id === book && !r.deleted_at)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]

function fold(db: Db, slip: Slip, viewer: string): Slip {
  const wroteLetter = Object.values(db.slips).some(
    (s) => s.user_id === viewer && s.book_id === slip.book_id && s.kind === 'carta' && !s.deleted_at,
  )
  const locked = isLocked(slip, viewer, mark(db, viewer, slip.book_id), mark(db, slip.user_id, slip.book_id), wroteLetter)
  return { ...slip, locked, body: locked ? null : slip.body }
}

export function create(): Remote {
  const listeners = new Set<(userId: string | null) => void>()
  const who = () => sessionStorage.getItem(WHO)
  const wire = 'BroadcastChannel' in globalThis ? new BroadcastChannel('gb.ensayo') : null

  return {
    ensayo: true,

    async userId() {
      return who()
    },
    onAuth(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    /** Any password works; the «email» only has to say which of the two you are. */
    async signIn(email) {
      const id = /javier/i.test(email) ? JAVIER : LAURA
      if (/historia/i.test(email)) write(story(fresh(), LAURA, JAVIER))
      sessionStorage.setItem(WHO, id)
      listeners.forEach((listener) => listener(id))
    },
    async signOut() {
      sessionStorage.removeItem(WHO)
      listeners.forEach((listener) => listener(null))
    },

    async pull(cursors) {
      const me = who()
      if (!me) throw new RemoteError('Sin sesión', false)
      const db = read()
      const since = <T extends { updated_at: string }>(rows: Record<string, T>, cursor?: string) =>
        Object.values(rows).filter((row) => !cursor || row.updated_at >= cursor)
      return {
        profiles: Object.values(db.profiles),
        books: since(db.books, cursors.books),
        readings: since(db.readings, cursors.readings),
        sessions: since(db.sessions, cursors.sessions),
        slips: Object.values(db.slips).filter((s) => !s.deleted_at).map((s) => fold(db, s, me)),
      }
    },

    async push<T extends Table>(table: T, row: Row<T>) {
      const me = who()
      const db = read()
      const rows = db[table] as Record<string, Row<T>>
      const before = rows[row.id] as (Row<T> & Partial<Slip>) | undefined
      const owner = (row as { user_id?: string }).user_id ?? (table === 'profiles' ? row.id : me)
      if (owner !== me && table !== 'books') throw new RemoteError('Eso no es tuyo', true)
      const next = { ...row, updated_at: stamp() } as Row<T> & Partial<Slip & Profile>
      delete next.locked
      if (table === 'slips') {
        next.seen_at = before?.seen_at ?? null
        next.loved = before?.loved ?? false
      }
      if (table === 'profiles') next.partner_id = (before as Profile | undefined)?.partner_id ?? null
      rows[row.id] = next
      write(db)
    },

    async openSlip(id, loved) {
      const me = who()
      const db = read()
      const slip = db.slips[id]
      if (!slip || !me || slip.user_id === me || fold(db, slip, me).locked) {
        throw new RemoteError('Todavía está doblado', true)
      }
      db.slips[id] = { ...slip, seen_at: slip.seen_at ?? stamp(), loved: loved ?? slip.loved, updated_at: stamp() }
      write(db)
    },

    async notify(what, ref) {
      console.info(`[ensayo] aviso a la pareja: ${what} (${ref})`)
    },

    channel(me, partner, on) {
      const topic = [me, partner].sort().join(':')
      const hear = (event: MessageEvent<{ topic: string; signal: Signal }>) => {
        // localStorage reaches other tabs a moment after it is written; a real server has no such lag.
        if (event.data.topic === topic) setTimeout(() => on(event.data.signal), 250)
      }
      wire?.addEventListener('message', hear)
      return {
        send: (signal) => wire?.postMessage({ topic, signal }),
        close: () => wire?.removeEventListener('message', hear),
      }
    },

    async claimPush() {},
    async dropPush() {},
    async hasPush() {
      return false
    },
  }
}
