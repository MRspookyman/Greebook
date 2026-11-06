import { useState, type SubmitEvent } from 'react'
import { useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { BottomSheet } from '@/components/BottomSheet'
import { Cover } from '@/components/Cover'
import { toast } from '@/components/toast'
import { useMe } from '@/features/auth/me'
import { upsertBook } from '@/lib/books/search'
import { qk } from '@/lib/data'
import { todayISO } from '@/lib/dates'
import { supabase } from '@/lib/supabase'
import type { BookCandidate, Format, Unit } from '@/lib/types'
import { parseHMM } from '@/lib/units'

export function AddReadingSheet({ candidate, onClose }: { candidate: BookCandidate | null; onClose: () => void }) {
  return (
    <BottomSheet open={!!candidate} onClose={onClose} title="Añadir a mi biblioteca">
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
  const [ebookUnit, setEbookUnit] = useState<Unit>(candidate.page_count ? 'pages' : 'percent')
  const [pages, setPages] = useState(candidate.page_count?.toString() ?? '')
  const [duration, setDuration] = useState('')
  const [status, setStatus] = useState<'want' | 'reading'>('want')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const unit: Unit = format === 'paper' ? 'pages' : format === 'audio' ? 'minutes' : ebookUnit

  async function submit(event: SubmitEvent) {
    event.preventDefault()
    if (busy) return
    const total = unit === 'percent' ? 100 : unit === 'minutes' ? parseHMM(duration) : Number(pages)
    if (!total || !Number.isSafeInteger(total) || total < 1) {
      setError(unit === 'minutes' ? 'Introduce una duración válida (h:mm)' : 'Introduce el número de páginas')
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
      navigate(`/libro/${data.id}`)
    } catch {
      setError('No se pudo añadir el libro. Comprueba tu conexión e inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex gap-4 items-center">
        <Cover book={candidate} width={64} />
        <div>
          <h2>{candidate.title}</h2>
          <p className="text-muted text-sm">{candidate.authors.join(', ')}</p>
        </div>
      </div>
      <label className="label">
        Formato
        <select className="input" value={format} onChange={(e) => setFormat(e.target.value as Format)}>
          <option value="paper">Papel</option>
          <option value="ebook">Ebook</option>
          <option value="audio">Audiolibro</option>
        </select>
      </label>
      {format === 'ebook' && (
        <label className="label">
          Unidad
          <select className="input" value={ebookUnit} onChange={(e) => setEbookUnit(e.target.value as Unit)}>
            <option value="pages">Páginas</option>
            <option value="percent">%</option>
          </select>
        </label>
      )}
      {unit === 'pages' && (
        <label className="label">
          Páginas totales
          <input
            className="input"
            type="number"
            min="1"
            step="1"
            required
            value={pages}
            onChange={(e) => setPages(e.target.value)}
          />
        </label>
      )}
      {unit === 'percent' && <p className="text-muted">Total: 100 %</p>}
      {unit === 'minutes' && (
        <label className="label">
          Duración total (h:mm)
          <input
            className="input"
            inputMode="numeric"
            placeholder="9:30"
            required
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </label>
      )}
      <label className="label">
        Estado inicial
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value as 'want' | 'reading')}>
          <option value="want">Quiero leer</option>
          <option value="reading">Leyendo</option>
        </select>
      </label>
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      <button className="btn btn-primary w-full" disabled={busy}>
        {busy ? 'Añadiendo…' : 'Añadir libro'}
      </button>
    </form>
  )
}
