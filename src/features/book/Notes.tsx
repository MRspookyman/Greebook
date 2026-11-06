import { useState } from 'react'
import { useMe } from '@/features/auth/me'
import { qk, useNotes } from '@/lib/data'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'
import type { Note, NoteKind } from '@/lib/types'
import { toast } from '@/components/toast'
import { useOnline } from '@/features/session/useOnline'

export function Notes({ readingId }: { readingId: string }) {
  const { userId, partner } = useMe()
  const query = useNotes(readingId)
  const online = useOnline()
  const [kind, setKind] = useState<NoteKind>('note')
  const [editing, setEditing] = useState<string | null>(null)
  const [body, setBody] = useState('')
  const [page, setPage] = useState('')
  const [shared, setShared] = useState(false)
  const [busy, setBusy] = useState(false)
  function reset() {
    setEditing(null)
    setBody('')
    setPage('')
    setShared(false)
  }
  async function save() {
    if (!online || busy || !body.trim()) return
    setBusy(true)
    const patch = { body: body.trim(), page: page ? Number(page) : null, shared, kind }
    try {
      const result = editing
        ? await supabase.from('notes').update(patch).eq('id', editing).eq('user_id', userId)
        : await supabase.from('notes').insert({ ...patch, reading_id: readingId, user_id: userId })
      if (result.error) throw result.error
      reset()
      await queryClient.invalidateQueries({ queryKey: qk.notes(readingId) })
    } catch {
      toast('No se pudo guardar la nota')
    } finally {
      setBusy(false)
    }
  }
  async function remove(note: Note) {
    if (!online || busy || !window.confirm('¿Borrar esta nota?')) return
    setBusy(true)
    try {
      const { error } = await supabase.from('notes').delete().eq('id', note.id).eq('user_id', userId)
      if (error) throw error
      if (editing === note.id) reset()
      await queryClient.invalidateQueries({ queryKey: qk.notes(readingId) })
    } catch {
      toast('No se pudo borrar la nota')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="space-y-4">
      <h2>Notas y citas</h2>
      <div className="flex gap-2" role="tablist">
        {(['note', 'quote'] as const).map((value) => (
          <button
            key={value}
            role="tab"
            aria-selected={kind === value}
            className={`btn ${kind === value ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setKind(value)
              reset()
            }}
          >
            {value === 'note' ? 'Notas' : 'Citas'}
          </button>
        ))}
      </div>
      {query.isPending && <p className="text-muted">Cargando notas…</p>}
      {query.isError && <p className="text-danger">No se pudieron cargar las notas.</p>}
      {query.data
        ?.filter((n) => n.kind === kind && n.user_id === userId)
        .map((note) => (
          <article key={note.id} className="card space-y-2">
            <p className={`whitespace-pre-wrap break-words ${kind === 'quote' ? 'font-serif text-lg' : ''}`}>
              {note.body}
            </p>
            <p className="text-muted text-sm">
              {note.page !== null ? `p. ${note.page} · ` : ''}
              {note.shared ? 'Compartida' : 'Privada'}
            </p>
            <div className="flex gap-2">
              <button
                className="btn btn-ghost"
                disabled={!online || busy}
                onClick={() => {
                  setEditing(note.id)
                  setBody(note.body)
                  setPage(note.page === null ? '' : String(note.page))
                  setShared(note.shared)
                }}
              >
                Editar
              </button>
              <button
                className="btn btn-ghost text-danger"
                disabled={!online || busy}
                onClick={() => void remove(note)}
              >
                Borrar
              </button>
            </div>
          </article>
        ))}
      <form
        className="card space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <label className="label">
          {editing ? 'Editar' : 'Añadir'} {kind === 'note' ? 'nota' : 'cita'}
          <textarea
            className="input mt-2 min-h-28"
            required
            maxLength={5000}
            value={body}
            disabled={!online || busy}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>
        <label className="label">
          Página (opcional)
          <input
            className="input mt-2"
            type="number"
            min="0"
            step="1"
            value={page}
            disabled={!online || busy}
            onChange={(e) => setPage(e.target.value)}
          />
        </label>
        <label className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            checked={shared}
            disabled={!online || busy}
            onChange={(e) => setShared(e.target.checked)}
          />
          Compartir con {partner?.display_name ?? 'tu pareja'}
        </label>
        <button className="btn btn-primary" disabled={!online || busy || !body.trim()}>
          {!online ? 'Sin conexión' : busy ? 'Guardando…' : 'Guardar'}
        </button>
        {editing && (
          <button type="button" className="btn btn-ghost" onClick={reset}>
            Cancelar
          </button>
        )}
      </form>
    </section>
  )
}
