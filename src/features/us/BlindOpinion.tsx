import { useState } from 'react'
import { Avatar } from '@/components/Avatar'
import { toast } from '@/components/toast'
import { useMe } from '@/features/auth/me'
import { qk, useOpinions, usePartnerOpinionBooks } from '@/lib/data'
import { queryClient } from '@/lib/queryClient'
import { supabase } from '@/lib/supabase'

const MAX = 500

/**
 * A sentence each about a book you both finished. Your partner's can't be read (not even through the API) until
 * yours is written; then both appear together.
 */
export function BlindOpinion({ bookId }: { bookId: string }) {
  const { userId, profile, partner } = useMe()
  const opinions = useOpinions(!!partner).data ?? []
  const partnerBooks = usePartnerOpinionBooks(!!partner).data ?? []
  const mine = opinions.find((opinion) => opinion.user_id === userId && opinion.book_id === bookId)
  const theirs = opinions.find((opinion) => opinion.user_id === partner?.id && opinion.book_id === bookId)
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  if (!partner) return null
  const partnerWrote = !!theirs || partnerBooks.includes(bookId)

  async function save() {
    const body = draft.trim()
    if (!body || busy) return
    setBusy(true)
    try {
      const { error } = await supabase
        .from('book_opinions')
        .upsert({ user_id: userId, book_id: bookId, body }, { onConflict: 'user_id,book_id' })
      if (error) throw error
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.opinions() }),
        queryClient.invalidateQueries({ queryKey: qk.partnerOpinionBooks() }),
      ])
      setEditing(false)
      if (!partnerWrote) toast('Guardada en secreto', `Se destapará cuando ${partner?.display_name} escriba la suya.`)
    } catch {
      toast('No se pudo guardar tu opinión')
    } finally {
      setBusy(false)
    }
  }

  if (mine && theirs && !editing)
    return (
      <div className="space-y-2.5" style={{ animation: 'gb-fade-up 360ms var(--ease) both' }}>
        {[
          { person: partner, opinion: theirs, label: partner.display_name },
          { person: profile, opinion: mine, label: 'Tú' },
        ].map(({ person, opinion, label }) => (
          <figure key={label} className="flex items-start gap-2.5 rounded-[18px] bg-sunk px-3.5 py-3">
            <Avatar person={person} size={28} />
            <div className="min-w-0 flex-1">
              <figcaption className="text-xs font-extrabold" style={{ color: `var(--${person.accent})` }}>
                {label}
              </figcaption>
              <blockquote className="hand wrap-anywhere text-[22px]" style={{ color: `var(--${person.accent})` }}>
                {opinion.body}
              </blockquote>
            </div>
          </figure>
        ))}
      </div>
    )

  if (mine && !editing)
    return (
      <div className="space-y-1.5 text-sm text-muted">
        <p>
          Tu opinión está guardada en secreto. Cuando {partner.display_name} escriba la suya, se destapan las dos a la
          vez.
        </p>
        <button
          type="button"
          className="btn btn-link px-0 text-sm"
          onClick={() => {
            setDraft(mine.body)
            setEditing(true)
          }}
        >
          Cambiar la mía
        </button>
      </div>
    )

  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault()
        void save()
      }}
    >
      <label className="block text-sm" htmlFor={`opinion-${bookId}`}>
        {partnerWrote && !mine ? `${partner.display_name} ya ha escrito la suya. ` : ''}¿Qué te ha parecido, en una
        frase? Se destapan las dos a la vez.
      </label>
      <textarea
        id={`opinion-${bookId}`}
        className="input hand min-h-20 resize-none text-[21px]"
        maxLength={MAX}
        rows={2}
        placeholder="Me ha dejado pensando en…"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <div className="flex items-center gap-2">
        <button className="btn btn-primary flex-1" disabled={busy || !draft.trim()}>
          {busy ? 'Guardando…' : mine ? 'Guardar cambios' : 'Guardar a ciegas'}
        </button>
        {editing && (
          <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
