import { useState, type SubmitEvent } from 'react'
import { useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { BookOpen, Headphones } from 'lucide-react'
import { BottomSheet } from '@/components/BottomSheet'
import { Cover } from '@/components/Cover'
import { Segmented } from '@/components/Segmented'
import { Stepper } from '@/components/Stepper'
import { toast } from '@/components/toast'
import { useMe } from '@/features/auth/me'
import { qk } from '@/lib/data'
import type { BookCandidate, Format } from '@/lib/types'
import { parseHMM, toHMM } from '@/lib/units'
import { addReading, AlreadyInLibrary } from './addReading'

export function AddReadingSheet({ candidate, onClose }: { candidate: BookCandidate | null; onClose: () => void }) {
  return (
    <BottomSheet open={!!candidate} onClose={onClose} title="Añadir a la estantería">
      {candidate && (
        <ReadingForm
          key={`${candidate.google_id}:${candidate.openlibrary_key}:${candidate.title}`}
          candidate={candidate}
        />
      )}
    </BottomSheet>
  )
}

function ReadingForm({ candidate }: { candidate: BookCandidate }) {
  const { userId } = useMe()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [format, setFormat] = useState<Format>('paper')
  const [pages, setPages] = useState(candidate.page_count ?? 0)
  const [duration, setDuration] = useState<number | null>(null)
  const [customDuration, setCustomDuration] = useState(false)
  const [durationInput, setDurationInput] = useState('')
  const [status, setStatus] = useState<'want' | 'reading'>('want')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [totalError, setTotalError] = useState('')
  const source = candidate.google_id ? 'Google Books' : candidate.openlibrary_key ? 'Open Library' : null
  const audioDuration = customDuration ? parseHMM(durationInput) : duration

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const total = format === 'paper' ? pages : audioDuration
    if (!total || !Number.isSafeInteger(total) || total < 1 || total > 2147483647) {
      setTotalError(
        format === 'audio'
          ? 'Introduce una duración válida (h:mm), por ejemplo 9:30.'
          : 'Indica cuántas páginas tiene el libro.',
      )
      const target =
        event.currentTarget.querySelector<HTMLElement>(
          format === 'audio' ? '[name="duration"]' : '#reading-total button',
        ) ?? event.currentTarget.querySelector<HTMLElement>('#reading-total [aria-hidden="false"] button')
      target?.focus()
      return
    }
    setBusy(true)
    setError('')
    setTotalError('')
    try {
      const id = await addReading({ userId, candidate, format, total, status })
      await qc.invalidateQueries({ queryKey: qk.readings(userId) })
      toast('Añadido a tu estantería')
      navigate(`/libro/${id}`)
    } catch (cause) {
      if (cause instanceof AlreadyInLibrary) {
        toast(cause.message)
        navigate(`/libro/${cause.readingId}`)
        return
      }
      setError('No se pudo añadir el libro. Comprueba tu conexión e inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  function updateDuration(value: number) {
    setDuration(value)
    setDurationInput(toHMM(value))
  }

  return (
    <form onSubmit={submit} className="space-y-6" autoComplete="off" noValidate>
      <div className="flex items-start gap-4 border-b border-rule pb-5">
        <Cover book={candidate} width={72} />
        <div className="min-w-0 pt-0.5">
          <h2 className="title line-clamp-3 [overflow-wrap:anywhere]">{candidate.title}</h2>
          <p className="mt-1 text-sm text-muted">
            {[candidate.authors.join(', ') || 'Autor desconocido', candidate.published_year]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {source && <p className="mt-1 text-xs text-muted">Datos de {source}</p>}
        </div>
      </div>
      <fieldset>
        <legend className="lbl mb-2">¿Cómo lo vas a leer?</legend>
        <div className="grid grid-cols-2 gap-2.5">
          {(
            [
              { value: 'paper', label: 'Papel', caption: 'Por páginas', Icon: BookOpen },
              { value: 'audio', label: 'Audiolibro', caption: 'Por tiempo', Icon: Headphones },
            ] as const
          ).map(({ value, label, caption, Icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={format === value}
              onClick={() => setFormat(value)}
              className={`flex min-h-24 flex-col items-start gap-2 rounded-md border p-3 text-left transition-colors duration-150 ${
                format === value ? 'border-accent bg-soft' : 'border-rule bg-transparent'
              }`}
            >
              <Icon size={24} className={format === value ? 'text-accent' : 'text-muted'} />
              <span className="font-semibold">{label}</span>
              <span className="text-xs text-muted">{caption}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <div
        id="reading-total"
        className="grid"
        role="group"
        aria-label={format === 'paper' ? 'Total de páginas' : 'Duración total'}
        aria-describedby={totalError ? 'reading-total-error' : undefined}
      >
        {(['paper', 'audio'] as const).map((fieldFormat) => {
          const active = format === fieldFormat
          return (
            <div
              key={fieldFormat}
              aria-hidden={!active}
              inert={!active}
              className="col-start-1 row-start-1 transition-[opacity,transform] duration-300 [transition-timing-function:var(--ease)]"
              style={{ opacity: active ? 1 : 0, transform: active ? 'translateY(0)' : 'translateY(8px)' }}
            >
              <p className="lbl mb-2">{fieldFormat === 'paper' ? 'Páginas' : 'Duración'}</p>
              {fieldFormat === 'paper' ? (
                <Stepper
                  editable
                  editLabel="Escribir las páginas"
                  value={pages}
                  onChange={setPages}
                  step={10}
                  min={0}
                  max={2147483647}
                  display={pages}
                  caption={candidate.page_count && source ? 'detectadas automáticamente' : 'páginas del libro'}
                  label="Número de páginas"
                />
              ) : duration !== null ? (
                <Stepper
                  editable
                  editLabel="Escribir la duración"
                  parse={parseHMM}
                  format={toHMM}
                  inputMode="text"
                  value={duration}
                  onChange={updateDuration}
                  step={15}
                  min={0}
                  max={2147483647}
                  display={toHMM(duration)}
                  caption="horas y minutos"
                  label="Duración del audiolibro"
                />
              ) : null}
            </div>
          )
        })}
      </div>
      {format === 'paper' && totalError && (
        <p id="reading-total-error" role="alert" className="text-sm text-danger">
          {totalError}
        </p>
      )}
      {format === 'audio' && (
        <div className="flex flex-wrap items-center gap-2">
          {[6, 8, 10, 12, 15].map((hours) => (
            <button
              key={hours}
              type="button"
              className="chip min-h-11"
              aria-pressed={!customDuration && duration === hours * 60}
              onClick={() => {
                updateDuration(hours * 60)
                setCustomDuration(false)
              }}
            >
              {hours} h
            </button>
          ))}
          <button
            type="button"
            className="chip min-h-11"
            aria-pressed={customDuration}
            aria-expanded={customDuration}
            onClick={() => {
              if (!customDuration) setDurationInput(duration === null ? '' : toHMM(duration))
              setCustomDuration(!customDuration)
            }}
          >
            Otra…
          </button>
          {(customDuration || duration === null) && (
            <label className="w-full">
              <span className="sr-only">Duración total (h:mm)</span>
              <input
                className="input"
                name="duration"
                autoComplete="off"
                inputMode="text"
                placeholder="p. ej. 9:30…"
                aria-invalid={!!totalError}
                aria-describedby={totalError ? 'reading-total-error' : undefined}
                value={durationInput}
                onChange={(event) => {
                  setDurationInput(event.target.value)
                  setCustomDuration(true)
                  const parsed = parseHMM(event.target.value)
                  setDuration(parsed)
                }}
              />
            </label>
          )}
          {totalError && (
            <p id="reading-total-error" role="alert" className="w-full text-sm text-danger">
              {totalError}
            </p>
          )}
        </div>
      )}
      <div>
        <p className="lbl mb-2">Estado</p>
        <Segmented
          options={[
            { value: 'want', label: 'Pendientes' },
            { value: 'reading', label: 'Empiezo hoy' },
          ]}
          value={status}
          onChange={setStatus}
          aria-label="Estado inicial"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <button className="btn btn-primary w-full" disabled={busy}>
        {busy ? 'Añadiendo…' : 'Añadir a la estantería'}
      </button>
    </form>
  )
}
