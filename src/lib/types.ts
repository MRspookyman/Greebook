export type Accent = 'blue' | 'green'
export type ThemePref = 'system' | 'light' | 'dark'
export type Format = 'paper' | 'ebook'
export type Unit = 'pages' | 'percent'
export type FinishedPrecision = 'year' | 'month' | 'day'
export type ReadingStatus = 'want' | 'reading' | 'finished' | 'abandoned'
export type NoteKind = 'note' | 'quote'

export interface Profile {
  id: string
  display_name: string
  accent: Accent
  partner_id: string | null
  is_gift_recipient: boolean
  yearly_goal: number
  timezone: string
  reminder_time: string // 'HH:MM:SS'
  notify_reminder: boolean
  notify_partner: boolean
  last_reminded_on: string | null
  theme: ThemePref
  onboarded_at: string | null
  /** Reading whose timer is running right now (soft presence on Hoy; no push). */
  reading_now_id: string | null
  reading_now_since: string | null
}

export interface Book {
  id: string
  google_id: string | null
  isbn13: string | null
  openlibrary_key: string | null
  title: string
  authors: string[]
  cover_url: string | null
  page_count: number | null
  published_year: number | null
  description: string | null
  created_by: string
  created_at: string
}

/** Book data from a search provider or the manual form, not yet stored. */
export type BookCandidate = Omit<Book, 'id' | 'created_by' | 'created_at'>

export interface Reading {
  id: string
  user_id: string
  book_id: string
  format: Format
  unit: Unit
  total_units: number
  current_position: number
  status: ReadingStatus
  started_on: string | null // 'yyyy-MM-dd'
  finished_on: string | null
  finished_precision: FinishedPrecision | null
  backfilled: boolean
  rating: number | null
  moods: string[]
  created_at: string
  updated_at: string
}

/** Reading joined with its book (`select('*, book:books(*)')`). */
export interface ReadingWithBook extends Reading {
  book: Book
}

export interface Session {
  id: string
  reading_id: string
  user_id: string
  read_on: string // 'yyyy-MM-dd' local date
  start_pos: number
  end_pos: number
  minutes: number | null
  created_at: string
  /** Set when this session was read at the same time as the partner's (`read_together`). */
  together_id?: string | null
}

/** Private diary note/quote of one reading (only its author sees it). */
export interface Note {
  id: string
  reading_id: string
  user_id: string
  kind: NoteKind
  body: string
  page: number | null
  created_at: string
}

export type MessageKind = 'trace' | 'room' | 'reply'
export type Emotion = 'love' | 'twist' | 'laugh' | 'moved' | 'thinking'

/**
 * Couple message as read from the `messages_visible` view. `trace` = huella («Dejarle algo»),
 * `room` = message in a book's sala, `reply` = answer to another message.
 * When `locked` (the recipient hasn't reached `page` yet) `body` and `emotion` are null.
 */
export interface Message {
  id: string
  from_user: string
  to_user: string
  kind: MessageKind
  book_id: string | null
  page: number | null
  reply_to: string | null
  read_at: string | null
  opened_early: boolean
  created_at: string
  locked: boolean
  emotion: Emotion | null
  body: string | null
}

/** ❤️ on a partner's quote (or a legacy message). */
export interface Reaction {
  id: string
  user_id: string
  target_type: 'message' | 'quote'
  target_id: string
  emoji: '❤️'
  created_at: string
}

export type InviteStatus = 'pending' | 'accepted' | 'declined'

/** Invitation to a «ratito» of reading together. `starts_at` null = now. */
export interface Invite {
  id: string
  from_user: string
  to_user: string
  starts_at: string | null
  status: InviteStatus
  responded_at: string | null
  created_at: string
}

/** «Queremos leer juntos» list item. */
export interface TogetherItem {
  id: string
  book_id: string
  added_by: string
  partner_id: string
  reason: string | null
  partner_answer: 'yes' | 'later' | null
  start_on: string | null
  created_at: string
}

export interface TogetherItemWithBook extends TogetherItem {
  book: Book
}

/** Cooperative goal of the month; `user_a < user_b`. */
export interface CoupleGoal {
  user_a: string
  user_b: string
  month: string // 'yyyy-MM'
  kind: 'ratitos' | 'days'
  target: number
  proposed_by: string
  accepted_at: string | null
  created_at: string
}

export type QuoteKind = 'cita' | 'nota'

/**
 * Something kept on a page, read from `quotes_visible`: a sentence from the book (`cita`) or your own words
 * (`nota`). Shared with the partner by default; when `locked` (they haven't reached `page` in that book yet)
 * `body` and `comment` come as null.
 */
export interface Quote {
  id: string
  user_id: string
  book_id: string
  /** Physical book page, never the reading's Kindle percentage. */
  page: number | null
  kind: QuoteKind
  shared: boolean
  safe: boolean
  opened_early: boolean
  seen_at: string | null
  created_at: string
  locked: boolean
  body: string | null
  comment: string | null
  book: Book
}

export interface QuoteReply {
  id: string
  quote_id: string
  user_id: string
  body: string
  seen_at: string | null
  created_at: string
}

/** A «lectura a la vez»: user_a was reading, user_b joined; closed when both have saved their part. */
export interface ReadTogether {
  id: string
  user_a: string
  user_b: string
  started_at: string
  ended_at: string | null
  note: string | null
}
