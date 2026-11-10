import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { BottomSheet } from '@/components/BottomSheet'
import { Cover } from '@/components/Cover'
import { FilterChips } from '@/components/FilterChips'
import { useMe } from '@/features/auth/me'
import { useOnline } from '@/features/session/useOnline'
import { qk, useRecommendations } from '@/lib/data'
import { todayISO } from '@/lib/dates'
import { supabase } from '@/lib/supabase'
import type { ReadingWithBook } from '@/lib/types'
import { pickerCandidates, pickReading, type PickerFilters } from './pickerModel'

export function ReadingPicker({ readings }: { readings: ReadingWithBook[] }) {
  const { userId, partner } = useMe()
  const recommendations = useRecommendations()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const online = useOnline()
  const [open, setOpen] = useState(false)
  const [filters, setFilters] = useState<PickerFilters>({ length: 'all', format: 'all', origin: 'mine' })
  const [picked, setPicked] = useState<ReadingWithBook | null>(null)
  const [flipping, setFlipping] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => { window.clearTimeout(timer.current) }, [])
  const recommended = new Set((recommendations.data ?? []).filter((row) => row.to_user === userId && row.status !== 'dismissed').map((row) => row.book_id))
  const candidates = pickerCandidates(readings, userId, partner?.id, recommended, filters)
  function filter<K extends keyof PickerFilters>(key: K, value: PickerFilters[K]) {
    window.clearTimeout(timer.current)
    setFlipping(false)
    setFilters((previous) => ({ ...previous, [key]: value }))
    setPicked(null)
    setError('')
  }
  function draw() {
    if (flipping) return
    setError('')
    const next = pickReading(candidates, picked?.id)
    setFlipping(true)
    timer.current = window.setTimeout(() => { setPicked(next); setFlipping(false) }, 180)
  }
  async function start() {
    if (!picked || busy || !online) return
    setBusy(true)
    setError('')
    try {
      const { data, error: updateError } = await supabase.from('readings').update({ status: 'reading', started_on: todayISO() }).eq('id', picked.id).eq('user_id', userId).eq('status', 'want').select('id').single()
      if (updateError) throw updateError
      await qc.invalidateQueries({ queryKey: qk.readings(userId) })
      navigate(`/libro/${data.id}`)
    } catch { setError('No se pudo empezar la lectura. Inténtalo de nuevo.') }
    finally { setBusy(false) }
  }
  return <>
    <button className="btn btn-outline w-full" onClick={() => setOpen(true)}>¿Qué leo ahora?</button>
    <BottomSheet open={open} onClose={() => { if (!busy) setOpen(false) }} title="¿Qué leo ahora?">
      <div className="space-y-5">
        <div className="space-y-2"><p className="lbl">Extensión</p><FilterChips<PickerFilters['length']> options={[{ value: 'all', label: 'Cualquiera' }, { value: 'short', label: 'Corto · <250 p.' }, { value: 'medium', label: 'Medio · 250–450 p.' }, { value: 'long', label: 'Largo · >450 p.' }]} value={filters.length} onChange={(value) => filter('length', value)} aria-label="Extensión" /></div>
        <div className="space-y-2"><p className="lbl">Formato</p><FilterChips<PickerFilters['format']> options={[{ value: 'all', label: 'Cualquiera' }, { value: 'paper', label: 'Papel' }, { value: 'ebook', label: 'Kindle' }]} value={filters.format} onChange={(value) => filter('format', value)} aria-label="Formato" /></div>
        <div className="space-y-2"><p className="lbl">Origen</p><FilterChips<PickerFilters['origin']> options={[{ value: 'mine', label: 'Mis pendientes' }, { value: 'recommended', label: 'Recomendados' }, ...(partner ? [{ value: 'both' as const, label: 'De los dos' }] : [])]} value={filters.origin} onChange={(value) => filter('origin', value)} aria-label="Origen" /><p className="text-xs text-muted">Recomendados: libros que ya has añadido a tus pendientes.</p></div>
        <p className="text-sm text-muted">{candidates.length ? `${candidates.length} ${candidates.length === 1 ? 'libro' : 'libros'} entre tus pendientes` : 'No hay pendientes con estos filtros.'}</p>
        <button className="btn btn-primary w-full" disabled={!candidates.length || flipping || busy || (filters.origin === 'recommended' && !recommendations.isSuccess)} onClick={draw}>{picked ? 'Otro' : 'Sortear'}</button>
        <div aria-live="polite" className="transition-transform duration-150 motion-reduce:transition-none" style={{ transform: flipping ? 'perspective(500px) rotateY(90deg)' : 'perspective(500px) rotateY(0deg)' }}>
          {picked && <article className="space-y-4 rounded-card bg-sunk p-4"><div className="flex gap-4"><Cover book={picked.book} width={72} /><div className="min-w-0"><h2 className="title break-words">{picked.book.title}</h2><p className="mt-2 text-sm text-muted">{picked.book.authors.join(', ')}</p></div></div><button className="btn btn-primary w-full" disabled={!online || busy || flipping} onClick={() => void start()}>{busy ? 'Empezando…' : 'Empezar'}</button></article>}
        </div>
        {!online && <p className="text-sm text-muted">Conéctate para empezar una lectura.</p>}
        {recommendations.isError && filters.origin === 'recommended' && <button className="btn btn-outline" onClick={() => void recommendations.refetch()}>Reintentar cargar recomendaciones</button>}
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      </div>
    </BottomSheet>
  </>
}
