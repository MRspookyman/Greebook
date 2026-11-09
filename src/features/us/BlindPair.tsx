import { useState } from 'react'
import { Stars } from '@/components/Stars'
import { toast } from '@/components/toast'
import { useMe } from '@/features/auth/me'
import { qk, useOpinions, usePartnerOpinionBooks } from '@/lib/data'
import { queryClient } from '@/lib/queryClient'
import { supabase } from '@/lib/supabase'
import type { ReadingWithBook } from '@/lib/types'
import { BlindOpinion } from './BlindOpinion'
import { BlindRating } from './BlindRating'

/**
 * A book you both finished: your mark and your sentence, each kept blind until the other one's arrives. While
 * yours are missing there is one form and one button for both.
 */
export function BlindPair({ mine, theirs }: { mine: ReadingWithBook; theirs: ReadingWithBook }) {
  const { userId, partner } = useMe()
  const opinions = useOpinions(!!partner).data ?? []
  const partnerBooks = usePartnerOpinionBooks(!!partner).data ?? []
  const [rating, setRating] = useState<number | null>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  if (!partner) return null
  const myOpinion = opinions.some((o) => o.user_id === userId && o.book_id === mine.book_id)
  const theirOpinion = opinions.some((o) => o.user_id === partner.id && o.book_id === mine.book_id) || partnerBooks.includes(mine.book_id)

  // Your mark is in: each part shows its own secret or reveal (and the sentence its own form if still missing).
  if (mine.rating !== null)
    return (
      <div className="space-y-4">
        <BlindRating mine={mine} theirs={theirs} />
        <div className="rule pt-3">
          <BlindOpinion bookId={mine.book_id} />
        </div>
      </div>
    )

  const waiting = [theirs.rating !== null ? 'su nota' : null, theirOpinion && !myOpinion ? 'su frase' : null].filter(Boolean)
  async function save() {
    if (busy || (!rating && !text.trim())) return
    setBusy(true)
    try {
      if (rating) {
        const { error } = await supabase.from('readings').update({ rating }).eq('id', mine.id).eq('user_id', userId)
        if (error) throw error
      }
      if (!myOpinion && text.trim()) {
        const { error } = await supabase
          .from('book_opinions')
          .upsert({ user_id: userId, book_id: mine.book_id, body: text.trim() }, { onConflict: 'user_id,book_id' })
        if (error) throw error
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.readings(userId) }),
        queryClient.invalidateQueries({ queryKey: qk.opinions() }),
        queryClient.invalidateQueries({ queryKey: qk.partnerOpinionBooks() }),
      ])
    } catch {
      toast('No se pudo guardar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault()
        void save()
      }}
    >
      <p className="text-sm">
        {waiting.length ? `${partner.display_name} ya ha puesto ${waiting.join(' y ')}. ` : ''}
        Pon tu nota{myOpinion ? '' : ' y una frase'} sin ver las suyas: se destapan a la vez.
      </p>
      <Stars value={rating} onChange={setRating} size={30} />
      {myOpinion ? (
        <BlindOpinion bookId={mine.book_id} />
      ) : (
        <>
          <label className="sr-only" htmlFor={`pair-opinion-${mine.book_id}`}>
            ¿Qué te ha parecido, en una frase?
          </label>
          <textarea
            id={`pair-opinion-${mine.book_id}`}
            className="input hand min-h-20 resize-none text-[21px]"
            maxLength={500}
            rows={2}
            placeholder="¿Qué te ha parecido, en una frase?"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </>
      )}
      <button className="btn btn-primary w-full" disabled={busy || (!rating && !text.trim())}>
        {busy ? 'Guardando…' : 'Guardar a ciegas'}
      </button>
    </form>
  )
}
