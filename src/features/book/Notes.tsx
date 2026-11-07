import { useRef, useState } from 'react'
import { MoreHorizontal, Plus } from 'lucide-react'
import { useMe } from '@/features/auth/me'
import { qk, useNotes, useReadings } from '@/lib/data'
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
  const readings = useReadings(userId)
  const reading = readings.data?.find((item) => item.id === readingId)
  const online = useOnline()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<NoteKind>('note')
  const [editing, setEditing] = useState<Note | null>(null)
  const [body, setBody] = useState('')
  const [page, setPage] = useState('')
  const [traceOpen, setTraceOpen] = useState(false)
  const [traceNote, setTraceNote] = useState<Note | null>(null)
  const [error, setError] = useState<{ field: 'body' | 'page'; message: string } | null>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const pageRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const notes = query.data?.filter((note) => note.user_id === userId) ?? []
  function create() {
    setEditing(null)
    setKind('note')
    setBody('')
    setPage('')
    setError(null)
    setOpen(true)
  }
  function edit(note: Note) {
    setEditing(note)
    setKind(note.kind)
    setBody(note.body)
    setPage(note.page === null ? '' : String(note.page))
    setError(null)
    setOpen(true)
  }
  async function save() {
    if (!online || busy) return
    if (!body.trim()) {
      setError({ field: 'body', message: `Escribe ${kind === 'note' ? 'una nota' : 'una cita'} antes de guardar` })
      bodyRef.current?.focus()
      return
    }
    if (
      page !== '' &&
      (!/^\d+$/.test(page) ||
        !Number.isSafeInteger(Number(page)) ||
        (reading?.unit === 'pages' && Number(page) > reading.total_units))
    ) {
      setError({
        field: 'page',
        message:
          reading?.unit === 'pages'
            ? `Escribe una página entre 0 y ${reading.total_units}`
            : 'Escribe un número de página entero, a partir de 0',
      })
      pageRef.current?.focus()
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
    <section className="space-y-4">
      {query.isPending && (
        <p role="status" className="py-3 text-sm text-muted">
          Cargando notas…
        </p>
      )}
      {query.isError && (
        <p role="alert" className="py-3 text-sm text-danger">
          No se pudieron cargar las notas. Vuelve a abrirlas cuando tengas conexión.
        </p>
      )}
      {!query.isPending && !query.isError && notes.length === 0 && (
        <p className="py-3 text-sm text-muted">Guarda una idea o una cita para recordar.</p>
      )}
      {notes.map((note) => (
        <article key={note.id} className="flex items-start gap-3 border-b border-rule py-4">
          <div className="min-w-0 flex-1">
            <p
              className={`whitespace-pre-wrap break-words ${note.kind === 'quote' ? 'font-serif text-[22px] italic leading-relaxed' : 'text-base leading-relaxed'}`}
            >
              {note.kind === 'quote' ? `«${note.body}»` : note.body}
            </p>
            <p className="mt-1.5 text-xs text-muted">
              {note.kind === 'quote' ? 'Cita' : 'Nota'}
              {note.page !== null ? ` · p. ${note.page}` : ''}
              {' · Privada'}
            </p>
            <button
              type="button"
              className="mt-1 min-h-11 text-left text-xs font-medium text-accent"
              disabled={!online || !partner || !reading}
              onClick={() => {
                setTraceNote(note)
                setTraceOpen(true)
              }}
            >
              Déjasela a {partner?.display_name ?? 'tu pareja'}
            </button>
          </div>
          <button
            className="icon-btn"
            aria-label="Editar nota o cita"
            disabled={!online || busy}
            onClick={() => edit(note)}
          >
            <MoreHorizontal size={18} aria-hidden />
          </button>
        </article>
      ))}
      <button className="btn btn-outline w-full" disabled={!online || busy} onClick={create}>
        <Plus size={17} aria-hidden /> {online ? 'Añadir nota/cita' : 'Sin conexión'}
      </button>
      <button
        className="min-h-11 text-left text-xs text-muted"
        disabled={!online || !partner || !reading}
        onClick={() => {
          setTraceNote(null)
          setTraceOpen(true)
        }}
      >
        Para compartir una frase, déjasela a {partner?.display_name ?? 'tu pareja'}
      </button>
      <TraceSheet
        open={traceOpen}
        onClose={() => setTraceOpen(false)}
        reading={reading}
        prefill={traceNote ? { body: traceNote.body, page: traceNote.page } : undefined}
      />
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Editar nota/cita' : 'Añadir nota/cita'}
        dirty={
          body !== (editing?.body ?? '') ||
          page !== (editing?.page === null || !editing ? '' : String(editing.page)) ||
          kind !== (editing?.kind ?? 'note')
        }
      >
        <form
          className="space-y-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            void save()
          }}
        >
          <fieldset disabled={!online || busy} className="space-y-4">
            <Segmented
              variant="underline"
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
                ref={bodyRef}
                name="note-body"
                autoComplete="off"
                aria-invalid={error?.field === 'body'}
                aria-describedby={error?.field === 'body' ? 'note-body-error' : undefined}
                required
                maxLength={5000}
                value={body}
                onChange={(event) => setBody(event.target.value)}
              />
            </label>
            {error?.field === 'body' && (
              <p id="note-body-error" role="alert" className="text-sm text-danger">
                {error.message}
              </p>
            )}
            <label className="label">
              Página (opcional)
              <input
                className="input mt-2"
                ref={pageRef}
                name="note-page"
                autoComplete="off"
                aria-invalid={error?.field === 'page'}
                aria-describedby={error?.field === 'page' ? 'note-page-error' : undefined}
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={page}
                onChange={(event) => setPage(event.target.value)}
              />
            </label>
            {error?.field === 'page' && (
              <p id="note-page-error" role="alert" className="text-sm text-danger">
                {error.message}
              </p>
            )}
            <button className="btn btn-primary w-full" disabled={busy} aria-busy={busy}>
              {!online ? 'Sin conexión' : busy ? 'Guardando…' : kind === 'note' ? 'Guardar nota' : 'Guardar cita'}
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
