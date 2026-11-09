/** Normalize both a Citas search query and its visible text, ignoring accents, case and spacing. */
export function normalizeQuoteSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('es')
    .replace(/\s+/g, ' ')
    .trim()
}
