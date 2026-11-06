import { useState } from 'react'
import { MoreHorizontal, Plus } from 'lucide-react'
import { useMe } from '@/features/auth/me'
import { qk, useNotes } from '@/lib/data'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'
import type { Note, NoteKind } from '@/lib/types'
import { BottomSheet } from '@/components/BottomSheet'
import { Segmented } from '@/components/Segmented'
import { toast } from '@/components/toast'
import { TraceSheet } from '@/features/us/TraceSheet'
import { useOnline } from '@/features/session/useOnline'

export function Notes({ readingId }: { readingId: string }) {
  const { userId, partner } = useMe()
  const query = useNotes(readingId)
  const online = useOnline()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<NoteKind>('note')
  const [editing, setEditing] = useState<Note | null>(null)
  const [body, setBody] = useState('')
  const [page, setPage] = useState('')
  const [traceOpen, setTraceOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const notes = query.data?.filter((note) => note.user_id === userId) ?? []
  function create() {
    setEditing(null)
    setKind('note')
    setBody('')
    setPage('')
    setOpen(true)
  }
  function edit(note: Note) {
    setEditing(note)
    setKind(note.kind)
    setBody(note.body)
    setPage(note.page === null ? '' : String(note.page))
    setOpen(true)
  }
  async function save() {
    if (!online || busy || !body.trim()) return
    if (page !== '' && (!/^\d+$/.test(page) || !Number.isSafeInteger(Number(page)))) {
      toast('La página debe ser un número entero positivo')
      return
    }
    setBusy(true)
    const values = { body: body.trim(), page: page ? Number(page) : null, kind }
    try {
      const result = editing
        ? await supabase.from('notes').update(values).eq('id', editing.id).eq('user_id', userId)
        : await supabase.from('notes').insert({ ...values, reading_id: readingId, user_id: userId })
      if (result.error) throw result.error
      await queryClient.invalidateQueries({ queryKey: qk.notes(readingId) })
      setOpen(false)
    } catch {
      toast('No se pudo guardar la nota')
    } finally {
      setBusy(false)
    }
  }
  async function remove() {
    if (!editing || !online || busy || !window.confirm('¿Borrar esta nota?')) return
    setBusy(true)
    try {
      const { error } = await supabase.from('notes').delete().eq('id', editing.id).eq('user_id', userId)
      if (error) throw error
      await queryClient.invalidateQueries({ queryKey: qk.notes(readingId) })
      setOpen(false)
    } catch {
      toast('No se pudo borrar la nota')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="space-y-2">
      {query.isPending && <p className="py-3 text-sm text-muted">Cargando notas…</p>}
      {query.isError && <p className="py-3 text-sm text-danger">No se pudieron cargar las notas.</p>}
      {!query.isPending && !query.isError && notes.length === 0 && (
        <p className="py-3 text-sm text-muted">Guarda una idea o una cita para recordar.</p>
      )}
      {notes.map((note) => (
        <article key={note.id} className="card flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p
              className={`whitespace-pre-wrap break-words ${note.kind === 'quote' ? 'font-serif text-base' : 'text-sm'}`}
            >
              {note.kind === 'quote' ? `«${note.body}»` : note.body}
            </p>
            <p className="mt-1.5 text-[11px] text-muted">
              {note.kind === 'quote' ? 'Cita' : 'Nota'}
              {note.page !== null ? ` · p. ${note.page}` : ''}
              {' · Privada'}
            </p>
          </div>
          <button
            className="icon-btn"
            aria-label="Editar nota o cita"
            disabled={!online || busy}
            onClick={() => edit(note)}
          >
            <MoreHorizontal size={18} />
          </button>
        </article>
      ))}
      <button className="btn btn-soft w-full" disabled={!online || busy} onClick={create}>
        <Plus size={17} /> {online ? 'Añadir nota/cita' : 'Sin conexión'}
      </button>
      <button className="min-h-11 text-left text-xs text-muted" onClick={() => setTraceOpen(true)}>
        Para compartir una frase, déjasela a {partner?.display_name ?? 'tu pareja'}
      </button>
      <TraceSheet open={traceOpen} onClose={() => setTraceOpen(false)} />
      <BottomSheet open={open} onClose={() => setOpen(false)} title={editing ? 'Editar nota/cita' : 'Añadir nota/cita'}>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            void save()
          }}
        >
          <fieldset disabled={!online || busy} className="space-y-4">
            <Segmented
              aria-label="Tipo de anotación"
              options={[
                { value: 'note', label: 'Nota' },
                { value: 'quote', label: 'Cita' },
              ]}
              value={kind}
              onChange={setKind}
            />
            <label className="label">
              {kind === 'note' ? 'Tu nota' : 'Tu cita'}
              <textarea
                className="input mt-2 min-h-28"
                required
                maxLength={5000}
                value={body}
                onChange={(event) => setBody(event.target.value)}
              />
            </label>
            <label className="label">
              Página (opcional)
              <input
                className="input mt-2"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={page}
                onChange={(event) => setPage(event.target.value)}
              />
            </label>
            <button className="btn btn-primary w-full" disabled={!body.trim()}>
              {!online ? 'Sin conexión' : busy ? 'Guardando…' : 'Guardar'}
            </button>
            {editing && (
              <button type="button" className="btn btn-danger w-full" onClick={() => void remove()}>
                Borrar nota/cita
              </button>
            )}
          </fieldset>
        </form>
      </BottomSheet>
    </section>
  )
}
