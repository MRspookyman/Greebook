/**
 * The «valoración» that goes in a book's envelope: stars and a few words.
 * Both travel inside the slip's text («★4» on the first line), so the server folds the stars together
 * with the words: neither of you sees the other's score before writing your own.
 */
export interface Verdict {
  rating: number | null
  text: string
}

export function formatVerdict(rating: number | null, text: string): string {
  const words = text.trim()
  const stars = rating && rating >= 1 && rating <= 5 ? `★${Math.round(rating)}` : ''
  return [stars, words].filter(Boolean).join('\n')
}

export function parseVerdict(body: string | null | undefined): Verdict {
  const match = /^★([1-5])(?:\n|$)/.exec(body ?? '')
  return match ? { rating: Number(match[1]), text: body!.slice(match[0].length) } : { rating: null, text: body ?? '' }
}
