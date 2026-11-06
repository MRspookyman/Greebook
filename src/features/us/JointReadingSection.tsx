import { useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { useMe } from '@/features/auth/me'
import { qk, useReadings } from '@/lib/data'
import { supabase } from '@/lib/supabase'
import type { Note, ReadingWithBook } from '@/lib/types'
import { isSpoiler } from '@/lib/spoilers'
import { progressFraction } from '@/lib/units'
import { DualProgressBar } from '@/components/DualProgressBar'
import { EmptyState } from '@/components/EmptyState'
import { jointDistance } from './jointDistance'

function SharedNote({ note, spoiler }: { note: Note; spoiler: boolean }) {
  const [revealed, setRevealed] = useState(false)
  const hidden = spoiler && !revealed
  return (
    <article className="card relative overflow-hidden space-y-2">
      <div className={hidden ? 'blur-sm select-none pointer-events-none' : ''} aria-hidden={hidden || undefined}>
        <p className="text-sm text-muted">
          {note.kind === 'quote' ? 'Cita' : 'Nota'}
          {note.page != null ? ` · p. ${note.page}` : ''}
        </p>
        <p className={`whitespace-pre-wrap break-words ${note.kind === 'quote' ? 'font-serif' : ''}`}>
          {hidden ? 'Esta nota está oculta para evitar spoilers.' : note.body}
        </p>
      </div>
      {hidden && (
        <button
          type="button"
          className="absolute inset-0 min-h-11 w-full bg-surface/80 text-sm font-medium text-ink"
          onClick={() => setRevealed(true)}
        >
          Toca para ver (p. {note.page})
        </button>
      )}
    </article>
  )
}

export function JointReadingSection({ reading }: { reading: ReadingWithBook }) {
  const { userId, profile, partner } = useMe()
  const mine = useReadings(userId)
  const theirs = useReadings(partner?.id)
  const myBooks = (mine.data ?? []).filter((r) => r.book_id === reading.book_id)
  const partnerBooks = (theirs.data ?? []).filter((r) => r.book_id === reading.book_id)
  const myReading = reading.user_id === userId ? reading : (myBooks.find((r) => r.status === 'reading') ?? myBooks[0])
  const partnerReading =
    reading.user_id === partner?.id && reading.status === 'reading'
      ? reading
      : partnerBooks.find((r) => r.status === 'reading')
  const joint = myReading?.status === 'reading' && partnerReading?.status === 'reading'
  // Each partner reading keeps the canonical notes key, including re-readings.
  const noteQueries = useQueries({
    queries: partnerBooks.map((r) => ({
      queryKey: qk.notes(r.id),
      // Partner notes have no realtime feed; refetch whenever the section mounts.
      staleTime: 0,
      queryFn: async () => {
        const { data, error } = await supabase
          .from('notes')
          .select('*')
          .eq('reading_id', r.id)
          .eq('user_id', partner!.id)
          .eq('shared', true)
          .order('created_at', { ascending: false })
        if (error) throw error
        return data as Note[]
      },
    })),
  })
  const notes = noteQueries
    .flatMap((q) => q.data ?? [])
    .filter((n) => n.shared && n.user_id === partner?.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
  const pending = noteQueries.some((query) => query.isPending)
  const failed = noteQueries.some((query) => query.isError)
  if (!partner || (!joint && !notes.length && !pending && !failed)) {
    return <EmptyState title="Aún no hay una lectura conjunta ni notas compartidas" />
  }
  return (
    <section className="space-y-3">
      {joint && (
        <div className="card space-y-2">
          <h2 className="text-sm font-semibold">Lectura conjunta</h2>
          <DualProgressBar
            a={{ value: progressFraction(myReading), accent: profile.accent, label: profile.display_name }}
            b={{ value: progressFraction(partnerReading), accent: partner.accent, label: partner.display_name }}
          />
          <p className="text-xs text-muted">{jointDistance(myReading, partnerReading, partner.display_name)}</p>
        </div>
      )}
      {(notes.length > 0 || pending || failed) && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Notas de {partner.display_name}</h2>
          {noteQueries.some((q) => q.isPending) && (
            <p className="text-muted" role="status">
              Cargando notas…
            </p>
          )}
          {noteQueries.some((q) => q.isError) && (
            <p className="text-muted">No se pudieron cargar las notas compartidas.</p>
          )}
          {notes.map((note) => (
            <SharedNote key={note.id} note={note} spoiler={!!myReading && isSpoiler(note, myReading, reading.book)} />
          ))}
        </div>
      )}
    </section>
  )
}
