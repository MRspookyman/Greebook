export type Accent = 'blue' | 'green'
export type ThemePref = 'system' | 'light' | 'dark'
export type Format = 'paper' | 'audio'
export type Unit = 'pages' | 'minutes'
export type ReadingStatus = 'want' | 'reading' | 'finished' | 'abandoned'
export type NoteKind = 'note' | 'quote' | 'message'
export const REACTION_EMOJIS = ['❤️', '🔥', '📚', '😂', '😮', '👏'] as const
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number]
export type ReactionTarget = 'session' | 'reading' | 'note'

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
  /** Reading whose timer is running right now (presence). */
  reading_now_id: string | null
  reading_now_since: string | null
  /** Last time the Nosotros tab was opened (unread badge). */
  last_seen_us_at: string | null
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
}

export interface Note {
  id: string
  reading_id: string
  user_id: string
  kind: NoteKind
  body: string
  page: number | null
  shared: boolean
  /** Club de dos: the note this one answers. */
  reply_to: string | null
  created_at: string
}

export interface Reaction {
  id: string
  user_id: string
  target_type: ReactionTarget
  target_id: string
  emoji: ReactionEmoji
  created_at: string
}

export type RecommendationStatus = 'pending' | 'accepted' | 'dismissed'

export interface Recommendation {
  id: string
  book_id: string
  from_user: string
  to_user: string
  message: string | null
  /** «Leámoslo juntos»: both start on `start_on` and a club opens. */
  together: boolean
  start_on: string | null
  status: RecommendationStatus
  created_at: string
}

/** Recommendation joined with its book (`select('*, book:books(*)')`). */
export interface RecommendationWithBook extends Recommendation {
  book: Book
}

export interface Nudge {
  id: string
  from_user: string
  to_user: string
  message: string
  sent_on: string
  created_at: string
}

/** Shared monthly page goal; `user_a < user_b`. */
export interface Challenge {
  user_a: string
  user_b: string
  month: string // 'yyyy-MM'
  pages_goal: number
  created_by: string
  updated_at: string
}
