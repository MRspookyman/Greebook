import { useState } from 'react'
import { endOfMonth, endOfYear } from 'date-fns'
import type { Reading, ReadingWithBook } from '@/lib/types'
import { fromISODate, toISODate, todayISO } from '@/lib/dates'
import { BottomSheet } from '@/components/BottomSheet'
import { Segmented } from '@/components/Segmented'
import { qk, useSessions } from '@/lib/data'
import { queryClient } from '@/lib/queryClient'
import { supabase } from '@/lib/supabase'
import { offlineDb } from '@/lib/offline/db'
import { usePendingSessionCount } from '@/lib/offline/sessionQueue'
import { useOnline } from '@/features/session/useOnline'
import { toast } from '@/components/toast'
import { collapsedSessionCount } from './convertUnits'

export function ReadingEditor({ reading, disabled, onSave, onClose }: {
  reading: ReadingWithBook
  disabled: boolean
  onSave: (values: Partial<Reading>) => Promise<boolean>
  onClose: () => void
}) {
  const [start, setStart] = useState(reading.started_on ?? '')
  const [finish, setFinish] = useState(reading.finished_on ?? '')
  const [finishEdited, setFinishEdited] = useState(false)
  const [format, setFormat] = useState(reading.format)
  const [unit, setUnit] = useState(reading.unit)
  const [total, setTotal] = useState(String(reading.unit === 'pages' ? reading.total_units : reading.book.page_count ?? ''))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const sessions = useSessions(reading.user_id)
  const online = useOnline()
  const pending = usePendingSessionCount()
  const blocked = disabled || busy || !online || pending > 0 || !sessions.isSuccess
  const conversion = unit !== reading.unit
  const changed = format !== reading.format || conversion || (unit === 'pages' && total !== String(reading.total_units))

  async function save() {
    if (blocked) return
    const units = unit === 'percent' ? 100 : /^\d+$/.test(total) ? Number(total) : NaN
    const precision = finishEdited ? (finish ? 'day' : null) : reading.finished_precision
    const latestFinish = !finish ? '' : precision === 'year' ? toISODate(endOfYear(fromISODate(finish)))
      : precision === 'month' ? toISODate(endOfMonth(fromISODate(finish))) : finish
    if ((start && start > todayISO()) || (finish && finish > todayISO()) || (start && latestFinish && start > latestFinish) || (reading.status === 'finished' && !finish)) {
      setError('Revisa las fechas: el fin debe estar entre el inicio y hoy. Los libros leídos necesitan fecha de fin.')
      return
    }
    const ownSessions = (sessions.data ?? []).filter((s) => s.reading_id === reading.id)
    const maxPosition = Math.max(reading.current_position, ...ownSessions.map((s) => s.end_pos))
    if (!Number.isSafeInteger(units) || units <= 0 || units > 2147483647 || (!conversion && units < maxPosition)) {
      setError(conversion ? 'Indica un total de páginas válido.' : `El total debe ser igual o mayor que ${maxPosition}.`)
      return
    }
    const dropped = conversion ? collapsedSessionCount(ownSessions, reading.total_units, units) : 0
    if (conversion && !window.confirm(`¿Convertir de ${reading.unit === 'pages' ? 'páginas a porcentaje' : 'porcentaje a páginas'}?\n\nSe convertirán proporcionalmente tu posición y las ${ownSessions.length} sesiones, usando ${reading.total_units} → ${units}. Las fechas y minutos no cambian.\n\n${dropped} sesiones quedarían sin avance al redondear y se eliminarán (también sus minutos y reacciones).${dropped ? ' Confirma solo si estás de acuerdo con perder esas sesiones.' : ''}`)) return
    setBusy(true)
    setError('')
    try {
      // Recheck durable operations immediately before any online edit.
      if (!navigator.onLine || await offlineDb.pendingOps.filter((op) => op.payload.session.user_id === reading.user_id).count() > 0) {
        setError('Conéctate y sincroniza las sesiones pendientes antes de editar.')
        return
      }
      if (changed) {
        const { error: rpcError } = await supabase.rpc('edit_reading_units', {
          p_reading_id: reading.id, p_expected_updated_at: reading.updated_at,
          p_format: format, p_unit: unit, p_total: units,
          p_started_on: start || null, p_finished_on: finish || null, p_finished_precision: precision,
          p_drop_count: dropped,
        })
        if (rpcError) throw rpcError
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: qk.readings(reading.user_id) }),
          queryClient.invalidateQueries({ queryKey: qk.sessions(reading.user_id) }),
          queryClient.invalidateQueries({ queryKey: qk.reactions() }),
        ])
        onClose()
      } else if (await onSave({ started_on: start || null, finished_on: finish || null, finished_precision: precision, total_units: units })) onClose()
    } catch {
      toast('No se pudo editar la lectura. Actualiza los datos y vuelve a intentarlo.')
      await Promise.all([queryClient.invalidateQueries({ queryKey: qk.readings(reading.user_id) }), queryClient.invalidateQueries({ queryKey: qk.sessions(reading.user_id) })])
    } finally { setBusy(false) }
  }

  return <BottomSheet open onClose={() => { if (!busy) onClose() }} title="Editar lectura" dirty={changed || start !== (reading.started_on ?? '') || finish !== (reading.finished_on ?? '')}>
    <form className="space-y-4" noValidate onSubmit={(event) => { event.preventDefault(); void save() }}>
      <fieldset disabled={blocked} className="space-y-4">
        <Segmented aria-label="Formato" value={format} options={[{ value: 'paper', label: 'Papel' }, { value: 'ebook', label: 'Kindle' }]} onChange={(value) => { setFormat(value); if (value === 'paper') setUnit('pages') }} />
        {format === 'ebook' && <Segmented aria-label="Unidad" value={unit} options={[{ value: 'pages', label: 'Páginas' }, { value: 'percent', label: 'Porcentaje (%)' }]} onChange={setUnit} />}
        {unit === 'pages' && <label className="label">Total de páginas<input name="total" className="input mt-2" inputMode="numeric" value={total} onChange={(event) => setTotal(event.target.value)} required /></label>}
        {conversion && <p className="text-sm text-muted">Se adaptarán tu posición y todas las sesiones a la nueva unidad. Antes de guardar podrás confirmar el redondeo.</p>}
        <label className="label">Inicio<input name="start" className="input mt-2" type="date" max={todayISO()} value={start} onChange={(event) => setStart(event.target.value)} /></label>
        <label className="label">Fin<input name="finish" className="input mt-2" type="date" min={finishEdited || reading.finished_precision === 'day' ? start || undefined : undefined} max={todayISO()} value={finish} required={reading.status === 'finished'} onChange={(event) => { setFinish(event.target.value); setFinishEdited(true) }} /></label>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <button className="btn btn-primary w-full">{busy ? 'Guardando…' : 'Guardar cambios'}</button>
      </fieldset>
      {!online && <p className="text-sm text-muted">Sin conexión: no se puede editar.</p>}
      {pending > 0 && <p className="text-sm text-muted">Sincroniza las sesiones pendientes antes de editar.</p>}
      {sessions.isError && <button type="button" className="btn btn-secondary" onClick={() => void sessions.refetch()}>Reintentar cargar sesiones</button>}
    </form>
  </BottomSheet>
}
