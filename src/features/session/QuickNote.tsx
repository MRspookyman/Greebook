import { useState } from 'react'
import { Check, PenLine } from 'lucide-react'
import { toast } from '@/components/toast'
import { useMe } from '@/features/auth/me'
import { qk } from '@/lib/data'
import { queryClient } from '@/lib/queryClient'
import { supabase } from '@/lib/supabase'
import type { NoteKind } from '@/lib/types'

/** Right after saving a session: one private note or quote for the diary, page already filled in. */
export function QuickNote({ readingId, page }: { readingId: string; page: number | null }) {
  const { userId } = useMe()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<NoteKind>('note')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save() {
    if (!body.trim() || busy) return
    setBusy(true)
    try {
      const { error } = await supabase
        .from('notes')
        .insert({ reading_id: readingId, user_id: userId, kind, body: body.trim(), page })
      if (error) throw error
      await queryClient.invalidateQueries({ queryKey: qk.notes(readingId) })
      setSaved(true)
      setOpen(false)
    } catch {
      toast('No se pudo guardar la nota', 'Inténtalo de nuevo desde la ficha del libro.')
    } finally {
      setBusy(false)
    }
  }

  if (saved)
    return (
      <p className="mt-6 flex min-h-11 items-center justify-center gap-2 text-[14px] text-muted" role="status">
        <Check size={16} className="text-accent" aria-hidden />
        {kind === 'quote' ? 'Cita guardada' : 'Nota guardada'} en tu cuaderno
      </p>
    )

  if (!open)
    return (
      <button
        type="button"
        className="btn btn-link mx-auto mt-5 flex"
        onClick={() => setOpen(true)}
        aria-expanded={false}
      >
        <PenLine size={16} aria-hidden />
        Añadir una nota o una cita
      </button>
    )

  return (
    <div className="mt-6 space-y-3 rounded-[16px] bg-surface p-4 text-left shadow-[var(--paper-shadow)]">
      <div className="flex gap-2" role="group" aria-label="Tipo">
        {(['note', 'quote'] as const).map((value) => (
          <button
            key={value}
            type="button"
            className="chip"
            aria-pressed={kind === value}
            onClick={() => setKind(value)}
          >
            {value === 'note' ? 'Nota' : 'Cita'}
          </button>
        ))}
        {page !== null && <span className="ml-auto self-center text-[13px] text-muted">p. {page}</span>}
      </div>
      <label className="block">
        <span className="sr-only">{kind === 'quote' ? 'Tu cita' : 'Tu nota'}</span>
        <textarea
          className="input min-h-24 py-2.5 font-serif text-[17px] leading-relaxed"
          maxLength={5000}
          placeholder={kind === 'quote' ? 'La frase que quieres guardar…' : '¿Algo que quieras recordar de hoy?'}
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
      </label>
      <p className="text-[13px] text-muted">Solo la ves tú.</p>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-link px-2" onClick={() => setOpen(false)}>
          Cancelar
        </button>
        <button type="button" className="btn btn-outline" disabled={busy || !body.trim()} onClick={() => void save()}>
          {busy ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
