import { useState } from 'react'
import { useMe } from '@/features/auth/me'
import { qk, useSessions } from '@/lib/data'
import { queryClient } from '@/lib/queryClient'
import { supabase } from '@/lib/supabase'
import type { ReadingWithBook, Session } from '@/lib/types'
import { todayISO } from '@/lib/dates'
import { formatUnitValue } from '@/lib/units'
import { BottomSheet } from '@/components/BottomSheet'
import { toast } from '@/components/toast'
import { useOnline } from '@/features/session/useOnline'
import { usePendingSessionCount } from '@/lib/offline/sessionQueue'

export function SessionEditor({
  reading,
  session,
  onClose,
}: {
  reading: ReadingWithBook
  session: Session
  onClose: () => void
}) {
  const [end, setEnd] = useState(String(session.end_pos))
  const [date, setDate] = useState(session.read_on)
  const [minutes, setMinutes] = useState(session.minutes === null ? '' : String(session.minutes))
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const online = useOnline()
  const { userId } = useMe()
  const pending = usePendingSessionCount()
  const sessions = useSessions(reading.user_id)
  const newest = sessions.data
    ?.filter((item) => item.reading_id === reading.id)
    .reduce<Session | undefined>(
      (latest, item) => (!latest || item.created_at > latest.created_at ? item : latest),
      undefined,
    )
  const disabled = !online || busy || pending > 0 || reading.user_id !== userId || newest?.id !== session.id
  async function save(remove: boolean) {
    if (disabled) return
    const endPos = /^\d+$/.test(end) ? Number(end) : null
    const next: Record<string, string> = {}
    if (!remove) {
      if (
        endPos === null ||
        !Number.isSafeInteger(endPos) ||
        endPos <= session.start_pos ||
        endPos > reading.total_units
      ) {
        next.end = `Indica una posición mayor que ${formatUnitValue(reading.unit, session.start_pos)} y no superior a ${formatUnitValue(reading.unit, reading.total_units)}.`
      }
      if (!date || date > todayISO()) next.date = 'Elige una fecha no posterior a hoy.'
      if (
        minutes !== '' &&
        (!/^\d+$/.test(minutes) || !Number.isSafeInteger(Number(minutes)) || Number(minutes) <= 0)
      ) {
        next.minutes = 'Indica un número entero de minutos mayor que cero.'
      }
    }
    setErrors(next)
    const first = Object.keys(next)[0]
    if (first) {
      document.getElementById(`session-${first}`)?.focus()
      return
    }
    if (remove && !window.confirm('¿Borrar la última sesión y restaurar la posición anterior?')) return
    setBusy(true)
    const position = remove ? session.start_pos : endPos!
    try {
      const { error: readingError } = await supabase
        .from('readings')
        .update({
          current_position: position,
          ...(reading.status === 'finished' && position < reading.total_units
            ? { status: 'reading', finished_on: null, finished_precision: null, backfilled: false }
            : {}),
        })
        .eq('id', reading.id)
        .eq('user_id', reading.user_id)
      if (readingError) throw readingError
      const result = remove
        ? await supabase.from('sessions').delete().eq('id', session.id).eq('user_id', reading.user_id)
        : await supabase
            .from('sessions')
            .update({ end_pos: endPos, read_on: date, minutes: minutes ? Number(minutes) : null })
            .eq('id', session.id)
            .eq('user_id', reading.user_id)
      if (result.error) {
        await supabase
          .from('readings')
          .update({
            current_position: reading.current_position,
            status: reading.status,
            finished_on: reading.finished_on,
            finished_precision: reading.finished_precision,
            backfilled: reading.backfilled,
          })
          .eq('id', reading.id)
          .eq('user_id', reading.user_id)
        throw result.error
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.readings(reading.user_id) }),
        queryClient.invalidateQueries({ queryKey: qk.sessions(reading.user_id) }),
      ])
      onClose()
    } catch {
      toast('No se pudo actualizar la sesión')
    } finally {
      setBusy(false)
    }
  }
  return (
    <BottomSheet
      open
      onClose={onClose}
      title="Editar última sesión"
      dirty={
        end !== String(session.end_pos) ||
        date !== session.read_on ||
        minutes !== (session.minutes === null ? '' : String(session.minutes))
      }
    >
      <form
        noValidate
        autoComplete="off"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void save(false)
        }}
      >
        <label className="label">
          {reading.unit === 'percent' ? 'He llegado al … %' : 'He llegado a…'}
          <input
            id="session-end"
            name="end"
            className="input mt-2"
            inputMode="numeric"
            type="number"
            min={session.start_pos + 1}
            max={reading.total_units}
            step={1}
            placeholder={reading.unit === 'percent' ? 'p. ej. 45…' : 'p. ej. 72…'}
            value={end}
            aria-invalid={!!errors.end}
            aria-describedby={errors.end ? 'session-end-error' : undefined}
            onChange={(e) => setEnd(e.target.value)}
            required
          />
          {errors.end && (
            <span id="session-end-error" role="alert" className="mt-2 block text-sm text-danger">
              {errors.end}
            </span>
          )}
        </label>
        <label className="label">
          Fecha
          <input
            className="input mt-2"
            id="session-date"
            name="date"
            aria-invalid={!!errors.date}
            aria-describedby={errors.date ? 'session-date-error' : undefined}
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          {errors.date && (
            <span id="session-date-error" role="alert" className="mt-2 block text-sm text-danger">
              {errors.date}
            </span>
          )}
        </label>
        <label className="label">
          Minutos (opcional)
          <input
            className="input mt-2"
            id="session-minutes"
            name="minutes"
            aria-invalid={!!errors.minutes}
            aria-describedby={errors.minutes ? 'session-minutes-error' : undefined}
            type="number"
            min="1"
            step="1"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
          {errors.minutes && (
            <span id="session-minutes-error" role="alert" className="mt-2 block text-sm text-danger">
              {errors.minutes}
            </span>
          )}
        </label>
        {!online && <p className="text-muted">Sin conexión</p>}
        <button className="btn btn-primary w-full" disabled={disabled}>
          {busy ? 'Guardando…' : 'Guardar cambios'}
        </button>
        <button
          type="button"
          className="btn btn-ghost text-danger w-full"
          disabled={disabled}
          onClick={() => void save(true)}
        >
          Borrar sesión
        </button>
      </form>
    </BottomSheet>
  )
}
