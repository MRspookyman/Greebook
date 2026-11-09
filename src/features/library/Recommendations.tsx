import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Cover } from '@/components/Cover'
import { useMe } from '@/features/auth/me'
import { useOnline } from '@/features/session/useOnline'
import { shelfKeys, useRecommendations, type Recommendation } from '@/lib/data'
import { supabase } from '@/lib/supabase'
import { AddReadingSheet } from './AddReadingSheet'

export function Recommendations() {
  const { userId, partner } = useMe()
  const query = useRecommendations()
  const qc = useQueryClient()
  const online = useOnline()
  const [selected, setSelected] = useState<Recommendation | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const incoming = (query.data ?? []).filter((row) => row.to_user === userId && row.status === 'new')
  async function update(id: string, status: 'added' | 'dismissed') {
    const { error: updateError } = await supabase.from('recommendations').update({ status }).eq('id', id).eq('to_user', userId)
    if (updateError) throw updateError
    await qc.invalidateQueries({ queryKey: shelfKeys.recommendations() })
  }
  async function dismiss(id: string) {
    setBusy(true)
    setError('')
    try { await update(id, 'dismissed') }
    catch { setError('No se pudo descartar la recomendación. Inténtalo de nuevo.') }
    finally { setBusy(false) }
  }
  if (query.isError) return <button className="btn btn-outline" onClick={() => void query.refetch()}>Reintentar cargar recomendaciones</button>
  return <>
    {incoming.length > 0 && <section className="space-y-3" aria-label="Recomendaciones para ti">
      {incoming.map((row) => <article key={row.id} className="rounded-card border border-rule bg-surface p-4 space-y-3">
        <p className="lbl">{partner?.display_name ?? 'Tu pareja'} te lo recomienda</p>
        <div className="flex gap-3"><Cover book={row.book} width={48} /><div className="min-w-0"><h2 className="font-serif break-words">{row.book.title}</h2>{row.message && <p className="mt-2 text-sm break-words">{row.message}</p>}</div></div>
        <div className="flex flex-wrap gap-2"><button className="btn btn-primary" disabled={!online || busy} onClick={() => setSelected(row)}>Añadir a pendientes</button><button className="btn btn-outline" disabled={!online || busy} onClick={() => void dismiss(row.id)}>Ahora no</button></div>
      </article>)}
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
    </section>}
    <AddReadingSheet candidate={selected?.book ?? null} existingBook={selected?.book} pendingOnly onClose={() => setSelected(null)} onAdded={async () => { if (selected) await update(selected.id, 'added') }} />
  </>
}
