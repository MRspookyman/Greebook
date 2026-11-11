import { restoreReading, setStatus } from '@/lib/actions'
import type { Book, Reading, Status } from '@/lib/types'
import { Sheet } from './Sheet'
import { toast } from './toast'

const CHOICES: Array<{ status: Status; title: string; detail: string; done: string }> = [
  { status: 'leyendo', title: 'Lo estoy leyendo', detail: 'En la mesilla.', done: 'Está en la mesilla' },
  { status: 'pendiente', title: 'Para más adelante', detail: 'A la pila de por leer.', done: 'Guardado para más adelante' },
  { status: 'terminado', title: 'Terminado', detail: 'A la estantería, con tu cinta.', done: 'Ya está en la estantería' },
  { status: 'dejado', title: 'Dejado a medias', detail: 'Sin culpa. Se puede retomar cuando quieras.', done: 'Dejado a medias. No pasa nada.' },
]

interface Props {
  /** My bookmark in the book whose state is being changed; null keeps the sheet closed. */
  reading: Reading | null
  book?: Book
  onClose: () => void
  /** Called after a change, with the new state. */
  onChanged?: (status: Status) => void
}

/** One place to say how you have a book: reading it, for later, finished or left halfway. The same everywhere. */
export function StatusSheet({ reading, book, onClose, onChanged }: Props) {
  return (
    <Sheet open={!!reading} onClose={onClose} title={book?.title ?? '¿Cómo lo tienes?'}>
      {reading && (
        <div role="radiogroup" aria-label="Cómo tienes este libro" className="flex flex-col gap-2">
          {CHOICES.map((choice) => {
            const on = reading.status === choice.status
            return (
              <button
                key={choice.status}
                type="button"
                role="radio"
                aria-checked={on}
                className="flex min-h-[60px] items-center gap-4 rounded-[18px] border-[1.5px] px-4 text-left transition-colors"
                style={{
                  borderColor: on ? 'var(--ink)' : 'var(--rule)',
                  background: on ? 'color-mix(in oklab, var(--ink) 7%, transparent)' : 'transparent',
                }}
                onClick={() => {
                  onClose()
                  if (on) return
                  setStatus(reading, choice.status)
                  toast(choice.done, { label: 'Deshacer', run: () => restoreReading(reading) })
                  onChanged?.(choice.status)
                }}
              >
                <span
                  aria-hidden
                  className="grid h-5 w-5 flex-none place-items-center rounded-full border-[1.5px]"
                  style={{ borderColor: on ? 'var(--ink)' : 'var(--muted)' }}
                >
                  {on && <span className="h-2.5 w-2.5 rounded-full bg-ink" />}
                </span>
                <span>
                  <span className="block text-[18px] leading-tight">{choice.title}</span>
                  <span className="quiet block text-[15px]">
                    {choice.status === 'leyendo' && reading.status === 'terminado' ? 'Vuelve a la mesilla, desde el principio.' : choice.detail}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </Sheet>
  )
}
