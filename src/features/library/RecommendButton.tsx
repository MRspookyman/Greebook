import { useState, type SubmitEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { BottomSheet } from '@/components/BottomSheet'
import { toast } from '@/components/toast'
import { useMe } from '@/features/auth/me'
import { useOnline } from '@/features/session/useOnline'
import { shelfKeys, useReadings, useRecommendations } from '@/lib/data'
import { supabase } from '@/lib/supabase'

export function RecommendButton({ bookId }: { bookId: string }) {
  const { userId, partner } = useMe()
  const readings = useReadings(partner?.id)
  const recommendations = useRecommendations()
  const qc = useQueryClient()
  const online = useOnline()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!partner || readings.isPending || recommendations.isPending || readings.isError || recommendations.isError
    || readings.data?.some((reading) => reading.book_id === bookId)
    || recommendations.data?.some((row) => row.book_id === bookId && row.to_user === partner.id && row.status === 'new')) return null

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !online || !partner) return
    setBusy(true)
    setError('')
    try {
      const { error: insertError } = await supabase.from('recommendations').insert({ from_user: userId, to_user: partner.id, book_id: bookId, message: message.trim() })
      if (insertError) throw insertError
      await qc.invalidateQueries({ queryKey: shelfKeys.recommendations() })
      setOpen(false)
      toast('Recomendación enviada')
    } catch { setError('No se pudo enviar la recomendación. Inténtalo de nuevo.') }
    finally { setBusy(false) }
  }
  return <>
    <button className="btn btn-outline w-full" disabled={!online} onClick={() => setOpen(true)}>Recomiéndaselo a {partner.display_name}</button>
    <BottomSheet open={open} onClose={() => { if (!busy) setOpen(false) }} title={`Recomendar a ${partner.display_name}`}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block space-y-2"><span className="lbl">Un mensaje (opcional)</span><input className="input" value={message} maxLength={280} onChange={(event) => setMessage(event.target.value)} placeholder="Creo que te va a gustar…" /></label>
        <p className="text-right text-xs text-muted">{message.length}/280</p>
        {error && <p className="text-sm text-danger" role="alert">{error}</p>}
        <button className="btn btn-primary w-full" disabled={busy || !online}>{busy ? 'Enviando…' : 'Enviar recomendación'}</button>
      </form>
    </BottomSheet>
  </>
}
