import { describe, expect, it } from 'vitest'
import { excerpt, quoteNotification } from '../../supabase/functions/_shared/notifications'

const quote = {
  name: 'Laura', book: 'Patria', kind: 'cita', count: 1, locked: false,
  page: 42, body: 'Un detalle de la historia', actorId: 'laura', bookId: 'patria',
}

describe('quote notifications', () => {
  it('puts the actor and action in the title, details in the body', () => {
    expect(quoteNotification(quote)).toEqual({
      title: '✍️ Laura te ha dejado una cita',
      body: '«Patria»: «Un detalle de la historia»',
      tag: 'quotes:laura:patria', renotify: false,
    })
  })
  it('describes a photo-only quote without exposing its storage path', () => {
    const result = quoteNotification({ ...quote, body: null, photoPath: 'owner/quote.jpg' })
    expect(result.title).toBe('✍️ Laura te ha dejado una foto de «Patria»')
    expect(result.body).not.toContain('owner/quote.jpg')
  })
  it('keeps a locked photo-only quote spoiler-safe', () => {
    const result = quoteNotification({ ...quote, body: null, photoPath: 'owner/quote.jpg', locked: true })
    expect(result.body).toBe('«Patria» · p. 42. Se abre cuando llegues.')
    expect(result.body).not.toContain('owner/quote.jpg')
  })
  it('never exposes a locked quote', () => {
    const result = quoteNotification({ ...quote, locked: true })
    expect(result.body).toBe('«Patria» · p. 42. Se abre cuando llegues.')
    expect(result.body).not.toContain(quote.body)
  })
  it('counts a burst without exposing any quote, even when the latest is unlocked', () => {
    const result = quoteNotification({ ...quote, count: 3 })
    expect(result.title).toBe('✍️ Laura ha guardado citas')
    expect(result.body).toBe('Ha guardado 3 citas de «Patria»')
    expect(result.tag).toBe(quoteNotification({ ...quote, locked: true }).tag)
    expect(result.renotify).toBe(false)
  })
  it('separates actors and books and labels shared notes', () => {
    expect(quoteNotification({ ...quote, actorId: 'other' }).tag).not.toBe(quoteNotification(quote).tag)
    expect(quoteNotification({ ...quote, bookId: 'other' }).tag).not.toBe(quoteNotification(quote).tag)
    expect(quoteNotification({ ...quote, kind: 'nota' }).title).toBe('✍️ Laura te ha dejado una nota')
  })
  it('keeps excerpts short', () => {
    expect(excerpt('a'.repeat(81))).toBe(`${'a'.repeat(79)}…`)
    expect(excerpt('  hola  ')).toBe('hola')
  })
})
