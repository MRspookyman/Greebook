import { describe, expect, it } from 'vitest'
import { exportSheets } from './export'
import { emptyDb, type Db } from './types'
import { cellRef, crc32, excelDay, workbookFiles, xlsx, zip } from './xlsx'

describe('el Excel', () => {
  it('nombra las celdas como Excel', () => {
    expect(cellRef(0, 0)).toBe('A1')
    expect(cellRef(25, 9)).toBe('Z10')
    expect(cellRef(26, 0)).toBe('AA1')
    expect(cellRef(701, 0)).toBe('ZZ1')
  })

  it('cuenta los días desde donde los cuenta Excel', () => {
    expect(excelDay('1900-03-01')).toBe(61)
    expect(excelDay('2026-11-11')).toBe(46337)
    expect(excelDay('2026-11-11T22:10:00Z')).toBe(46337)
    expect(excelDay('')).toBeNull()
  })

  it('escribe texto, números y fechas, y no deja pasar lo que rompe el XML', () => {
    const files = workbookFiles([{ name: 'Li/bros', header: ['Título'], rows: [['Tom & <Jerry>\u0001', 7, { day: '2026-11-11' }, null]] }])
    const sheet = files['xl/worksheets/sheet1.xml']
    expect(sheet).toContain('<c r="A1" s="1" t="inlineStr"><is><t xml:space="preserve">Título</t></is></c>')
    expect(sheet).toContain('Tom &amp; &lt;Jerry&gt;</t>')
    expect(sheet).toContain('<c r="B2" s="3"><v>7</v></c>')
    expect(sheet).toContain('<c r="C2" s="2"><v>46337</v></c>')
    expect(sheet).not.toContain('D2')
    expect(files['xl/workbook.xml']).toContain('name="Li bros"')
  })

  it('el zip lleva cada archivo con su suma y un índice al final', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
    const bytes = zip({ 'a.txt': 'hola', 'b/c.txt': 'adiós' })
    const view = new DataView(bytes.buffer)
    expect(view.getUint32(0, true)).toBe(0x04034b50)
    expect(view.getUint32(bytes.length - 22, true)).toBe(0x06054b50)
    expect(view.getUint16(bytes.length - 12, true)).toBe(2)
  })

  it('la copia lleva libros, veladas y notas; una nota aún oculta va sin su texto', () => {
    const stamp = '2026-11-01T10:00:00Z'
    const db: Db = {
      ...emptyDb(),
      profiles: {
        me: { id: 'me', name: 'Laura', color: 'miel', partner_id: 'you', timezone: '', welcomed_at: null, candle_lit_at: null, candle_reading_id: null, updated_at: stamp },
        you: { id: 'you', name: 'Javier', color: 'salvia', partner_id: 'me', timezone: '', welcomed_at: null, candle_lit_at: null, candle_reading_id: null, updated_at: stamp },
      },
      books: { b: { id: 'b', title: 'Rayuela', author: 'Julio Cortázar', cover_url: null, pages: 600, year: 1963, isbn: null, added_by: 'you', created_at: stamp, updated_at: stamp, deleted_at: null } },
      readings: {
        r: { id: 'r', user_id: 'me', book_id: 'b', unit: 'paginas', total: 600, position: 142, status: 'leyendo', started_on: '2026-11-01', finished_on: null, rating: null, created_at: stamp, updated_at: stamp, deleted_at: null },
      },
      sessions: {
        s: { id: 's', reading_id: 'r', user_id: 'me', day: '2026-11-02', started_at: stamp, minutes: 34, from_pos: 100, to_pos: 142, place: 'en el tren', created_at: stamp, updated_at: stamp, deleted_at: null },
      },
      slips: {
        n: { id: 'n', user_id: 'you', book_id: 'b', kind: 'nota', page: 150, at: 0.25, body: null, seen_at: null, loved: false, hidden: true, locked: true, created_at: stamp, updated_at: stamp, deleted_at: null },
      },
    }
    const [books, evenings, notes] = exportSheets(db, 'me')
    expect(books.header).toContain('Javier: estado')
    expect(books.rows[0].slice(0, 8)).toEqual(['Rayuela', 'Julio Cortázar', 600, 1963, null, 'Javier', 'Leyendo', 'p. 142 de 600'])
    expect(evenings.rows[0]).toEqual([{ day: '2026-11-02' }, 'Tú', 'Rayuela', 100, 142, '42 páginas', 34, 'en el tren'])
    expect(notes.rows[0].slice(0, 5)).toEqual(['Rayuela', 'Javier', 'p. 150', '(oculta hasta que llegues a su página)', 'Oculta hasta llegar'])
    expect(xlsx([books, evenings, notes]).length).toBeGreaterThan(1000)
  })
})
