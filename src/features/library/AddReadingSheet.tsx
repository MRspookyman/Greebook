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
import { upsertBook } from '@/lib/books/search'
import { qk } from '@/lib/data'
import { todayISO } from '@/lib/dates'
import { supabase } from '@/lib/supabase'
import type { BookCandidate, Format, Unit } from '@/lib/types'
import { parseHMM, toHMM } from '@/lib/units'

export function AddReadingSheet({ candidate, onClose }: { candidate: BookCandidate | null; onClose: () => void }) {
  return (
    <BottomSheet open={!!candidate} onClose={onClose}>
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
  const unit: Unit = format === 'paper' ? 'pages' : 'minutes'
  const source = candidate.google_id ? 'Google Books' : candidate.openlibrary_key ? 'Open Library' : null
  const audioDuration = customDuration ? parseHMM(durationInput) : duration
  const validAudioDuration =
    audioDuration !== null && Number.isSafeInteger(audioDuration) && audioDuration > 0 && audioDuration <= 2147483647

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const total = format === 'paper' ? pages : audioDuration
    if (!total || !Number.isSafeInteger(total) || total < 1 || total > 2147483647) {
      setError(format === 'audio' ? 'Introduce una duración válida (h:mm)' : 'Indica cuántas páginas tiene el libro')
      return
    }
    setBusy(true)
    setError('')
    try {
      const book = await upsertBook(candidate)
      const { data: active, error: activeError } = await supabase
        .from('readings')
        .select('id')
        .eq('user_id', userId)
        .eq('book_id', book.id)
        .in('status', ['want', 'reading'])
        .limit(1)
      if (activeError) throw activeError
      if (active?.[0]) {
        toast('Ya lo tienes en tu biblioteca')
        navigate(`/libro/${active[0].id}`)
        return
      }
      const { data, error: insertError } = await supabase
        .from('readings')
        .insert({
          user_id: userId,
          book_id: book.id,
          format,
          unit,
          total_units: total,
          status,
          started_on: status === 'reading' ? todayISO() : null,
        })
        .select('id')
        .single()
      if (insertError) throw insertError
      await qc.invalidateQueries({ queryKey: qk.readings(userId) })
      toast('Añadido a tu biblioteca')
      navigate(`/libro/${data.id}`)
    } catch {
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
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-start gap-3">
        <Cover book={candidate} width={66} />
        <div className="min-w-0 pt-0.5">
          <h2 className="line-clamp-3 text-xl leading-tight">{candidate.title}</h2>
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
              className={`flex min-h-[108px] flex-col items-start gap-2 rounded-[18px] border p-3.5 text-left transition-[transform,background-color,border-color] duration-300 [transition-timing-function:var(--spring)] active:scale-95 ${
                format === value ? 'scale-[1.015] border-accent bg-soft' : 'border-border bg-surface'
              }`}
            >
              <Icon size={24} className={format === value ? 'text-accent' : 'text-muted'} />
              <span className="font-semibold">{label}</span>
              <span className="text-xs text-muted">{caption}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <div className="grid">
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
          {customDuration && (
            <label className="w-full">
              <span className="sr-only">Duración total (h:mm)</span>
              <input
                className="input"
                inputMode="numeric"
                placeholder="h:mm"
                value={durationInput}
                onChange={(event) => {
                  setDurationInput(event.target.value)
                  const parsed = parseHMM(event.target.value)
                  setDuration(parsed)
                }}
              />
            </label>
          )}
        </div>
      )}
      <div>
        <p className="lbl mb-2">Estado</p>
        <Segmented
          options={[
            { value: 'want', label: 'Pendiente' },
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
      <button className="btn btn-primary w-full" disabled={busy || (format === 'audio' && !validAudioDuration)}>
        {busy ? 'Añadiendo…' : 'Añadir a la biblioteca'}
      </button>
    </form>
  )
}
