import { useState } from 'react'
import { editSlip, leaveSlip, removeSlip } from '@/lib/actions'
import type { Book, Profile, Reading, Slip } from '@/lib/types'

interface Props {
  book: Book
  /** My bookmark in this book, if I have one. */
  mine?: Reading
  partner: Profile | null
  /** Writing what the whole book was for me (a review), not a note on a page. */
  review?: boolean
  /** An existing slip of mine to change instead. */
  editing?: Slip
  onDone: () => void
}

/**
 * Writing a note in a book: about a page, a passage, a sentence you copy, or the whole book. It can be for the
 * other one or for yourself; both of you can always read it.
 */
export function WriteSlip({ book, mine, partner, review: asked = false, editing, onDone }: Props) {
  const review = asked || (!!editing && editing.at == null)
  const [body, setBody] = useState(editing?.body ?? '')
  const [page, setPage] = useState(mine && mine.position > 0 ? String(mine.position) : '')
  const [confirming, setConfirming] = useState(false)
  const percent = mine?.unit === 'porcentaje'
  const total = mine?.total ?? book.pages ?? 0
  const number = Number(page)
  const placed = !review && page !== '' && number >= 0 && (!total || number <= total)
  const invalidPage = !editing && !review && page !== '' && total > 0 && number > total
  const missingPage = !editing && !review && page === ''
  const [hidden, setHidden] = useState(!!editing?.hidden)
  // Hiding only makes sense with someone to hide it from and a page to wait for.
  const canHide = !review && !!partner && (editing ? editing.at != null : placed)
  const name = partner?.name ?? ''
  const fate = review
    ? partner
      ? `Se queda en «Lo que os pareció». ${name} la ve.`
      : 'Se queda con el libro, en «Lo que te pareció».'
    : !partner
    ? 'Se queda guardada con el libro.'
    : hidden && canHide
      ? `${name} verá que hay una nota, pero no lo que dice hasta que llegue a esa página.`
      : `${name} puede leerla desde ya, vaya por donde vaya.`

  const save = () => {
    if (invalidPage || missingPage) return
    if (editing) editSlip(editing, body, hidden && canHide)
    else leaveSlip({ book, kind: 'nota', page: placed ? number : null, body, hidden: hidden && canHide })
    onDone()
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="slip">
        <textarea
          className={`block min-h-[140px] w-full resize-none bg-transparent leading-[28px] outline-none placeholder:opacity-70 ${editing?.kind === 'cita' ? 'text-[19px] italic' : 'hand'}`}
          autoFocus
          maxLength={4000}
          placeholder={review ? 'Un resumen, lo que ha sido para ti, cómo te ha dejado…' : 'Lo que quieras: una frase del libro, lo que te ha hecho sentir esta página, algo para ti o para quien lo lea contigo…'}
          aria-label={review ? 'Tu valoración' : 'Tu nota'}
          value={body}
          onChange={(event) => setBody(event.currentTarget.value)}
        />
      </div>

      {!editing && !review && (
        <label className="flex items-center gap-3">
          <span>{percent ? 'En el' : 'En la página'}</span>
          <input
            className="field !min-h-11 !w-[5.2em] !px-3 !py-1 text-center"
            inputMode="numeric"
            aria-label={percent ? 'Porcentaje' : 'Página'}
            aria-invalid={invalidPage}
            aria-describedby={invalidPage ? 'slip-page-error' : undefined}
            value={page}
            onChange={(event) => setPage(event.currentTarget.value.replace(/\D/g, '').slice(0, 5))}
          />
          {percent && <span>%</span>}
        </label>
      )}

      {partner && !review && (
        <div role="radiogroup" aria-label={`Cómo la ve ${name}`} className="flex flex-wrap gap-2">
          <button type="button" role="radio" className="chip" aria-checked={!(hidden && canHide)} aria-pressed={!(hidden && canHide)} onClick={() => setHidden(false)}>
            A la vista
          </button>
          <button
            type="button"
            role="radio"
            className="chip disabled:opacity-40"
            aria-checked={hidden && canHide}
            aria-pressed={hidden && canHide}
            disabled={!canHide}
            onClick={() => setHidden(true)}
          >
            Oculta hasta que llegue a la página
          </button>
        </div>
      )}

      {invalidPage ? (
        <p id="slip-page-error" className="text-danger text-[15.5px]" role="status">
          {percent ? 'El porcentaje máximo es 100 %' : `Tu edición tiene ${total} páginas`}
        </p>
      ) : (
        <p className="quiet -mt-1 text-[15.5px]">{fate}</p>
      )}

      <button className="btn btn-primary" disabled={!body.trim() || invalidPage || missingPage} onClick={save}>
        {editing || review ? 'Guardar' : 'Dejarla en el libro'}
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
              {review ? 'Sí, borrarla' : 'Sí, romperla'}
            </button>
          </div>
        ) : (
          <button className="btn btn-text btn-danger self-center" onClick={() => setConfirming(true)}>
            {review ? 'Borrar mi valoración' : 'Romper esta nota'}
          </button>
        ))}
    </div>
  )
}
