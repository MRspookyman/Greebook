export interface ShareQuoteImageOptions {
  body?: string | null
  photoUrl?: string | null
  title: string
  authors: readonly string[]
  savedBy: string
  accent: 'green' | 'blue'
  page?: number | null
  kind?: 'cita' | 'nota'
}

/** Wrap text using the renderer's measured font, preserving paragraphs and splitting long words. */
export function wrapQuoteText(
  text: string,
  maxWidth: number,
  measure: (text: string) => number,
): string[] {
  if (!Number.isFinite(maxWidth) || maxWidth <= 0) throw new RangeError('El ancho debe ser positivo.')
  if (!text.trim()) return []
  const lines: string[] = []
  for (const paragraph of text.replace(/\r\n?/g, '\n').trim().split('\n')) {
    let line = ''
    for (const word of paragraph.trim().split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word
      if (measure(candidate) <= maxWidth) {
        line = candidate
        continue
      }
      if (line) {
        lines.push(line)
        line = ''
      }
      if (measure(word) <= maxWidth) {
        line = word
        continue
      }
      for (const character of word) {
        if (line && measure(line + character) > maxWidth) {
          lines.push(line)
          line = ''
        }
        line += character
      }
    }
    lines.push(line)
  }
  return lines
}

const WIDTH = 1080
const HEIGHT = 1350
export const PAPER = '#fffaf7'
export const INK = '#33202c'
export const MUTED = '#735d69'
export const BOOK_FONT = '"Literata Variable", "Literata", Georgia, serif'
export const TITLE_FONT = '"Young Serif", Georgia, serif'
export const SANS_FONT = '"Nunito Variable", "Nunito", sans-serif'

/** Waits for the faces a share image uses, including ones the current screen hasn't drawn yet. */
export async function loadShareFonts(): Promise<void> {
  await Promise.all([
    document.fonts.load(`48px ${BOOK_FONT}`),
    document.fonts.load(`36px ${TITLE_FONT}`),
    document.fonts.load(`28px ${SANS_FONT}`),
  ])
  await document.fonts.ready
}

export function drawTextBox(
  context: CanvasRenderingContext2D,
  text: string,
  box: { x: number; y: number; width: number; height: number },
  family: string,
  initialSize: number,
  color: string,
  centered = false,
) {
  let size = initialSize
  let lines: string[]
  let lineHeight: number
  do {
    context.font = `${size}px ${family}`
    lines = wrapQuoteText(text, box.width, (value) => context.measureText(value).width)
    lineHeight = size * 1.4
    if (lines.length * lineHeight <= box.height) break
    size -= 1
  } while (size > 1)
  context.fillStyle = color
  context.textBaseline = 'top'
  context.textAlign = centered ? 'center' : 'left'
  const top = box.y + (centered ? (box.height - lines.length * lineHeight) / 2 : 0)
  lines.forEach((line, index) => {
    context.fillText(line, centered ? box.x + box.width / 2 : box.x, top + index * lineHeight)
  })
}

async function loadPhoto(url: string): Promise<HTMLImageElement> {
  const image = new Image()
  image.crossOrigin = 'anonymous'
  image.src = url
  await image.decode()
  return image
}

/** Render an unlocked quote to a portrait PNG. Never pass spoiler-locked text or photos. */
export async function renderQuoteImage(
  options: ShareQuoteImageOptions,
): Promise<Blob> {
  const body = options.body?.trim() ?? ''
  if (!body && !options.photoUrl) throw new Error('La cita no tiene texto ni foto para compartir.')
  // Explicit loads cover fonts that the current screen has not yet used; ready also waits for layout fonts.
  await loadShareFonts()
  const photo = options.photoUrl ? await loadPhoto(options.photoUrl) : null
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const context = canvas.getContext('2d')
  if (!context) throw new Error('No se pudo preparar la imagen de la cita.')

  const accent = options.accent === 'blue' ? '#3c5cb8' : '#2a7049'
  context.fillStyle = '#f8eee9'
  context.fillRect(0, 0, WIDTH, HEIGHT)
  context.fillStyle = PAPER
  context.fillRect(40, 40, WIDTH - 80, HEIGHT - 80)
  context.strokeStyle = '#e8d7cf'
  context.lineWidth = 2
  context.strokeRect(64, 64, WIDTH - 128, HEIGHT - 128)

  // A bookmark ribbon identifies who saved the quote without recolouring the paper.
  context.fillStyle = accent
  context.beginPath()
  context.moveTo(880, 40)
  context.lineTo(952, 40)
  context.lineTo(952, 170)
  context.lineTo(916, 148)
  context.lineTo(880, 170)
  context.closePath()
  context.fill()
  drawTextBox(context, options.kind === 'nota' ? 'NOTA GUARDADA' : 'UNA CITA PARA GUARDAR',
    { x: 108, y: 104, width: 730, height: 45 }, SANS_FONT, 24, MUTED)

  const content = { x: 112, y: 214, width: 856, height: 740 }
  if (photo) {
    const photoHeight = body ? 320 : content.height
    const scale = Math.min(content.width / photo.naturalWidth, photoHeight / photo.naturalHeight)
    const width = photo.naturalWidth * scale
    const height = photo.naturalHeight * scale
    context.drawImage(photo, content.x + (content.width - width) / 2, content.y + (photoHeight - height) / 2, width, height)
    if (body) {
      drawTextBox(context, body, { ...content, y: content.y + 356, height: content.height - 356 }, BOOK_FONT, 42, INK, true)
    }
  } else {
    drawTextBox(context, '“', { x: 104, y: 150, width: 160, height: 110 }, TITLE_FONT, 100, accent)
    drawTextBox(context, body, content, BOOK_FONT, 52, INK, true)
  }

  context.strokeStyle = '#e8d7cf'
  context.beginPath()
  context.moveTo(112, 990)
  context.lineTo(968, 990)
  context.stroke()
  drawTextBox(context, `— ${options.title}`, { x: 112, y: 1020, width: 856, height: 94 }, TITLE_FONT, 34, INK)
  const authorsAndPage = [options.authors.join(', '), options.page != null ? `p. ${options.page}` : ''].filter(Boolean).join(' · ')
  drawTextBox(context, authorsAndPage, { x: 112, y: 1126, width: 856, height: 56 }, SANS_FONT, 25, MUTED)
  drawTextBox(context, `Guardada por ${options.savedBy}`, { x: 112, y: 1210, width: 580, height: 44 }, SANS_FONT, 25, accent)
  drawTextBox(context, 'Greenbook', { x: 742, y: 1206, width: 226, height: 50 }, TITLE_FONT, 28, INK)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error('No se pudo crear el PNG.')), 'image/png')
  })
  return blob
}

export async function shareQuoteImage(options: ShareQuoteImageOptions): Promise<'shared' | 'downloaded' | 'cancelled'> {
  return sharePng(await renderQuoteImage(options), 'cita-greenbook.png', options.title)
}

/** Opens the share sheet with a PNG, or downloads it where sharing files isn't available. */
export async function sharePng(blob: Blob, name: string, title: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], name, { type: 'image/png' })
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title })
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
      throw error
    }
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Keep the URL alive long enough for browsers to begin the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'downloaded'
}
