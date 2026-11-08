import { useState } from 'react'
import { Avatar } from '@/components/Avatar'
import { Stars } from '@/components/Stars'
import { toast } from '@/components/toast'
import { useMe } from '@/features/auth/me'
import { qk } from '@/lib/data'
import { queryClient } from '@/lib/queryClient'
import { supabase } from '@/lib/supabase'
import type { ReadingWithBook } from '@/lib/types'

/**
 * Both of you finished the same book: each one rates it without seeing the other's mark, and both are revealed
 * together once the two exist.
 */
export function BlindRating({ mine, theirs }: { mine: ReadingWithBook; theirs: ReadingWithBook }) {
  const { userId, profile, partner } = useMe()
  const [draft, setDraft] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  if (!partner) return null
  const fmt = (n: number) => n.toLocaleString('es')

  if (mine.rating !== null && theirs.rating !== null) {
    const diff = Math.abs(mine.rating - theirs.rating)
    const verdict =
      diff === 0
        ? 'El mismo número: os ha gustado igual.'
        : diff <= 0.5
          ? 'Casi de acuerdo: medio punto de diferencia.'
          : 'No pensáis igual: tenéis de qué hablar.'
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {[
            { person: partner, value: theirs.rating, label: partner.display_name },
            { person: profile, value: mine.rating, label: 'Tú' },
          ].map(({ person, value, label }) => (
            <div key={label} className="grid justify-items-center gap-1 rounded-[20px] bg-sunk px-3 py-4 text-center">
              <Avatar person={person} size={36} />
              <span className="font-extrabold">{label}</span>
              <span className="font-serif text-[38px] leading-none">{fmt(value)}</span>
              <span className="text-xs text-muted">de 5</span>
            </div>
          ))}
        </div>
        <p className="text-center font-extrabold">{verdict}</p>
      </div>
    )
  }
  if (mine.rating !== null)
    return (
      <p className="text-sm text-muted">
        Tu nota está guardada en secreto. Cuando {partner.display_name} ponga la suya, se destapan las dos a la vez.
      </p>
    )
  return (
    <div className="space-y-3">
      <p className="text-sm">
        {theirs.rating !== null ? `${partner.display_name} ya ha puesto su nota. ` : ''}Pon la tuya sin verla: se
        destapan a la vez.
      </p>
      <Stars value={draft} onChange={setDraft} size={30} />
      <button
        type="button"
        className="btn btn-primary w-full"
        disabled={!draft || busy}
        onClick={() => {
          if (!draft) return
          setBusy(true)
          void Promise.resolve(
            supabase.from('readings').update({ rating: draft }).eq('id', mine.id).eq('user_id', userId),
          )
            .then(({ error }) => {
              if (error) throw error
              return queryClient.invalidateQueries({ queryKey: qk.readings(userId) })
            })
            .catch(() => toast('No se pudo guardar la nota'))
            .finally(() => setBusy(false))
        }}
      >
        Destapar a la vez
      </button>
    </div>
  )
}
