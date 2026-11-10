import type { Book } from './types'

/** FNV-1a: a stable number from a string, so a book always gets the same spine. */
export function hash(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Cloth bindings: background and the colour of the stamped title. */
export const CLOTHS = [
  { bg: '#2f4a3a', ink: '#e9dfc3' },
  { bg: '#7a2e2e', ink: '#f0e2c8' },
  { bg: '#1f3550', ink: '#e6dcc0' },
  { bg: '#b9893c', ink: '#2a2212' },
  { bg: '#a5553a', ink: '#f5e8d2' },
  { bg: '#e3d6b8', ink: '#3a2f22' },
  { bg: '#3a3438', ink: '#e2d6bd' },
  { bg: '#2c6566', ink: '#efe6cf' },
  { bg: '#5b3a5a', ink: '#eedfcf' },
  { bg: '#8c9a6b', ink: '#23291a' },
  { bg: '#c7ad82', ink: '#3b2c1c' },
  { bg: '#4a5d7a', ink: '#efe6d2' },
] as const

export interface Spine {
  /** px; thicker books are wider. */
  width: number
  /** px. */
  height: number
  cloth: (typeof CLOTHS)[number]
  /** Which stamped decoration it carries. */
  band: 0 | 1 | 2
}

/** The spine of a book: its cloth and size depend only on the book, never on when it is drawn. */
export function spineOf(book: Pick<Book, 'id' | 'pages'>): Spine {
  const h = hash(book.id)
  const pages = book.pages ?? 280
  return {
    width: Math.round(Math.min(52, Math.max(26, 18 + pages / 16))),
    height: 132 + ((h >>> 8) % 4) * 9,
    cloth: CLOTHS[h % CLOTHS.length],
    band: ((h >>> 16) % 3) as 0 | 1 | 2,
  }
}

/** Fills planks left to right: a new plank starts when the next spine doesn't fit. */
export function shelfRows<T extends { width: number }>(items: T[], plank: number, gap = 3): T[][] {
  const rows: T[][] = []
  let row: T[] = []
  let used = 0
  for (const item of items) {
    const need = item.width + (row.length ? gap : 0)
    if (row.length && used + need > plank) {
      rows.push(row)
      row = []
      used = 0
    }
    used += item.width + (row.length ? gap : 0)
    row.push(item)
  }
  if (row.length) rows.push(row)
  return rows
}
