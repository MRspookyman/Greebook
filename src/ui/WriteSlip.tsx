import { useState } from 'react'
import { editSlip, leaveSlip, removeSlip } from '@/lib/actions'
import { fractionOf } from '@/lib/lock'
import type { Book, Profile, Reading, Slip, SlipKind } from '@/lib/types'

interface Props {
  book: Book
  /** My bookmark in this book, if I have one. */
  mine?: Reading
  /** Their bookmark, to say when they will find it. */
  theirs?: Reading
  partner: Profile | null
  /** What is being written: a slip between pages, or one of the two things that go in the envelope. */
  what: 'papel' | 'prediccion' | 'carta'
  /** An existing slip of mine to change instead. */
  editing?: Slip
  onDone: () => void
}

const HINTS = {
  cita: 'Cópiala tal cual…',
  nota: 'Lo que le dirías si estuviera al lado…',
  prediccion: 'Yo creo que…',
  carta: 'Lo que ha sido este libro para ti, cómo te has sentido leyéndolo…',
}

/** Writing by hand: a slip for a page, or the final note that closes a book. */
export function WriteSlip({ book, mine, theirs, partner, what, editing, onDone }: Props) {
  const [kind, setKind] = useState<SlipKind>(editing?.kind ?? (what === 'papel' ? 'nota' : what))
  const [body, setBody] = useState(editing?.body ?? '')
  const [page, setPage] = useState(mine && mine.position > 0 ? String(mine.position) : '')
  const [loose, setLoose] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const paper = what === 'papel'
  const percent = mine?.unit === 'porcentaje'
  const total = mine?.total ?? book.pages ?? 0
  const number = Number(page)
  const placed = paper && !loose && page !== '' && number >= 0 && (!total || number <= total)
  const name = partner?.name ?? 'Tu pareja'

  let fate = ''
  if (!editing && partner) {
    const theirOpen = theirs && (theirs.status === 'leyendo' || theirs.status === 'pendiente')
    if (what === 'prediccion') fate = 'Se queda guardada hasta que los dos cerréis el libro.'
    else if (what === 'carta') {
      fate = `Se queda guardada con el libro, para cuando volváis a él. ${
        theirOpen
          ? `${name} la leerá cuando lo termine y escriba la suya.`
          : theirs?.status === 'terminado'
            ? `${name} la leerá cuando haya escrito la suya.`
            : `${name} podrá leerla.`
      }`
    } else if (placed && theirOpen && total && fractionOf(theirs.position, theirs.total) < fractionOf(number, total)) {
      fate = `${name} lo encontrará al llegar ahí.`
    } else fate = `${name} lo verá la próxima vez que entre.`
  }

  const save = () => {
    if (editing) editSlip(editing, body)
    else leaveSlip({ book, kind, page: placed ? number : null, body })
    onDone()
  }

  return (
    <div className="flex flex-col gap-5">
      {paper && !editing && (
        <div className="flex gap-2">
          <button type="button" className="chip" aria-pressed={kind === 'nota'} onClick={() => setKind('nota')}>
            Unas palabras mías
          </button>
          <button type="button" className="chip" aria-pressed={kind === 'cita'} onClick={() => setKind('cita')}>
            Una frase del libro
          </button>
        </div>
      )}

      <div className="slip">
        <textarea
          className={`block min-h-[140px] w-full resize-none bg-transparent leading-[28px] outline-none placeholder:opacity-45 ${kind === 'cita' ? 'text-[19px] italic' : 'hand'}`}
          autoFocus
          maxLength={4000}
          placeholder={HINTS[kind]}
          aria-label={kind === 'cita' ? 'La frase' : 'Tus palabras'}
          value={body}
          onChange={(event) => setBody(event.currentTarget.value)}
        />
      </div>

      {paper && !editing && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <label className="flex items-center gap-3" style={{ opacity: loose ? 0.4 : 1 }}>
            <span>{percent ? 'En el' : 'En la página'}</span>
            <input
              className="field !min-h-11 !w-[5.2em] !px-3 !py-1 text-center"
              inputMode="numeric"
              disabled={loose}
              aria-label={percent ? 'Porcentaje' : 'Página'}
              value={page}
              onChange={(event) => setPage(event.currentTarget.value.replace(/\D/g, '').slice(0, 5))}
            />
            {percent && <span>%</span>}
          </label>
          <button type="button" className="chip" aria-pressed={loose} onClick={() => setLoose(!loose)}>
            Suelto, no destripa nada
          </button>
        </div>
      )}

      {fate && <p className="quiet -mt-1 text-[15.5px]">{fate}</p>}

      <button className="btn btn-primary" disabled={!body.trim()} onClick={save}>
        {editing ? 'Guardar' : paper ? 'Dejarlo en el libro' : 'Guardarla con el libro'}
      </button>

      {editing &&
        (confirming ? (
          <div className="flex items-center justify-center gap-3">
            <span className="quiet">¿Seguro?</span>
            <button
              className="btn btn-text btn-danger"
              onClick={() => {
                removeSlip(editing)
                onDone()
              }}
            >
              Sí, romperlo
            </button>
          </div>
        ) : (
          <button className="btn btn-text btn-danger self-center" onClick={() => setConfirming(true)}>
            Romper este papel
          </button>
        ))}
    </div>
  )
}
