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

  it('la copia va por años: cada libro terminado con sus estrellas, sus fechas y lo que me pareció', () => {
    const stamp = '2026-11-01T10:00:00Z'
    const book = (id: string, title: string, year: number | null) => ({ id, title, author: 'Alguien', cover_url: null, pages: 300, year, isbn: null, added_by: 'me', created_at: stamp, updated_at: stamp, deleted_at: null })
    const reading = (id: string, user_id: string, book_id: string, extra: object) => ({
      id, user_id, book_id, unit: 'paginas' as const, total: 300, position: 300, status: 'terminado' as const, started_on: null, finished_on: null, rating: null,
      created_at: stamp, updated_at: stamp, deleted_at: null, ...extra,
    })
    const note = (id: string, user_id: string, book_id: string, at: number | null, body: string) => ({
      id, user_id, book_id, kind: 'nota' as const, page: null, at, body, seen_at: null, loved: false, created_at: stamp + id, updated_at: stamp, deleted_at: null,
    })
    const db: Db = {
      ...emptyDb(),
      books: { a: book('a', 'Rayuela', 1963), b: book('b', 'Nada', 1945), c: book('c', 'Patria', 2016), d: book('d', 'Solo suyo', null) },
      readings: {
        1: reading('1', 'me', 'a', { started_on: '2026-10-01', finished_on: '2026-11-02', rating: 5 }),
        2: reading('2', 'me', 'b', { finished_on: '2025-03-09', rating: 3 }),
        3: reading('3', 'me', 'c', { status: 'leyendo', position: 120, started_on: '2026-11-05' }),
        4: reading('4', 'you', 'd', { finished_on: '2026-01-01', rating: 4 }),
        5: reading('5', 'you', 'a', { finished_on: '2026-02-01', rating: 1 }),
      },
      slips: {
        n1: note('n1', 'me', 'a', null, 'Un libro raro y precioso.'),
        n2: note('n2', 'me', 'a', 0.5, 'Esto es de una página, no un resumen.'),
        n3: note('n3', 'you', 'a', null, 'Lo que escribió el otro.'),
      },
    }
    const sheets = exportSheets(db, 'me')
    expect(sheets.map((s) => s.name)).toEqual(['2026', '2025', 'Sin terminar'])
    expect(sheets[0].header).toEqual(['Título', 'Autor', 'Año del libro', 'Estrellas', 'Empezado', 'Terminado', 'Lo que me pareció'])
    expect(sheets[0].rows).toEqual([['Rayuela', 'Alguien', 1963, 5, { day: '2026-10-01' }, { day: '2026-11-02' }, 'Un libro raro y precioso.']])
    expect(sheets[1].rows).toEqual([['Nada', 'Alguien', 1945, 3, null, { day: '2025-03-09' }, '']])
    expect(sheets[2].rows).toEqual([['Patria', 'Alguien', 2016, 'Leyendo', { day: '2026-11-05' }, 'p. 120 de 300', '']])
    expect(xlsx(sheets).length).toBeGreaterThan(1000)
  })
})
