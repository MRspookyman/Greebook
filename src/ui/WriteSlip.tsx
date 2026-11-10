import { useState } from 'react'
import { editSlip, leaveSlip, removeSlip } from '@/lib/actions'
import type { Book, Profile, Reading, Slip } from '@/lib/types'

interface Props {
  book: Book
  /** My bookmark in this book, if I have one. */
  mine?: Reading
  partner: Profile | null
  /** An existing slip of mine to change instead. */
  editing?: Slip
  onDone: () => void
}

/**
 * Writing a note in a book: about a page, a passage, a sentence you copy, or the whole book. It can be for the
 * other one or for yourself; both of you can always read it.
 */
export function WriteSlip({ book, mine, partner, editing, onDone }: Props) {
  const [body, setBody] = useState(editing?.body ?? '')
  const [page, setPage] = useState(mine && mine.position > 0 ? String(mine.position) : '')
  const [loose, setLoose] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const percent = mine?.unit === 'porcentaje'
  const total = mine?.total ?? book.pages ?? 0
  const number = Number(page)
  const placed = !loose && page !== '' && number >= 0 && (!total || number <= total)
  const fate = editing ? '' : partner ? `La veis los dos. ${partner.name} la tendrá la próxima vez que entre.` : 'Se queda guardada con el libro.'

  const save = () => {
    if (editing) editSlip(editing, body)
    else leaveSlip({ book, kind: 'nota', page: placed ? number : null, body })
    onDone()
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="slip">
        <textarea
          className={`block min-h-[140px] w-full resize-none bg-transparent leading-[28px] outline-none placeholder:opacity-45 ${editing?.kind === 'cita' ? 'text-[19px] italic' : 'hand'}`}
          autoFocus
          maxLength={4000}
          placeholder="Lo que quieras: una frase del libro, lo que te ha hecho sentir esta página, algo para ti o para quien lo lea contigo…"
          aria-label="Tu nota"
          value={body}
          onChange={(event) => setBody(event.currentTarget.value)}
        />
      </div>

      {!editing && (
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
            Sobre el libro entero
          </button>
        </div>
      )}

      {fate && <p className="quiet -mt-1 text-[15.5px]">{fate}</p>}

      <button className="btn btn-primary" disabled={!body.trim()} onClick={save}>
        {editing ? 'Guardar' : 'Dejarla en el libro'}
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
              Sí, romperla
            </button>
          </div>
        ) : (
          <button className="btn btn-text btn-danger self-center" onClick={() => setConfirming(true)}>
            Romper esta nota
          </button>
        ))}
    </div>
  )
}
