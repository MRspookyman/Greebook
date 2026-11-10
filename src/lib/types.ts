/** Wax colours: each person is one. Their candle, their bookmarks, their slips. */
export const COLORS = ['salvia', 'miel', 'ciruela', 'cielo', 'coral', 'lavanda'] as const
export type Color = (typeof COLORS)[number]

export interface Profile {
  id: string
  name: string
  color: Color
  partner_id: string | null
  timezone: string
  welcomed_at: string | null
  /** The candle: lit since when, and with which reading. This is the presence. */
  candle_lit_at: string | null
  candle_reading_id: string | null
  updated_at: string
}

export interface Book {
  id: string
  title: string
  author: string
  cover_url: string | null
  pages: number | null
  year: number | null
  isbn: string | null
  added_by: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type Unit = 'paginas' | 'porcentaje'
export type Status = 'pendiente' | 'leyendo' | 'terminado' | 'dejado'

/** One person's bookmark in a book. Both having one in the same book is «reading it together». */
export interface Reading {
  id: string
  user_id: string
  book_id: string
  unit: Unit
  total: number
  position: number
  status: Status
  started_on: string | null
  finished_on: string | null
  rating: number | null
  /** Marked as «el siguiente» of my pile, and since when. Only means something while it is pending. */
  next_at?: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/** A «velada»: from lighting the candle to blowing it out. */
export interface Session {
  id: string
  reading_id: string
  user_id: string
  /** The night it belongs to ('yyyy-mm-dd'); the day turns at 4 a.m. */
  day: string
  started_at: string | null
  minutes: number | null
  from_pos: number
  to_pos: number
  place: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type SlipKind = 'cita' | 'nota' | 'prediccion' | 'carta'

/**
 * A note between the pages of a book: the only thing written inside one, and always open to both. New ones
 * are all «nota»; the other kinds are from before and are shown the same way.
 */
export interface Slip {
  id: string
  user_id: string
  book_id: string
  kind: SlipKind
  page: number | null
  /** Where in the book it sits, 0–1. null = spoils nothing. */
  at: number | null
  /** null while folded: the server does not send the text. */
  body: string | null
  seen_at: string | null
  loved: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
  /** Set by the server for the partner's slips. */
  locked?: boolean
}

export interface Db {
  profiles: Record<string, Profile>
  books: Record<string, Book>
  readings: Record<string, Reading>
  sessions: Record<string, Session>
  slips: Record<string, Slip>
}
export type Table = keyof Db
export type Row<T extends Table = Table> = Db[T][string]

export const emptyDb = (): Db => ({ profiles: {}, books: {}, readings: {}, sessions: {}, slips: {} })
