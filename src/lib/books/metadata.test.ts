import { describe, expect, it } from 'vitest'
import { validateMetadata, type MetadataDraft } from './metadata'

const draft: MetadataDraft = { title: '  Patria  ', authors: ' Fernando Aramburu, , Otra autora ', pages: '640', year: '2016', cover: ' https://example.com/cover.jpg ' }

describe('book metadata validation', () => {
  it('trims metadata and splits comma-separated authors', () => {
    const { errors, values } = validateMetadata(draft)
    expect(errors).toEqual({})
    expect(values).toEqual({ title: 'Patria', authors: ['Fernando Aramburu', 'Otra autora'], page_count: 640, published_year: 2016, cover_url: 'https://example.com/cover.jpg' })
    expect(values).not.toHaveProperty('total_units')
  })

  it('clears optional catalog fields without changing a reading', () => {
    expect(validateMetadata({ ...draft, authors: '', pages: ' ', year: '', cover: '' }).values).toEqual({
      title: 'Patria', authors: [], page_count: null, published_year: null, cover_url: null,
    })
  })

  it('requires a nonblank title', () => {
    expect(validateMetadata({ ...draft, title: '  ' }).errors.title).toBeTruthy()
  })

  it.each(['0', '-1', '1.5', '1e3', '2147483648', 'no'])('rejects invalid page count %s', (pages) => {
    expect(validateMetadata({ ...draft, pages }).errors.pages).toBeTruthy()
  })

  it.each(['0', '-20', '2016.5', '10000', 'no'])('rejects invalid publication year %s', (year) => {
    expect(validateMetadata({ ...draft, year }).errors.year).toBeTruthy()
  })

  it.each(['javascript:alert(1)', 'data:image/jpeg;base64,abc', '/relative.jpg', 'https://user:secret@example.com/a.jpg'])('rejects unsafe or relative cover URL %s', (cover) => {
    expect(validateMetadata({ ...draft, cover }).errors.cover).toBeTruthy()
  })
})
