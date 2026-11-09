import { useState, type SubmitEvent } from 'react'
import { useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { BookOpen, Tablet } from 'lucide-react'
import { BottomSheet } from '@/components/BottomSheet'
import { Cover } from '@/components/Cover'
import { Segmented } from '@/components/Segmented'
import { Stepper } from '@/components/Stepper'
import { Stars } from '@/components/Stars'
import { MoodChips } from '@/components/MoodChips'
import { toast } from '@/components/toast'
import { useMe } from '@/features/auth/me'
import { upsertBook } from '@/lib/books/search'
import { qk } from '@/lib/data'
import { todayISO } from '@/lib/dates'
import { supabase } from '@/lib/supabase'
import type { Book, BookCandidate, Format, Reading, Unit } from '@/lib/types'
import { formatFinished } from '@/lib/units'
import { useOnline } from '@/features/session/useOnline'

interface Props {
  candidate: BookCandidate | null
  onClose: () => void
  onBackfilled?: () => void
  existingBook?: Book
  onAdded?: (readingId: string) => Promise<void>
  pendingOnly?: boolean
}

const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export function AddReadingSheet({ candidate, onClose, onBackfilled, existingBook, onAdded, pendingOnly }: Props) {
  return (
    <BottomSheet open={!!candidate} onClose={onClose} title="Añadir a la biblioteca">
      {candidate && (
        <ReadingForm
          key={`${candidate.google_id}:${candidate.openlibrary_key}:${candidate.title}`}
          candidate={candidate}
          onClose={onClose}
          onBackfilled={onBackfilled}
          existingBook={existingBook}
          onAdded={onAdded}
          pendingOnly={pendingOnly}
        />
      )}
    </BottomSheet>
  )
}

function ReadingForm({ candidate, onClose, onBackfilled, existingBook, onAdded, pendingOnly }: Props & { candidate: BookCandidate }) {
  const { userId } = useMe()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [format, setFormat] = useState<Format>('paper')
  const [pages, setPages] = useState(candidate.page_count ?? 0)
  const [kindleUnit, setKindleUnit] = useState<Unit>('pages')
  const [status, setStatus] = useState<'want' | 'reading' | 'finished'>('want')
  const today = todayISO()
  const currentYear = Number(today.slice(0, 4))
  const [year, setYear] = useState(currentYear)
  const [month, setMonth] = useState('')
  const [startedOn, setStartedOn] = useState('')
  const [rating, setRating] = useState<number | null>(null)
  const [moods, setMoods] = useState<string[]>([])
  const [duplicate, setDuplicate] = useState<Pick<Reading, 'id' | 'finished_on' | 'finished_precision'> | null>(null)
  const online = useOnline()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [totalError, setTotalError] = useState('')
  const unit: Unit = format === 'paper' ? 'pages' : kindleUnit
  const source = candidate.google_id ? 'Google Books' : candidate.openlibrary_key ? 'Open Library' : null

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    void save()
  }

  async function save(allowDuplicate = false) {
    if (busy || !online) return
    const total = unit === 'percent' ? 100 : pages
    if (!total || !Number.isSafeInteger(total) || total < 1 || total > 2147483647) {
      setTotalError('Indica cuántas páginas tiene el libro.')
      setDuplicate(null)
      return
    }
    if (status === 'finished') {
      if (!Number.isInteger(year) || year < 1950 || year > currentYear || (month && `${year}-${month}` > today.slice(0, 7))) {
        setError('Elige un año y un mes que no estén en el futuro.')
        return
      }
      if (startedOn && (!/^\d{4}-\d{2}-\d{2}$/.test(startedOn) || startedOn > `${year}-${month || '01'}-01` || startedOn > today)) {
        setError('La fecha de inicio no puede ser posterior a la de fin ni estar en el futuro.')
        return
      }
    }
    setBusy(true)
    setError('')
    setTotalError('')
    try {
      const book = existingBook ?? await upsertBook(candidate)
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
        if (onAdded) await onAdded(active[0].id)
        navigate(`/libro/${active[0].id}`)
        return
      }
      const { data: finished, error: finishedError } = await supabase
        .from('readings')
        .select('id, finished_on, finished_precision')
        .eq('user_id', userId)
        .eq('book_id', book.id)
        .eq('status', 'finished')
        .order('finished_on', { ascending: false, nullsFirst: false })
        .limit(1)
      if (finishedError) throw finishedError
      if (finished?.[0] && !allowDuplicate) {
        setDuplicate(finished[0] as Pick<Reading, 'id' | 'finished_on' | 'finished_precision'>)
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
          current_position: status === 'finished' ? total : 0,
          started_on: status === 'finished' ? startedOn || null : status === 'reading' ? today : null,
          finished_on: status === 'finished' ? `${year}-${month || '01'}-01` : null,
          finished_precision: status === 'finished' ? month ? 'month' : 'year' : null,
          backfilled: status === 'finished',
          rating: status === 'finished' ? rating : null,
          moods: status === 'finished' ? moods : [],
        })
        .select('id')
        .single()
      if (insertError) throw insertError
      await qc.invalidateQueries({ queryKey: qk.readings(userId) })
      if (onAdded) await onAdded(data.id)
      if (status === 'finished') {
        toast('Añadido a Leídos')
        onClose()
        if (onBackfilled) onBackfilled()
        else navigate(`/libro/${data.id}`)
      } else {
        toast('Añadido a tu biblioteca')
        navigate(`/libro/${data.id}`)
      }
    } catch {
      setError('No se pudo añadir el libro. Comprueba tu conexión e inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
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
              { value: 'ebook', label: 'Kindle', caption: 'Por porcentaje o páginas', Icon: Tablet },
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
      {format === 'ebook' && (
        <fieldset>
          <legend className="lbl mb-2">Progreso en Kindle</legend>
          <div className="flex gap-2">
            {(['pages', 'percent'] as const).map((value) => (
              <button
                key={value}
                type="button"
                className="chip min-h-11"
                aria-pressed={kindleUnit === value}
                onClick={() => setKindleUnit(value)}
              >
                {value === 'percent' ? '%' : 'Páginas'}
              </button>
            ))}
          </div>
          {kindleUnit === 'pages' && !candidate.page_count && (
            <p className="mt-2 text-sm text-muted">Escribe las páginas que marca tu Kindle para este libro.</p>
          )}
        </fieldset>
      )}
      {unit === 'pages' && (
        <div id="reading-total" role="group" aria-label="Total de páginas" aria-describedby={totalError ? 'reading-total-error' : undefined}>
          <p className="lbl mb-2">Páginas</p>
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
          {totalError && <p id="reading-total-error" role="alert" className="text-sm text-danger">{totalError}</p>}
        </div>
      )}
      {!pendingOnly && <div>
        <p className="lbl mb-2">Estado</p>
        <Segmented
          options={[
            { value: 'want', label: 'Pendientes' },
            { value: 'reading', label: 'Empiezo hoy' },
            { value: 'finished', label: 'Ya leído' },
          ]}
          value={status}
          onChange={setStatus}
          aria-label="Estado inicial"
        />
      </div>}
      {status === 'finished' && (
        <div className="space-y-5">
          <fieldset className="grid grid-cols-2 gap-3">
            <legend className="lbl mb-2">¿Cuándo lo terminaste?</legend>
            <label className="space-y-2">
              <span className="lbl">Año · obligatorio</span>
              <select className="input w-full" required value={year} onChange={(event) => setYear(Number(event.target.value))}>
                {Array.from({ length: currentYear - 1950 + 1 }, (_, index) => currentYear - index).map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="lbl">Mes · opcional</span>
              <select className="input w-full" value={month} onChange={(event) => setMonth(event.target.value)}>
                <option value="">Sin mes</option>
                {months.map((name, index) => (
                  <option key={name} value={String(index + 1).padStart(2, '0')} disabled={year === currentYear && index + 1 > Number(today.slice(5, 7))}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>
          <label className="block space-y-2">
            <span className="lbl">Fecha de inicio · opcional</span>
            <input className="input w-full" type="date" max={today} value={startedOn} onChange={(event) => setStartedOn(event.target.value)} />
          </label>
          <section aria-label="Valoración del libro">
            <h3 className="lbl mb-2">¿Qué te ha parecido? · opcional</h3>
            <Stars value={rating} onChange={setRating} />
            {rating !== null && <button type="button" className="btn btn-link" onClick={() => setRating(null)}>Quitar valoración</button>}
          </section>
          <section aria-label="Ánimos de la lectura">
            <h3 className="lbl mb-2">Cómo te hizo sentir · hasta 3 · opcional</h3>
            <MoodChips value={moods} onChange={setMoods} />
          </section>
        </div>
      )}
      {duplicate && (
        <div role="status" className="space-y-3 rounded-md border border-rule p-4">
          <p>Ya lo leíste en {duplicate.finished_on ? formatFinished(duplicate.finished_on, duplicate.finished_precision) : 'una fecha sin registrar'}. ¿Añadir otra lectura?</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" disabled={busy || !online} onClick={() => void save(true)}>Añadir</button>
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => { onClose(); navigate(`/libro/${duplicate.id}`) }}>Abrir la existente</button>
          </div>
        </div>
      )}
      {!online && <p className="text-sm text-muted">Sin conexión. Conéctate para añadir el libro.</p>}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {!duplicate && <button className="btn btn-primary w-full" disabled={busy || !online}>
        {busy ? 'Añadiendo…' : 'Añadir a la biblioteca'}
      </button>}
    </form>
  )
}
