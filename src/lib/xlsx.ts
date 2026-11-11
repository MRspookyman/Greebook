/**
 * The smallest Excel writer that does the job: a workbook of plain sheets with a bold first row, text,
 * numbers and dates. An .xlsx is a zip of XML files; they are stored without compression, so there is
 * nothing here but string building and a checksum, and no library to carry.
 */

/** A cell: text, a number, a day ('yyyy-mm-dd', written as a real Excel date) or nothing. */
export type Cell = string | number | { day: string } | null | undefined

export interface Sheet {
  /** Tab name: up to 31 characters, without \ / ? * [ ] : */
  name: string
  header: string[]
  rows: Cell[][]
  /** Column widths, in characters. */
  widths?: number[]
}

// Characters XML 1.0 does not allow: Excel refuses the whole file if one slips in.
// eslint-disable-next-line no-control-regex
const ILLEGAL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g
const escape = (text: string) =>
  text.replace(ILLEGAL, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** A1, B1 … Z1, AA1. */
export function cellRef(column: number, row: number): string {
  let letters = ''
  for (let n = column + 1; n > 0; n = Math.floor((n - 1) / 26)) letters = String.fromCharCode(65 + ((n - 1) % 26)) + letters
  return `${letters}${row + 1}`
}

/** Excel counts days from 30 December 1899. */
export function excelDay(day: string): number | null {
  const [y, m, d] = day.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86_400_000)
}

function cellXml(cell: Cell, column: number, row: number, style: number): string {
  const at = `r="${cellRef(column, row)}"`
  if (cell == null || cell === '') return ''
  if (typeof cell === 'number') return Number.isFinite(cell) ? `<c ${at} s="${style}"><v>${cell}</v></c>` : ''
  if (typeof cell === 'object') {
    const serial = excelDay(cell.day)
    return serial == null ? '' : `<c ${at} s="2"><v>${serial}</v></c>`
  }
  // Excel keeps at most 32 767 characters in a cell.
  return `<c ${at} s="${style}" t="inlineStr"><is><t xml:space="preserve">${escape(cell.slice(0, 32_767))}</t></is></c>`
}

function sheetXml(sheet: Sheet): string {
  const row = (cells: Cell[], r: number, style: number) => `<row r="${r + 1}">${cells.map((c, i) => cellXml(c, i, r, style)).join('')}</row>`
  const cols = sheet.widths?.length
    ? `<cols>${sheet.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
    : ''
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    cols +
    `<sheetData>${row(sheet.header, 0, 1)}${sheet.rows.map((cells, i) => row(cells, i + 1, 3)).join('')}</sheetData>` +
    '</worksheet>'
  )
}

const tabName = (name: string) => escape(name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31))

/** The files inside the workbook, by path. */
export function workbookFiles(sheets: Sheet[]): Record<string, string> {
  const head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  const files: Record<string, string> = {
    '[Content_Types].xml':
      `${head}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') +
      '</Types>',
    '_rels/.rels':
      `${head}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>',
    'xl/workbook.xml':
      `${head}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
      `<sheets>${sheets.map((sheet, i) => `<sheet name="${tabName(sheet.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>` +
      '</workbook>',
    'xl/_rels/workbook.xml.rels':
      `${head}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
      `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
      '</Relationships>',
    // Styles: 0 plain, 1 bold header, 2 date, 3 text that wraps and sits at the top of its row.
    'xl/styles.xml':
      `${head}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
      '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
      '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
      '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="4">' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
      '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
      '<xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="top"/></xf>' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
      '</cellXfs>' +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
      '</styleSheet>',
  }
  sheets.forEach((sheet, i) => (files[`xl/worksheets/sheet${i + 1}.xml`] = sheetXml(sheet)))
  return files
}

let table: Uint32Array | undefined
/** CRC-32, as zip wants it. */
export function crc32(bytes: Uint8Array): number {
  table ??= Uint32Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
  })
  let crc = 0xffffffff
  for (const byte of bytes) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

/** A zip with every file stored as it is (no compression). */
export function zip(files: Record<string, string>): Uint8Array {
  const encoder = new TextEncoder()
  const parts: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0
  for (const [path, text] of Object.entries(files)) {
    const name = encoder.encode(path)
    const data = encoder.encode(text)
    const crc = crc32(data)
    const header = (signature: number, extra: number[]) => {
      const bytes = new Uint8Array(extra.length ? 46 : 30)
      const view = new DataView(bytes.buffer)
      let at = 0
      const u16 = (n: number) => (view.setUint16(at, n, true), (at += 2))
      const u32 = (n: number) => (view.setUint32(at, n, true), (at += 4))
      u32(signature)
      if (extra.length) u16(20) // made by
      u16(20) // needs
      u16(0x0800) // names are UTF-8
      u16(0) // stored
      u16(0) // time
      u16(0x21) // date: 1 January 1980
      u32(crc)
      u32(data.length)
      u32(data.length)
      u16(name.length)
      u16(0) // extra field
      if (extra.length) {
        u16(0) // comment
        u16(0) // disk
        u16(0) // internal attributes
        u32(0) // external attributes
        u32(extra[0]) // where its local header is
      }
      return bytes
    }
    parts.push(header(0x04034b50, []), name, data)
    central.push(header(0x02014b50, [offset]), name)
    offset += 30 + name.length + data.length
  }
  const size = central.reduce((sum, part) => sum + part.length, 0)
  const end = new Uint8Array(22)
  const view = new DataView(end.buffer)
  view.setUint32(0, 0x06054b50, true)
  view.setUint16(8, central.length / 2, true)
  view.setUint16(10, central.length / 2, true)
  view.setUint32(12, size, true)
  view.setUint32(16, offset, true)
  const all = [...parts, ...central, end]
  const out = new Uint8Array(all.reduce((sum, part) => sum + part.length, 0))
  let at = 0
  for (const part of all) {
    out.set(part, at)
    at += part.length
  }
  return out
}

/** The bytes of an .xlsx workbook with those sheets. */
export const xlsx = (sheets: Sheet[]): Uint8Array => zip(workbookFiles(sheets))
