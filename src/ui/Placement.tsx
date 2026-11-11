import { useState } from 'react'
import type { Placement } from '@/lib/actions'
import type { Status, Unit } from '@/lib/types'

interface Props {
  /** Pages the book says it has, if known. */
  pages: number | null
  /** Label of the confirm button. */
  action?: string
  onDone: (placement: Placement) => void
}

const CHOICES: Array<{ status: Status; title: string; detail: string }> = [
  { status: 'leyendo', title: 'Lo empiezo ya', detail: 'Va a la mesilla.' },
  { status: 'pendiente', title: 'Para más adelante', detail: 'A la pila de por leer.' },
  { status: 'terminado', title: 'Ya lo leí', detail: 'Directo a la estantería.' },
]

/** Where a book goes when it enters the room, and how you count it: pages or Kindle's %. */
export function PlacementForm({ pages, action = 'Añadir', onDone }: Props) {
  const [thisYear] = useState(() => new Date().getFullYear())
  const [status, setStatus] = useState<Status>('leyendo')
  const [unit, setUnit] = useState<Unit>('paginas')
  const [total, setTotal] = useState(pages ? String(pages) : '')
  const [year, setYear] = useState(String(thisYear))
  const count = Number(total)
  const valid = unit === 'porcentaje' || (Number.isInteger(count) && count > 0 && count <= 20000)
  const finishedYear = Number(year)
  const yearValid = status !== 'terminado' || (Number.isInteger(finishedYear) && finishedYear > 1900 && finishedYear <= thisYear)

  return (
    <div className="flex flex-col gap-6">
      <div role="radiogroup" aria-label="¿Dónde lo ponemos?" className="flex flex-col gap-2">
        {CHOICES.map((choice) => {
          const on = status === choice.status
          return (
            <button
              key={choice.status}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setStatus(choice.status)}
              className="flex min-h-[60px] items-center gap-4 rounded-[18px] border-[1.5px] px-4 text-left transition-colors"
              style={{
                borderColor: on ? 'var(--ink)' : 'var(--rule)',
                background: on ? 'color-mix(in oklab, var(--ink) 7%, transparent)' : 'transparent',
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
                <span className="quiet block text-[15px]">{choice.detail}</span>
              </span>
            </button>
          )
        })}
      </div>

      {status === 'terminado' && (
        <div>
          <label className="label" htmlFor="finished-year">
            ¿En qué año?
          </label>
          <input
            id="finished-year"
            className="field"
            inputMode="numeric"
            value={year}
            onChange={(event) => setYear(event.currentTarget.value.replace(/\D/g, '').slice(0, 4))}
          />
        </div>
      )}

      <div>
        <p className="label">¿Cómo lo lees?</p>
        <div className="flex gap-2">
          <button type="button" className="chip" aria-pressed={unit === 'paginas'} onClick={() => setUnit('paginas')}>
            En papel, por páginas
          </button>
          <button type="button" className="chip" aria-pressed={unit === 'porcentaje'} onClick={() => setUnit('porcentaje')}>
            En Kindle, por %
          </button>
        </div>
        {unit === 'paginas' && (
          <div className="mt-4">
            <label className="label" htmlFor="total-pages">
              Páginas de tu edición
            </label>
            <input
              id="total-pages"
              className="field"
              inputMode="numeric"
              placeholder="Míralo en la última página"
              value={total}
              onChange={(event) => setTotal(event.currentTarget.value.replace(/\D/g, '').slice(0, 5))}
            />
          </div>
        )}
      </div>

      <button
        className="btn btn-primary"
        disabled={!valid || !yearValid}
        onClick={() =>
          onDone({
            status,
            unit,
            total: unit === 'porcentaje' ? 100 : count,
            finishedYear: status === 'terminado' ? finishedYear : undefined,
          })
        }
      >
        {action}
      </button>
    </div>
  )
}
