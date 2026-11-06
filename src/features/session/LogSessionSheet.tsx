import { useState } from 'react'
import { BottomSheet } from '@/components/BottomSheet'
import { Cover } from '@/components/Cover'
import { toast } from '@/components/toast'
import { useMe } from '@/features/auth/me'
import { useReadings } from '@/lib/data'
import { todayISO } from '@/lib/dates'
import { formatUnitValue, parseHMM, toHMM } from '@/lib/units'
import type { ReadingWithBook } from '@/lib/types'
import { logSession } from '@/lib/offline/sessionQueue'
import { FinishSheet } from './FinishSheet'

type Props = {
  open: boolean
  onClose: () => void
  reading?: ReadingWithBook
  initialDate?: string
  initialMinutes?: number
}
export function LogSessionSheet(props: Props) {
  return props.open ? <SessionFlow {...props} /> : null
}
function SessionFlow({ onClose, reading: initial, initialDate, initialMinutes }: Props) {
  const { userId } = useMe()
  const readings = useReadings(userId)
  const [selected, setSelected] = useState(initial?.id ?? '')
  const reading = readings.data?.find((r) => r.id === selected) ?? (initial?.id === selected ? initial : undefined)
  const [end, setEnd] = useState('')
  const [minutes, setMinutes] = useState(initialMinutes ? String(initialMinutes) : '')
  const [date, setDate] = useState(initialDate ?? todayISO())
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [finished, setFinished] = useState<ReadingWithBook | null>(null)
  async function save() {
    if (!reading || busy) return
    const pos = reading.unit === 'minutes' ? parseHMM(end) : /^\d+$/.test(end) ? Number(end) : null
    if (pos === null) {
      setError(reading.unit === 'minutes' ? 'Introduce una duración válida (h:mm)' : 'Introduce una posición válida')
      return
    }
    if (pos <= reading.current_position) {
      setError(`Debe ser mayor que tu posición actual (${formatUnitValue(reading.unit, reading.current_position)})`)
      return
    }
    if (pos > reading.total_units) {
      setError(`Este libro tiene ${formatUnitValue(reading.unit, reading.total_units)}`)
      return
    }
    if (!date || date > todayISO()) {
      setError('Elige una fecha que no sea futura')
      return
    }
    if (minutes && (!/^\d+$/.test(minutes) || Number(minutes) <= 0)) {
      setError('Los minutos deben ser mayores que cero')
      return
    }
    setBusy(true)
    setError('')
    try {
      await logSession({ reading, readOn: date, endPos: pos, minutes: minutes ? Number(minutes) : null })
      if (pos === reading.total_units) setFinished({ ...reading, current_position: pos })
      else onClose()
    } catch (e) {
      toast('No se pudo registrar la sesión', e instanceof Error ? e.message : 'Inténtalo de nuevo')
    } finally {
      setBusy(false)
    }
  }
  if (finished) return <FinishSheet reading={finished} readOn={date} onClose={onClose} />
  return (
    <BottomSheet open onClose={onClose} title="Registrar lectura">
      {!reading ? (
        <div className="space-y-3">
          <p>¿Qué has leído?</p>
          {readings.isPending && <p className="text-muted">Cargando libros…</p>}
          {readings.data
            ?.filter((r) => r.status === 'reading' || r.status === 'want')
            .map((r) => (
              <button
                key={r.id}
                className="card flex w-full items-center gap-3 text-left min-h-11"
                onClick={() => setSelected(r.id)}
              >
                <Cover book={r.book} width={40} />
                <span>{r.book.title}</span>
              </button>
            ))}
          {readings.data && !readings.data.some((r) => r.status === 'reading' || r.status === 'want') && (
            <p className="text-muted">Añade un libro a tu biblioteca para registrar una sesión.</p>
          )}
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
        >
          <p className="font-serif text-xl">{reading.book.title}</p>
          <label className="label">
            He llegado a …
            <input
              className="input mt-2"
              autoFocus
              inputMode={reading.unit === 'minutes' ? 'text' : 'numeric'}
              placeholder={
                reading.unit === 'minutes' ? toHMM(reading.current_position) : String(reading.current_position)
              }
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
            {reading.unit === 'minutes' && <span className="text-muted text-sm">Horas:minutos (h:mm)</span>}
          </label>
          <label className="label">
            Minutos de lectura (opcional)
            <input
              className="input mt-2"
              type="number"
              min="1"
              step="1"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </label>
          <label className="label">
            Fecha
            <input
              className="input mt-2"
              type="date"
              max={todayISO()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
          {error && (
            <p className="text-danger" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn-primary w-full" disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar sesión'}
          </button>
        </form>
      )}
    </BottomSheet>
  )
}
