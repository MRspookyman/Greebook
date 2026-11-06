import { describe, expect, it } from 'vitest'
import { monthMemories } from './memories'
import type { Invite, Message, Reaction, ReadingWithBook, Session } from '@/lib/types'

const session = (user_id: string, read_on: string) => ({ user_id, read_on }) as Session
const reading = (book_id: string, finished_on: string) =>
  ({
    book_id,
    finished_on,
    status: 'finished',
    book: { id: book_id, title: book_id },
  }) as ReadingWithBook
const invite = (status: string, day: number) =>
  ({
    status,
    starts_at: new Date(2026, 10, day, 20).toISOString(),
    created_at: new Date(2026, 9, 30).toISOString(),
  }) as Invite
const message = (id: string, locked = false) =>
  ({
    id,
    locked,
    body: locked ? null : 'Una frase',
    created_at: new Date(2026, 10, 4, 12).toISOString(),
  }) as Message

describe('monthMemories', () => {
  it('counts shared calendar days once, deduplicates finished books and includes accepted ratitos only', () => {
    const result = monthMemories(
      '2026-11',
      [reading('book', '2026-11-01'), reading('book', '2026-11-02'), reading('old', '2026-10-31')],
      [
        session('me', '2026-11-01'),
        session('me', '2026-11-01'),
        session('you', '2026-11-01'),
        session('me', '2026-11-02'),
        session('you', '2026-10-31'),
      ],
      [invite('accepted', 1), invite('pending', 2), invite('declined', 3)],
      [],
      [],
      'me',
      'you',
    )
    expect(result.daysTogether).toBe(1)
    expect(result.books.map((book) => book.id)).toEqual(['book'])
    expect(result.ratitos).toBe(1)
  })

  it('never includes locked content or messages without a heart', () => {
    const messages = [message('loved'), message('locked', true), message('plain')]
    const reactions = [{ target_id: 'loved' }, { target_id: 'locked' }] as Reaction[]
    expect(monthMemories('2026-11', [], [], [], messages, reactions, 'me', 'you').quotes.map((m) => m.id)).toEqual([
      'loved',
    ])
    expect(monthMemories('2026-12', [], [], [], messages, reactions, 'me', 'you').quotes).toEqual([])
  })
})
