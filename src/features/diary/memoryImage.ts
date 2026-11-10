import { BOOK_FONT, drawTextBox, INK, loadShareFonts, MUTED, PAPER, SANS_FONT, sharePng, TITLE_FONT } from '@/features/quotes/shareImage'

const WIDTH = 1080
const HEIGHT = 1350
const ACCENT = { blue: '#3c5cb8', green: '#2a7049' } as const

export interface MemoryImage {
  title: string
  authors: string
  people: { name: string; accent: 'blue' | 'green'; line: string }[]
  facts: string[]
  curve: number[]
  quote?: string | null
}

/** The keepsake of a finished book as a portrait PNG, in the same paper as the quotes and the year. */
export async function shareMemoryImage(memory: MemoryImage): Promise<'shared' | 'downloaded' | 'cancelled'> {
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
  memory.people.forEach(({ accent }, index) => {
    context.fillStyle = ACCENT[accent]
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
  drawTextBox(context, 'LEÍDO', { x: 112, y: 108, width: 700, height: 40 }, SANS_FONT, 26, MUTED)
  drawTextBox(context, memory.title, { x: 112, y: 156, width: 700, height: 190 }, TITLE_FONT, 68, INK)
  drawTextBox(context, memory.authors, { x: 112, y: 356, width: 856, height: 44 }, SANS_FONT, 30, MUTED)

  let y = 440
  for (const person of memory.people) {
    context.fillStyle = ACCENT[person.accent]
    context.beginPath()
    context.arc(124, y + 22, 10, 0, Math.PI * 2)
    context.fill()
    drawTextBox(context, person.name, { x: 150, y, width: 800, height: 46 }, SANS_FONT, 34, ACCENT[person.accent])
    drawTextBox(context, person.line, { x: 150, y: y + 48, width: 818, height: 44 }, BOOK_FONT, 30, INK)
    y += 116
  }
  // The shape of the reading: one bar per day read.
  if (memory.curve.length > 1) {
    const max = Math.max(...memory.curve)
    const width = 856 / memory.curve.length
    context.fillStyle = ACCENT[memory.people[0]?.accent ?? 'green']
    memory.curve.forEach((value, index) => {
      const height = Math.max(6, (value / max) * 130)
      context.fillRect(112 + index * width + width * 0.15, y + 150 - height, Math.max(3, width * 0.7), height)
    })
    y += 186
  }
  context.strokeStyle = '#e8d7cf'
  context.beginPath()
  context.moveTo(112, y)
  context.lineTo(968, y)
  context.stroke()
  y += 28
  for (const fact of memory.facts) {
    drawTextBox(context, fact, { x: 112, y, width: 856, height: 48 }, BOOK_FONT, 32, INK)
    y += 58
  }
  if (memory.quote && y < 1040)
    drawTextBox(context, `«${memory.quote}»`, { x: 112, y: y + 10, width: 856, height: 1170 - y }, BOOK_FONT, 36, '#b8354f', true)
  drawTextBox(context, 'Greenbook', { x: 742, y: 1206, width: 226, height: 50 }, TITLE_FONT, 28, INK)
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => (value ? resolve(value) : reject(new Error('No se pudo crear el PNG.'))), 'image/png')
  })
  return sharePng(blob, 'recuerdo-greenbook.png', memory.title)
}
