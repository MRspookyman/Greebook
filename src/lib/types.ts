export type Accent = 'blue' | 'green'
export type ThemePref = 'system' | 'light' | 'dark'
export type Format = 'paper' | 'ebook' | 'audio'
export type Unit = 'pages' | 'percent' | 'minutes'
export type ReadingStatus = 'want' | 'reading' | 'finished' | 'abandoned'
export type NoteKind = 'note' | 'quote'
export type ReactionEmoji = '❤️' | '🔥' | '📚'
export type ReactionTarget = 'session' | 'reading'

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
