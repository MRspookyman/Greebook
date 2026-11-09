import { useId, useState, type SubmitEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { shelfKeys, useBookTags } from '@/lib/data'
import { supabase } from '@/lib/supabase'
import { useOnline } from '@/features/session/useOnline'

export function BookTags({ bookId }: { bookId: string }) {
  const query = useBookTags()
  const qc = useQueryClient()
  const online = useOnline()
  const suggestionsId = useId()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const tags = (query.data ?? []).filter((row) => row.book_id === bookId)
  const suggestions = [...new Set((query.data ?? []).map((row) => row.tag))].filter((tag) => !tags.some((row) => row.tag === tag))

  async function change(tag: string, remove: boolean) {
    if (busy || !online || !tag) return
    setBusy(true)
    setError('')
    try {
      const result = remove
        ? await supabase.from('book_tags').delete().eq('book_id', bookId).eq('tag', tag)
        : await supabase.from('book_tags').upsert({ book_id: bookId, tag }, { onConflict: 'book_id,tag', ignoreDuplicates: true })
      if (result.error) throw result.error
      await qc.invalidateQueries({ queryKey: shelfKeys.tags() })
      setValue('')
      setEditing(false)
    } catch { setError('No se pudo guardar la etiqueta. Inténtalo de nuevo.') }
    finally { setBusy(false) }
  }
  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    void change(value.trim().replace(/\s+/g, ' '), false)
  }
  return <section className="space-y-2" aria-label="Etiquetas del libro">
    <div className="flex flex-wrap gap-2">
      {tags.map(({ tag }) => <button key={tag} className="chip min-h-11 max-w-full gap-2" disabled={busy || !online} onClick={() => void change(tag, true)} aria-label={`Quitar etiqueta ${tag}`}><span className="break-words">{tag}</span><X size={14} aria-hidden /></button>)}
      {!editing && <button className="chip min-h-11" disabled={!online || busy || query.isPending || query.isError} onClick={() => setEditing(true)}>+ Etiqueta</button>}
    </div>
    {editing && <form onSubmit={submit} className="flex flex-wrap gap-2">
      <input className="input min-w-0 flex-1" aria-label="Nueva etiqueta" list={suggestionsId} value={value} maxLength={30} onChange={(event) => setValue(event.target.value)} autoFocus />
      <datalist id={suggestionsId}>{suggestions.map((tag) => <option key={tag} value={tag} />)}</datalist>
      <button className="btn btn-primary" disabled={busy || !online || !value.trim()}>Añadir</button>
      <button type="button" className="btn btn-outline" disabled={busy} onClick={() => setEditing(false)}>Cancelar</button>
    </form>}
    {!online && <p className="text-xs text-muted">Conéctate para cambiar las etiquetas.</p>}
    {query.isError && <button className="btn btn-outline" onClick={() => void query.refetch()}>Reintentar cargar etiquetas</button>}
    {error && <p className="text-sm text-danger" role="alert">{error}</p>}
  </section>
}
