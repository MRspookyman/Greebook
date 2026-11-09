export type SearchMode = 'all' | 'title' | 'author' | 'isbn'

export function normalizeIsbn(value: string): string {
  return value.replace(/[\s-]/g, '').toUpperCase()
}

export function isIsbn(value: string): boolean {
  return /^(?:\d{9}[\dX]|97[89]\d{10})$/.test(normalizeIsbn(value))
}
