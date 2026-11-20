import type { Unit } from '@/lib/types'
import { alreadyPosition, type AlreadyDraft } from '@/lib/already'

interface Props {
  unit: Unit
  /** Pages of the edition, or 100 for a percentage. */
  total: number
  /** Tonight: it cannot have been started later. */
  today: string
  value: AlreadyDraft
  onChange: (draft: AlreadyDraft) => void
}

/** A book already under way: where the bookmark is, and since when, if it is remembered. */
export function AlreadyStartedFields({ unit, total, today, value, onChange }: Props) {
  const percent = unit === 'porcentaje'
  const typed = value.position !== ''
  const wrong = typed && total > 0 && alreadyPosition(value, total) == null
  return (
    <div className="flex flex-col gap-4 rounded-[18px] border-[1.5px] border-rule px-4 py-4">
      <div>
        <label className="label" htmlFor="already-position">
          {percent ? '¿Por qué % vas?' : '¿Por qué página vas?'}
        </label>
        <input
          id="already-position"
          className="field"
          inputMode="numeric"
          placeholder={percent ? 'Por ejemplo, 35' : `Entre 0 y ${total > 0 ? total - 1 : '…'}`}
          value={value.position}
          aria-invalid={wrong || undefined}
          onChange={(event) => onChange({ ...value, position: event.currentTarget.value.replace(/\D/g, '').slice(0, 5) })}
        />
        {wrong && (
          <p className="mt-1.5 text-[15px] text-danger">
            {percent ? 'Tiene que ser menos de 100 %: si lo has acabado, márcalo como leído.' : `Tiene que ser menos de ${total}: si lo has acabado, márcalo como leído.`}
          </p>
        )}
      </div>
      <div>
        <label className="label" htmlFor="already-since">
          ¿Desde cuándo? <span className="text-[15px]">(si lo recuerdas)</span>
        </label>
        <input
          id="already-since"
          className="field"
          type="date"
          max={today}
          value={value.startedOn}
          onChange={(event) => onChange({ ...value, startedOn: event.currentTarget.value })}
        />
      </div>
    </div>
  )
}
