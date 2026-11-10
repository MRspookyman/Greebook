import { describe, expect, it } from 'vitest'
import { fromGoogle, fromOpenLibrary } from './search'

describe('buscar libros', () => {
  it('lee un resultado de Google Books y pide la portada por https', () => {
    const [book] = fromGoogle({
      items: [{
        id: 'abc',
        volumeInfo: {
          title: ' Patria ', authors: ['Fernando Aramburu'], pageCount: 648, publishedDate: '2016-09-06',
          industryIdentifiers: [{ type: 'ISBN_10', identifier: '8490663196' }, { type: 'ISBN_13', identifier: '9788490663196' }],
          imageLinks: { thumbnail: 'http://books.google.com/x?id=abc&edge=curl&zoom=1' },
        },
      }],
    })
    expect(book).toEqual({
      key: 'g:abc', title: 'Patria', author: 'Fernando Aramburu', pages: 648, year: 2016,
      isbn: '9788490663196', cover_url: 'https://books.google.com/x?id=abc&zoom=1',
    })
  })

  it('descarta resultados sin título y tolera los incompletos', () => {
    const books = fromGoogle({ items: [{ volumeInfo: { title: '' } }, { volumeInfo: { title: 'Nada', pageCount: 0 } }, {}] })
    expect(books).toHaveLength(1)
    expect(books[0]).toMatchObject({ title: 'Nada', author: '', pages: null, year: null, isbn: null, cover_url: null })
  })

  it('lee un resultado de Open Library', () => {
    const [book] = fromOpenLibrary({
      docs: [{ key: '/works/OL1W', title: 'Rayuela', author_name: ['Julio Cortázar'], number_of_pages_median: 600,
        first_publish_year: 1963, cover_i: 42, isbn: ['8437604575', '9788437604572'] }],
    })
    expect(book).toEqual({
      key: 'o:/works/OL1W', title: 'Rayuela', author: 'Julio Cortázar', pages: 600, year: 1963,
      isbn: '9788437604572', cover_url: 'https://covers.openlibrary.org/b/id/42-M.jpg',
    })
  })

  it('una respuesta vacía no es un error', () => {
    expect(fromGoogle({})).toEqual([])
    expect(fromOpenLibrary({})).toEqual([])
  })
})
