import { useEffect, useRef, useState } from 'react'
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
import { formatDays, formatUnitDelta, formatUnitValue, parseHMM, toHMM } from '@/lib/units'
import type { ReadingWithBook } from '@/lib/types'
import { logSession } from '@/lib/offline/sessionQueue'
import { FinishSheet } from './FinishSheet'
import { TraceComposer } from '@/features/us/TraceSheet'
import { useOnline } from './useOnline'
import { recentReadings } from '@/features/today/recentReadings'

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
  const { userId, partner } = useMe()
  const online = useOnline()
  const readings = useReadings(userId)
  const sessions = useSessions(userId)
  const bookRoute = useMatch('/libro/:readingId')
  const ordered = recentReadings(readings.data ?? [], sessions.data ?? [])
  const choices = [...ordered.filter((r) => r.status === 'reading'), ...ordered.filter((r) => r.status === 'want')]
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
  const [errorField, setErrorField] = useState<'position' | 'date' | 'minutes' | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [showTrace, setShowTrace] = useState(false)
  const [traceDirty, setTraceDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [finished, setFinished] = useState<ReadingWithBook | null>(null)
  const [closing, setClosing] = useState(false)
  const [finishReady, setFinishReady] = useState(false)
  const [saved, setSaved] = useState<{ reading: ReadingWithBook; label: string } | null>(null)
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
    setErrorField(null)
  }

  function invalid(field: 'position' | 'date' | 'minutes', message: string) {
    setErrorField(field)
    setError(message)
    requestAnimationFrame(() => {
      formRef.current?.querySelector<HTMLElement>(`[data-field="${field}"], #session-${field}`)?.focus()
    })
  }

  async function save() {
    if (!reading || busy) return
    if (!Number.isInteger(end) || end <= reading.current_position) {
      invalid(
        'position',
        `Debe ser mayor que tu posición actual (${formatUnitValue(reading.unit, reading.current_position)})`,
      )
      return
    }
    if (end > reading.total_units) {
      invalid('position', `Este libro tiene ${formatUnitValue(reading.unit, reading.total_units)}`)
      return
    }
    if (!date || date > today) {
      invalid('date', 'Elige una fecha que no sea futura')
      return
    }
    if (minutes !== null && (!Number.isInteger(minutes) || minutes <= 0)) {
      invalid('minutes', 'Los minutos deben ser mayores que cero')
      return
    }
    setBusy(true)
    setError('')
    try {
      await logSession({ reading, readOn: date, endPos: end, minutes })
      const dates = new Set(sessions.data?.map((s) => s.read_on) ?? [])
      dates.add(date)
      const streak = currentStreak(dates, today)
      const label = `+${formatUnitDelta(reading.unit, end - reading.current_position)}`
      setSaved({
        reading: { ...reading, current_position: end },
        label: `${label} · racha de ${formatDays(streak)}`,
      })
      if (end === reading.total_units) {
        setClosing(true)
        setFinished({ ...reading, current_position: end })
      }
    } catch (e) {
      toast('No se pudo registrar la sesión', e instanceof Error ? e.message : 'Inténtalo de nuevo')
    } finally {
      setBusy(false)
    }
  }

  const timeOptions = [null, 15, 30, 45, 60]
  if (initialMinutes && !timeOptions.includes(initialMinutes)) timeOptions.push(initialMinutes)
  const delta = end - (reading?.current_position ?? 0)
  const activeChoices = choices.filter((choice) => choice.status === 'reading')
  const compactPicker = !initial && !routeReading && activeChoices.length > 1 && activeChoices.length <= 3
  return (
    <>
      <BottomSheet
        open={open && !closing}
        onClose={onClose}
        title={saved ? undefined : 'Registrar lectura'}
        aria-label={saved ? 'Sesión guardada' : undefined}
        dirty={
          saved
            ? traceDirty
            : !!reading &&
              (end !== reading.current_position ||
                minutes !== (initialMinutes ?? null) ||
                date !== (initialDate ?? today))
        }
      >
        {saved ? (
          <div className="space-y-5 py-4">
            <div role="status" className="border-b border-rule pb-5">
              <h2 className="display text-accent">
                Sesión
                <br />
                <span className="display-italic">guardada</span>
              </h2>
              <p className="folio mt-4 text-muted">{saved.label}</p>
            </div>
            <button
              className="btn btn-primary w-full"
              onClick={() => {
                if (!traceDirty || window.confirm('¿Descartar la huella que has escrito?')) onClose()
              }}
            >
              Listo
            </button>
            {partner && online && (
              <button
                type="button"
                className="btn btn-link w-full"
                aria-expanded={showTrace}
                onClick={() => {
                  if (!traceDirty || window.confirm('¿Descartar la huella que has escrito?')) setShowTrace(!showTrace)
                }}
              >
                {showTrace ? 'Cerrar huella' : `Dejarle algo a ${partner.display_name}`}
              </button>
            )}
            {showTrace && (
              <TraceComposer
                reading={saved.reading}
                prefill={{ page: saved.reading.unit === 'pages' ? saved.reading.current_position : null }}
                onClose={onClose}
                onDirtyChange={setTraceDirty}
              />
            )}
          </div>
        ) : !reading ? (
          <div className="space-y-3 py-3">
            {readings.isPending ? (
              <p role="status" className="text-muted">
                Cargando libros…
              </p>
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
            ref={formRef}
            noValidate
            className="space-y-5 pt-2"
            aria-label="Registrar sesión"
            onSubmit={(event) => {
              event.preventDefault()
              void save()
            }}
          >
            {compactPicker && (
              <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Libro para esta sesión">
                {activeChoices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    className={`flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md border p-2 text-left text-xs ${
                      reading.id === choice.id ? 'border-accent bg-soft' : 'border-border'
                    }`}
                    aria-pressed={reading.id === choice.id}
                    onClick={() => {
                      setSelected(choice.id)
                      setPosition(null)
                      setError('')
                      setErrorField(null)
                    }}
                  >
                    <Cover book={choice.book} width={28} />
                    <span className="line-clamp-2">{choice.book.title}</span>
                  </button>
                ))}
              </div>
            )}
            {!compactPicker && (
              <div className="flex items-center gap-3">
                <Cover book={reading.book} width={48} />
                <div className="min-w-0 flex-1">
                  <h2 className="title line-clamp-2">{reading.book.title}</h2>
                  <p className="mt-1 text-xs text-muted">
                    Vas por {formatUnitValue(reading.unit, reading.current_position)}
                  </p>
                </div>
                <button type="button" className="btn btn-link px-3 text-sm" onClick={() => setPicker(!picker)}>
                  {picker ? 'Cerrar' : 'Cambiar'}
                </button>
              </div>
            )}
            {!compactPicker && picker && (
              <div className="max-h-40 space-y-1 overflow-y-auto" aria-label="Elegir libro">
                {choices.map((choice) => (
                  <button
                    type="button"
                    key={choice.id}
                    className="flex min-h-11 w-full items-center gap-3 rounded-md px-2 text-left text-sm hover:bg-soft"
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
            <section className="rule space-y-3 pt-4" aria-label="Posición alcanzada">
              <h3 className="eyebrow">He llegado a</h3>
              {compactPicker && (
                <p className="text-xs text-muted">Vas por {formatUnitValue(reading.unit, reading.current_position)}</p>
              )}
              <Stepper
                value={end}
                onChange={changePosition}
                step={1}
                min={reading.current_position}
                max={reading.total_units}
                display={reading.unit === 'minutes' ? toHMM(end) : `p. ${end}`}
                caption={`+${formatUnitDelta(reading.unit, delta)} · ${Math.round((end / reading.total_units) * 100)} %`}
                label="He llegado a"
                editable
                inputId="session-position"
                invalid={errorField === 'position'}
                describedBy={errorField === 'position' ? 'session-position-error' : undefined}
                editLabel={reading.unit === 'minutes' ? 'Escribir el tiempo alcanzado' : 'Escribir la página'}
                inputMode={reading.unit === 'minutes' ? 'text' : 'numeric'}
                parse={reading.unit === 'minutes' ? parseHMM : undefined}
                format={reading.unit === 'minutes' ? toHMM : undefined}
              />
              {reading.unit === 'minutes' && (
                <p className="text-center text-xs text-muted">Escribe h:mm o minutos, por ejemplo 9:30 o 570.</p>
              )}
              {errorField === 'position' && (
                <p id="session-position-error" role="alert" className="text-sm text-danger">
                  {error}
                </p>
              )}
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
                    className="chip min-h-11 px-3"
                    key={amount}
                    onClick={() => changePosition(Math.min(reading.total_units, end + amount))}
                    disabled={end >= reading.total_units}
                  >
                    +{amount}
                    {reading.unit === 'minutes' ? ' min' : ''}
                  </button>
                ))}
                <button
                  type="button"
                  className="chip min-h-11 px-3"
                  onClick={() => changePosition(reading.total_units)}
                >
                  Lo terminé
                </button>
              </div>
            </section>
            <section className="rule space-y-3 pt-4" aria-label="Tiempo leyendo">
              <h3 className="eyebrow">Tiempo leyendo</h3>
              <div className="flex flex-wrap gap-1.5">
                {timeOptions.map((value) => (
                  <button
                    type="button"
                    key={value ?? 'none'}
                    className="chip min-h-11 px-3"
                    aria-pressed={minutes === value}
                    aria-label={value === null ? 'Sin tiempo registrado' : undefined}
                    data-field="minutes"
                    onClick={() => setMinutes(value)}
                  >
                    {value === null ? '—' : value === 60 ? '1 h' : `${value} min`}
                  </button>
                ))}
              </div>
              {errorField === 'minutes' && (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              )}
            </section>
            <section className="rule space-y-3 pt-4" aria-label="Fecha de lectura">
              <h3 className="eyebrow">Cuándo</h3>
              <Segmented<DateChoice>
                options={[
                  { value: 'today', label: 'Hoy' },
                  { value: 'yesterday', label: 'Ayer' },
                  { value: 'other', label: 'Otro día' },
                ]}
                value={dateChoice}
                onChange={(choice) => {
                  setDateChoice(choice)
                  setError('')
                  setErrorField(null)
                  if (choice !== 'other') setDate(choice === 'today' ? today : yesterday)
                }}
                aria-label="Cuándo has leído"
              />
              {dateChoice === 'other' && (
                <input
                  className="input"
                  id="session-date"
                  name="read-on"
                  autoComplete="off"
                  aria-invalid={errorField === 'date'}
                  aria-describedby={errorField === 'date' ? 'session-date-error' : undefined}
                  type="date"
                  max={today}
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  required
                  aria-label="Fecha de la sesión"
                />
              )}
              {errorField === 'date' && (
                <p id="session-date-error" role="alert" className="text-sm text-danger">
                  {error}
                </p>
              )}
            </section>
            <button className="btn btn-primary w-full" disabled={busy} aria-busy={busy}>
              {busy ? 'Guardando…' : 'Guardar sesión'}
            </button>
          </form>
        )}
      </BottomSheet>
      {finished && finishReady && (
        <FinishSheet
          reading={finished}
          readOn={date}
          showToast={!saved}
          onClose={() => {
            setFinished(null)
            setFinishReady(false)
            if (saved) setClosing(false)
            else onClose()
          }}
        />
      )}
    </>
  )
}
