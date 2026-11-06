import { useEffect, useState } from 'react'
import { addDays } from 'date-fns'
import { Link, useMatch } from 'react-router'
import { BottomSheet } from '@/components/BottomSheet'
import { Cover } from '@/components/Cover'
import { EmptyState } from '@/components/EmptyState'
import { Segmented } from '@/components/Segmented'
import { Stepper } from '@/components/Stepper'
import { toast } from '@/components/toast'
import { useMe } from '@/features/auth/me'
import { useReadings, useSessions } from '@/lib/data'
import { fromISODate, todayISO, toISODate } from '@/lib/dates'
import { currentStreak } from '@/lib/stats/streak'
import { formatUnitDelta, formatUnitValue, toHMM } from '@/lib/units'
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

type DateChoice = 'today' | 'yesterday' | 'other'

export function LogSessionSheet(props: Props) {
  const [mounted, setMounted] = useState(props.open)
  useEffect(() => {
    if (props.open) {
      setMounted(true)
      return
    }
    const timeout = window.setTimeout(() => setMounted(false), 350)
    return () => window.clearTimeout(timeout)
  }, [props.open])
  return mounted ? <SessionFlow {...props} /> : null
}

function SessionFlow({ open, onClose, reading: initial, initialDate, initialMinutes }: Props) {
  const { userId } = useMe()
  const readings = useReadings(userId)
  const sessions = useSessions(userId)
  const bookRoute = useMatch('/libro/:readingId')
  const choices = (readings.data ?? [])
    .filter((r) => r.status === 'reading' || r.status === 'want')
    .sort(
      (a, b) =>
        Number(b.status === 'reading') - Number(a.status === 'reading') || b.updated_at.localeCompare(a.updated_at),
    )
  const [selected, setSelected] = useState(initial?.id ?? null)
  const routeReading = !initial
    ? choices.find((choice) => choice.id === bookRoute?.params.readingId && choice.user_id === userId)
    : undefined
  const reading = selected
    ? (readings.data?.find((r) => r.id === selected) ?? (initial?.id === selected ? initial : undefined))
    : (routeReading ?? choices[0])
  const [position, setPosition] = useState<{ readingId: string; value: number } | null>(null)
  const end = reading && position?.readingId === reading.id ? position.value : (reading?.current_position ?? 0)
  const [minutes, setMinutes] = useState<number | null>(initialMinutes ?? null)
  const today = todayISO()
  const yesterday = toISODate(addDays(fromISODate(today), -1))
  const [date, setDate] = useState(initialDate ?? today)
  const [dateChoice, setDateChoice] = useState<DateChoice>(
    !initialDate || initialDate === today ? 'today' : initialDate === yesterday ? 'yesterday' : 'other',
  )
  const [picker, setPicker] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [finished, setFinished] = useState<ReadingWithBook | null>(null)
  const [closing, setClosing] = useState(false)
  const [finishReady, setFinishReady] = useState(false)
  useEffect(() => {
    if (!finished) return
    const timeout = window.setTimeout(() => setFinishReady(true), 330)
    return () => window.clearTimeout(timeout)
  }, [finished])

  function changePosition(value: number) {
    if (!reading) return
    setSelected(reading.id)
    setPosition({ readingId: reading.id, value })
    setError('')
  }

  async function save() {
    if (!reading || busy) return
    if (!Number.isInteger(end) || end <= reading.current_position) {
      setError(`Debe ser mayor que tu posición actual (${formatUnitValue(reading.unit, reading.current_position)})`)
      return
    }
    if (end > reading.total_units) {
      setError(`Este libro tiene ${formatUnitValue(reading.unit, reading.total_units)}`)
      return
    }
    if (!date || date > today) {
      setError('Elige una fecha que no sea futura')
      return
    }
    if (minutes !== null && (!Number.isInteger(minutes) || minutes <= 0)) {
      setError('Los minutos deben ser mayores que cero')
      return
    }
    setBusy(true)
    setError('')
    try {
      await logSession({ reading, readOn: date, endPos: end, minutes })
      const dates = new Set(sessions.data?.map((s) => s.read_on) ?? [])
      dates.add(date)
      const streak = currentStreak(dates, today)
      toast(`+${formatUnitDelta(reading.unit, end - reading.current_position)}`, `Racha de ${streak} días`)
      setClosing(true)
      if (end === reading.total_units) setFinished({ ...reading, current_position: end })
      else onClose()
    } catch (e) {
      toast('No se pudo registrar la sesión', e instanceof Error ? e.message : 'Inténtalo de nuevo')
    } finally {
      setBusy(false)
    }
  }

  const timeOptions = [null, 15, 30, 45, 60]
  if (initialMinutes && !timeOptions.includes(initialMinutes)) timeOptions.push(initialMinutes)
  const delta = end - (reading?.current_position ?? 0)
  return (
    <>
      <BottomSheet open={open && !closing} onClose={onClose}>
        {!reading ? (
          <div className="space-y-3 py-3">
            {readings.isPending ? (
              <p className="text-muted">Cargando libros…</p>
            ) : readings.isError ? (
              <p className="text-danger">No se pudieron cargar tus libros. Inténtalo al volver a conectarte.</p>
            ) : (
              <EmptyState title="¿Qué vas a leer?">
                <p>Añade un libro a tu biblioteca para registrar una sesión.</p>
                <Link className="btn btn-primary mt-3" to="/biblioteca/buscar" onClick={onClose}>
                  Buscar un libro
                </Link>
              </EmptyState>
            )}
          </div>
        ) : (
          <form
            className="space-y-4 pt-2"
            aria-label="Registrar sesión"
            onSubmit={(event) => {
              event.preventDefault()
              void save()
            }}
          >
            <div className="flex items-center gap-3">
              <Cover book={reading.book} width={44} />
              <div className="min-w-0 flex-1">
                <h2 className="line-clamp-2 font-serif text-xl font-semibold leading-tight">{reading.book.title}</h2>
                <p className="mt-1 text-xs text-muted">
                  Vas por {formatUnitValue(reading.unit, reading.current_position)}
                </p>
              </div>
              <button type="button" className="btn btn-secondary px-3 text-sm" onClick={() => setPicker(!picker)}>
                {picker ? 'Cerrar' : 'Cambiar'}
              </button>
            </div>
            {picker && (
              <div className="max-h-40 space-y-1 overflow-y-auto" aria-label="Elegir libro">
                {choices.map((choice) => (
                  <button
                    type="button"
                    key={choice.id}
                    className="flex min-h-11 w-full items-center gap-3 rounded-xl px-2 text-left text-sm hover:bg-soft"
                    onClick={() => {
                      setSelected(choice.id)
                      setPosition(null)
                      setPicker(false)
                      setError('')
                    }}
                  >
                    <Cover book={choice.book} width={26} />
                    <span className="line-clamp-2">{choice.book.title}</span>
                  </button>
                ))}
              </div>
            )}
            <section className="space-y-3" aria-label="Posición alcanzada">
              <h3 className="lbl">He llegado a</h3>
              <Stepper
                value={end}
                onChange={changePosition}
                step={1}
                min={reading.current_position}
                max={reading.total_units}
                display={reading.unit === 'minutes' ? toHMM(end) : `p. ${end}`}
                caption={`+${formatUnitDelta(reading.unit, delta)} · ${Math.round((end / reading.total_units) * 100)} %`}
                label="He llegado a"
              />
              <input
                type="range"
                className="h-7 w-full cursor-pointer accent-accent"
                min={reading.current_position}
                max={reading.total_units}
                step={1}
                value={end}
                onChange={(event) => changePosition(Number(event.target.value))}
                aria-label={reading.unit === 'minutes' ? 'Minuto alcanzado' : 'Página alcanzada'}
                aria-valuetext={formatUnitValue(reading.unit, end)}
              />
              <div className="flex flex-wrap gap-1.5">
                {(reading.unit === 'minutes' ? [5, 10, 15, 30] : [5, 10, 25, 50]).map((amount) => (
                  <button
                    type="button"
                    className="chip px-3"
                    key={amount}
                    onClick={() => changePosition(Math.min(reading.total_units, end + amount))}
                    disabled={end >= reading.total_units}
                  >
                    +{amount}
                    {reading.unit === 'minutes' ? ' min' : ''}
                  </button>
                ))}
                <button type="button" className="chip px-3" onClick={() => changePosition(reading.total_units)}>
                  Lo terminé
                </button>
              </div>
            </section>
            <section className="space-y-2" aria-label="Tiempo leyendo">
              <h3 className="lbl">Tiempo leyendo</h3>
              <div className="flex flex-wrap gap-1.5">
                {timeOptions.map((value) => (
                  <button
                    type="button"
                    key={value ?? 'none'}
                    className="chip px-3"
                    aria-pressed={minutes === value}
                    aria-label={value === null ? 'Sin tiempo registrado' : undefined}
                    onClick={() => setMinutes(value)}
                  >
                    {value === null ? '—' : value === 60 ? '1 h' : `${value} min`}
                  </button>
                ))}
              </div>
            </section>
            <section className="space-y-2" aria-label="Fecha de lectura">
              <h3 className="lbl">Cuándo</h3>
              <Segmented<DateChoice>
                options={[
                  { value: 'today', label: 'Hoy' },
                  { value: 'yesterday', label: 'Ayer' },
                  { value: 'other', label: 'Otro día' },
                ]}
                value={dateChoice}
                onChange={(choice) => {
                  setDateChoice(choice)
                  if (choice !== 'other') setDate(choice === 'today' ? today : yesterday)
                }}
                aria-label="Cuándo has leído"
              />
              {dateChoice === 'other' && (
                <input
                  className="input"
                  type="date"
                  max={today}
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  required
                  aria-label="Fecha de la sesión"
                />
              )}
            </section>
            {error && (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            )}
            <button className="btn btn-primary w-full" disabled={busy || end <= reading.current_position}>
              {busy ? 'Guardando…' : 'Guardar sesión'}
            </button>
          </form>
        )}
      </BottomSheet>
      {finished && finishReady && <FinishSheet reading={finished} readOn={date} onClose={onClose} />}
    </>
  )
}
