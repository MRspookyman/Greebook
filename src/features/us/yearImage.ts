import { BOOK_FONT, drawTextBox, INK, loadShareFonts, MUTED, PAPER, SANS_FONT, sharePng, TITLE_FONT } from '@/features/quotes/shareImage'
import { formatDays, formatMinutes } from '@/lib/units'
import type { YearSummary } from './yearSummary'

const WIDTH = 1080
const HEIGHT = 1350
const ACCENT = { blue: '#3c5cb8', green: '#2a7049' } as const
const ROSE = '#b8354f'

const number = (value: number) => Math.round(value).toLocaleString('es')

/** The lines of the summary, shared by the sheet and the image so both always say the same. */
export function yearLines(summary: YearSummary): string[] {
  return [
    summary.pages > 0 ? `${number(summary.pages)} páginas entre los dos` : null,
    summary.minutesTogether > 0 ? `${formatMinutes(summary.minutesTogether)} leyendo a la vez` : null,
    summary.topMonth ? `El mes más lector: ${summary.topMonth.name}, con ${number(summary.topMonth.pages)} páginas` : null,
    summary.bestStreak > 1 ? `Vuestra mejor racha: ${formatDays(summary.bestStreak)}` : null,
    summary.favorite ? `El que más os gustó: «${summary.favorite.title}» (${summary.favorite.note})` : null,
  ].filter((line): line is string => !!line)
}

export async function shareYearImage(summary: YearSummary, names: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  await loadShareFonts()
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const context = canvas.getContext('2d')
  if (!context) throw new Error('No se pudo preparar la imagen.')

  context.fillStyle = '#f8eee9'
  context.fillRect(0, 0, WIDTH, HEIGHT)
  context.fillStyle = PAPER
  context.fillRect(40, 40, WIDTH - 80, HEIGHT - 80)
  context.strokeStyle = '#e8d7cf'
  context.lineWidth = 2
  context.strokeRect(64, 64, WIDTH - 128, HEIGHT - 128)
  // One ribbon per reader, like the covers in the app.
  summary.people.forEach(({ person }, index) => {
    context.fillStyle = ACCENT[person.accent]
    const x = 852 + index * 52
    context.beginPath()
    context.moveTo(x, 40)
    context.lineTo(x + 40, 40)
    context.lineTo(x + 40, 168)
    context.lineTo(x + 20, 148)
    context.lineTo(x, 168)
    context.closePath()
    context.fill()
  })

  drawTextBox(context, summary.partial ? `VUESTRO ${summary.year}, DE MOMENTO` : `VUESTRO ${summary.year} EN LIBROS`,
    { x: 112, y: 108, width: 700, height: 40 }, SANS_FONT, 26, MUTED)
  drawTextBox(context, names, { x: 112, y: 156, width: 700, height: 70 }, TITLE_FONT, 52, INK)

  // The two big numbers, in Literata: canvas can't ask Young Serif for its lining figures, and «39» would sag.
  drawTextBox(context, number(summary.books), { x: 112, y: 262, width: 400, height: 140 }, BOOK_FONT, 120, INK)
  drawTextBox(context, summary.books === 1 ? 'libro terminado' : 'libros terminados', { x: 112, y: 404, width: 400, height: 44 }, SANS_FONT, 30, MUTED)
  drawTextBox(context, number(summary.bothDays), { x: 568, y: 262, width: 400, height: 140 }, BOOK_FONT, 120, ROSE)
  drawTextBox(context, summary.bothDays === 1 ? 'día leyendo los dos' : 'días leyendo los dos', { x: 568, y: 404, width: 400, height: 44 }, SANS_FONT, 30, MUTED)

  let y = 492
  for (const { person, books } of summary.people) {
    context.fillStyle = ACCENT[person.accent]
    context.beginPath()
    context.arc(124, y + 20, 10, 0, Math.PI * 2)
    context.fill()
    drawTextBox(context, `${person.display_name}: ${books} ${books === 1 ? 'libro' : 'libros'}`, { x: 150, y, width: 800, height: 44 }, SANS_FONT, 32, INK)
    y += 54
  }

  context.strokeStyle = '#e8d7cf'
  context.beginPath()
  context.moveTo(112, y + 18)
  context.lineTo(968, y + 18)
  context.stroke()
  y += 50
  for (const line of yearLines(summary)) {
    drawTextBox(context, line, { x: 112, y, width: 856, height: 52 }, BOOK_FONT, 34, INK)
    y += 66
  }
  if (summary.quote) {
    const room = Math.max(90, 1180 - y)
    drawTextBox(context, `«${summary.quote.body}»`, { x: 112, y: y + 10, width: 856, height: room - 50 }, BOOK_FONT, 38, ROSE, true)
    drawTextBox(context, `— ${summary.quote.title}`, { x: 112, y: y + room - 34, width: 856, height: 40 }, SANS_FONT, 26, MUTED, true)
  }
  drawTextBox(context, 'Greenbook', { x: 742, y: 1206, width: 226, height: 50 }, TITLE_FONT, 28, INK)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => (value ? resolve(value) : reject(new Error('No se pudo crear el PNG.'))), 'image/png')
  })
  return sharePng(blob, `greenbook-${summary.year}.png`, `Vuestro ${summary.year} en libros`)
}
