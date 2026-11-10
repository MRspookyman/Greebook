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

/** «Javier ha dejado una nota». Every note is open to both; `locked` only guards against an older server. */
export function slipNotice({ name, book, bookId, page, body, locked }: SlipNotice): Push {
  return {
    title: `📄 ${name} ha dejado una nota`,
    body: locked ? `«${book}»${page != null ? `, hacia la página ${page}` : ''}.` : `«${book}»: ${excerpt(body)}`,
    url: `/libro/${bookId}#papeles`,
    tag: `papel:${bookId}`,
  }
}

/** «Laura ha leído tu nota». */
export function foundNotice(name: string, book: string, bookId: string, _envelope = false): Push {
  return {
    title: `📄 ${name} ha leído tu nota`,
    body: `«${book}»`,
    url: `/libro/${bookId}#papeles`,
    tag: `hallazgo:${bookId}`,
  }
}

/** «Javier ha terminado Rayuela». */
export function finishedNotice(name: string, book: string, bookId: string, bothDone: boolean): Push {
  return {
    title: `📗 ${name} ha terminado «${book}»`,
    body: bothDone ? 'Lo habéis cerrado los dos.' : 'Ya está en vuestra estantería.',
    url: `/libro/${bookId}`,
    tag: `final:${bookId}`,
  }
}
