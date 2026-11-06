import { useSyncExternalStore } from 'react'
import { useMe } from '@/features/auth/me'
import { useReadings, useSharedNotes } from '@/lib/data'
import type { Book, Note, ReadingWithBook } from '@/lib/types'

export interface JointBook {
  book: Book
  mine: ReadingWithBook
  theirs: ReadingWithBook
}

const OPEN = new Set(['want', 'reading'])
const byRecent = (a: ReadingWithBook, b: ReadingWithBook) => b.updated_at.localeCompare(a.updated_at)

/** Books we both have open (pending or reading): each one has a club de dos. Reading ones first. */
export function useJointBooks(): JointBook[] {
  const { userId, partner } = useMe()
  const mine = useReadings(userId)
  const theirs = useReadings(partner?.id)
  if (!partner) return []
  const partnerOpen = (theirs.data ?? []).filter((r) => OPEN.has(r.status)).sort(byRecent)
  const seen = new Set<string>()
  const joint: JointBook[] = []
  for (const reading of [...(mine.data ?? [])].filter((r) => OPEN.has(r.status)).sort(byRecent)) {
    if (seen.has(reading.book_id)) continue
    const other = partnerOpen.find((r) => r.book_id === reading.book_id)
    if (!other) continue
    seen.add(reading.book_id)
    joint.push({ book: reading.book, mine: reading, theirs: other })
  }
  return joint.sort((a, b) => Number(b.mine.status === 'reading') - Number(a.mine.status === 'reading'))
}

/** Shared notes and messages of one book, from both of us (any of our readings of it). */
export function clubNotes(
  notes: Note[],
  bookId: string,
  readings: Pick<ReadingWithBook, 'id' | 'book_id'>[],
): Note[] {
  const ids = new Set(readings.filter((r) => r.book_id === bookId).map((r) => r.id))
  return notes.filter((note) => ids.has(note.reading_id))
}

// ── «Visto» del club, por dispositivo ──
const KEY = (bookId: string) => `gb.club.seen.${bookId}`
const listeners = new Set<() => void>()

export function markClubSeen(bookId: string) {
  try {
    localStorage.setItem(KEY(bookId), new Date().toISOString())
  } catch {
    /* Without storage every message stays «new»; harmless. */
  }
  listeners.forEach((listener) => listener())
}

function seenAt(bookId: string): string {
  try {
    return localStorage.getItem(KEY(bookId)) ?? ''
  } catch {
    return ''
  }
}

/** Partner messages in this book's club that arrived after I last opened it. */
export function useClubUnread(bookId: string): { count: number; latest: Note | null } {
  const { userId, partner } = useMe()
  const notes = useSharedNotes(!!partner)
  const mine = useReadings(userId)
  const theirs = useReadings(partner?.id)
  const seen = useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => seenAt(bookId),
  )
  const all = clubNotes(notes.data ?? [], bookId, [...(mine.data ?? []), ...(theirs.data ?? [])])
  const fromPartner = all.filter((note) => note.user_id === partner?.id)
  return {
    count: fromPartner.filter((note) => note.created_at > seen).length,
    latest: fromPartner.at(-1) ?? null,
  }
}
