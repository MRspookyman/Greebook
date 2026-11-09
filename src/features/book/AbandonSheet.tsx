import { useState } from 'react'
import type { Reading, ReadingWithBook } from '@/lib/types'
import { BottomSheet } from '@/components/BottomSheet'

const reasons = ['Muy lento', 'No era el momento', 'No me engancha', 'Demasiado denso', 'Pausa, volveré']

export function AbandonSheet({ reading, disabled, onSave, onClose }: {
  reading: ReadingWithBook
  disabled: boolean
  onSave: (values: Partial<Reading>) => Promise<boolean>
  onClose: () => void
}) {
  const [reason, setReason] = useState(reading.abandon_reason ?? '')
  const [position, setPosition] = useState(String(reading.current_position))
  const [error, setError] = useState('')
  return <BottomSheet open onClose={onClose} title="Dejar esta lectura" dirty={reason !== (reading.abandon_reason ?? '') || position !== String(reading.current_position)}>
    <form className="space-y-4" onSubmit={(event) => {
      event.preventDefault()
      const value = /^\d+$/.test(position) ? Number(position) : NaN
      if (!Number.isSafeInteger(value) || value < 0 || value > reading.total_units) {
        setError(`Indica una posición entre 0 y ${reading.total_units}.`)
        return
      }
      void onSave({ status: 'abandoned', abandon_reason: reason || null, current_position: value, finished_on: null, finished_precision: null }).then((saved) => { if (saved) onClose() })
    }}>
      <fieldset className="space-y-4" disabled={disabled}>
        <p className="text-sm text-muted">Puedes dejar un motivo, si te apetece.</p>
        <div className="flex flex-wrap gap-2">{reasons.map((value) => <button type="button" className="chip" key={value} aria-pressed={reason === value} onClick={() => setReason(reason === value ? '' : value)}>{value}</button>)}</div>
        <label className="label">{reading.unit === 'pages' ? 'Página donde lo dejas' : 'Porcentaje donde lo dejas'}<input className="input mt-2" type="number" min={0} max={reading.total_units} step={1} value={position} onChange={(event) => setPosition(event.target.value)} required /></label>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <button className="btn btn-primary w-full">Guardar como dejado</button>
      </fieldset>
    </form>
  </BottomSheet>
}
