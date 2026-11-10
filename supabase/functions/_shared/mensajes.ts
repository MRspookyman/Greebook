/** What each notice says. No dependencies: the app's tests import this file too. */

export interface Push {
  title: string
  body: string
  url: string
  tag: string
}

export const excerpt = (text: string, max = 90) => {
  const clean = text.trim().replace(/\s+/g, ' ')
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean
}

/** «Laura ha encendido su vela». */
export function candleNotice(name: string, book: string | null): Push {
  return {
    title: `🕯️ ${name} ha encendido su vela`,
    body: book ? `Está leyendo «${book}». ¿Enciendes la tuya?` : '¿Enciendes la tuya?',
    url: '/',
    tag: 'vela',
  }
}

export interface SlipNotice {
  name: string
  book: string
  bookId: string
  kind: 'cita' | 'nota' | 'prediccion' | 'carta'
  page: number | null
  body: string
  /** Folded for whoever receives the notice: its text must not travel. */
  locked: boolean
}

/** «Javier ha dejado algo entre las páginas». A folded slip never shows its text. */
export function slipNotice({ name, book, bookId, kind, page, body, locked }: SlipNotice): Push {
  const url = `/libro/${bookId}#${kind === 'carta' || kind === 'prediccion' ? 'sobre' : 'papeles'}`
  if (kind === 'carta' || kind === 'prediccion') {
    return {
      title: `✉️ ${name} ha metido su valoración en el sobre`,
      body: locked ? `«${book}». Se abre cuando esté también la tuya.` : `«${book}». Ya puedes verla.`,
      url,
      tag: `sobre:${bookId}`,
    }
  }
  return {
    title: `📄 ${name} ha dejado algo entre las páginas`,
    body: locked
      ? `«${book}»${page != null ? `, hacia la página ${page}` : ''}. Lo encontrarás al llegar.`
      : `«${book}»: ${excerpt(body)}`,
    url,
    tag: `papel:${bookId}`,
  }
}

/** «Laura ha encontrado tu papel». */
export function foundNotice(name: string, book: string, bookId: string, envelope: boolean): Push {
  return {
    title: envelope ? `✉️ ${name} ha abierto el sobre` : `📄 ${name} ha encontrado tu papel`,
    body: `«${book}»`,
    url: `/libro/${bookId}#${envelope ? 'sobre' : 'papeles'}`,
    tag: `hallazgo:${bookId}`,
  }
}

/** «Javier ha terminado Rayuela». */
export function finishedNotice(name: string, book: string, bookId: string, bothDone: boolean): Push {
  return {
    title: `📗 ${name} ha terminado «${book}»`,
    body: bothDone ? 'Lo habéis cerrado los dos. Mirad el sobre.' : 'Ya está en vuestra estantería.',
    url: `/libro/${bookId}#sobre`,
    tag: `final:${bookId}`,
  }
}
